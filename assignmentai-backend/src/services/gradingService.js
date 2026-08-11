/**
 * gradingService.js
 *
 * Core AI grading logic extracted from gradingWorker.js so it can be called:
 *   1. By the BullMQ worker when Redis is available.
 *   2. Directly (fire-and-forget) when Redis is NOT available.
 *
 * The `onProgress` callback is optional — the BullMQ worker passes
 * `job.updateProgress`; the direct path passes a no-op.
 */

const fetch        = require('node-fetch');
const { PDFParse } = require('pdf-parse');
const { createWorker: createTesseractWorker } = require('tesseract.js');
const supabaseAdmin  = require('../config/supabaseAdmin');
const socketManager  = require('../sockets/socketManager');

const GROK_API_URL   = 'https://api.x.ai/v1/chat/completions';
const MIN_TEXT_LENGTH = 50;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'];

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function downloadBuffer(bucket, path) {
  if (path.startsWith('http')) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error) throw new Error(`Supabase storage download failed for ${path}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

function getExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
}

async function runOCR(buffer) {
  console.log('[GradingService] Running Tesseract OCR...');
  const tesseract = await createTesseractWorker('eng');
  try {
    const { data } = await tesseract.recognize(buffer);
    return (data.text || '').trim();
  } finally {
    await tesseract.terminate();
  }
}

async function extractText(buffer, filename) {
  const ext = getExtension(filename);

  if (ext === '.txt') return buffer.toString('utf-8').trim();

  if (IMAGE_EXTENSIONS.includes(ext)) {
    console.log(`[GradingService] Image file detected (${ext}) — running OCR directly.`);
    return runOCR(buffer);
  }

  let text = '';
  try {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    text = (parsed.text || '').trim();
  } catch (err) {
    console.warn('[GradingService] pdf-parse failed, will try OCR:', err.message);
  }

  if (text.length >= MIN_TEXT_LENGTH) return text;

  console.log('[GradingService] PDF text too short — running Tesseract OCR...');
  return runOCR(buffer);
}

function buildPrompt({ basePrompt, questionText, answerKeyText, submissionText, maxMarks, aiStrictness }) {
  const strictnessLabel = aiStrictness >= 75 ? 'strict' : aiStrictness >= 40 ? 'balanced' : 'lenient';
  let prompt = basePrompt
    .replace('{{strictnessLabel}}', strictnessLabel)
    .replace('{{questionText}}',   questionText)
    .replace('{{answerKeyText}}',  answerKeyText)
    .replace('{{submissionText}}', submissionText);
  prompt = prompt.split('{{maxMarks}}').join(maxMarks);
  return prompt;
}

async function callGrok(prompt, model, temperature) {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error('GROK_API_KEY is not set in environment variables');

  const res = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:       model || 'grok-3',
      messages:    [{ role: 'user', content: prompt }],
      temperature: temperature !== undefined ? Number(temperature) : 0.2,
      max_tokens:  3000,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Grok API error ${res.status}: ${errBody}`);
  }

  const json       = await res.json();
  const rawContent = json.choices?.[0]?.message?.content || '';
  const cleaned    = rawContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Grok returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-steps for grading pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAIConfig() {
  const { data: configData, error: configErr } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'ai_engine')
    .single();

  if (configErr && configErr.code !== 'PGRST116') {
    throw new Error(`Failed to fetch AI configuration: ${configErr.message}`);
  }
  return configData?.value || null;
}

async function getActiveAIConfig() {
  const customConfig = await fetchAIConfig();
  const config = customConfig || {
    primary_model: 'grok-3',
    temperature:   0.2,
    is_active:     true,
    system_prompt: `You are an expert academic grading assistant. Use a {{strictnessLabel}} grading approach.

QUESTION PAPER:
---
{{questionText}}
---

ANSWER KEY (reference solution):
---
{{answerKeyText}}
---

STUDENT SUBMISSION:
---
{{submissionText}}
---

Total marks available: {{maxMarks}}

Respond ONLY with valid JSON in this exact schema:
{
  "final_score": <number>,
  "max_score": <number>,
  "feedback_summary": "<string>",
  "grammar_score": <0-100 or null>,
  "confidence": <0.0-1.0>,
  "total_questions": <number>,
  "questions_answered": <number>,
  "correct_answers": [<question numbers>],
  "incorrect_answers": [<question numbers>],
  "unanswered_questions": [<question numbers>],
  "improvement_suggestions": ["<string>"],
  "breakdown": [{"question":<n>,"label":"<str>","score":<n>,"max":<n>,"attempted":<bool>,"comment":"<str>"}]
}`,
  };

  if (config.is_active === false) {
    throw new Error('AI Engine is globally disabled.');
  }
  return config;
}

async function fetchSubmissionData(submissionId) {
  const { data: submission, error: subErr } = await supabaseAdmin
    .from('submissions')
    .select('*, assignments(title, max_marks, ai_strictness, question_pdf_url, answer_key_pdf_url, description)')
    .eq('id', submissionId)
    .single();

  if (subErr || !submission) {
    throw new Error(`Could not fetch submission ${submissionId}: ${subErr?.message}`);
  }
  if (!submission.file_url) {
    throw new Error(`Submission ${submissionId} has no file_url`);
  }
  return submission;
}

async function downloadRequiredFiles(submission, assignment) {
  console.log('[GradingService] Downloading files...');
  const submissionBuffer = await downloadBuffer('submissions', submission.file_url);

  let questionBuffer = null;
  if (assignment.question_pdf_url) {
    questionBuffer = await downloadBuffer('question-papers', assignment.question_pdf_url);
  }

  let answerKeyBuffer = null;
  if (assignment.answer_key_pdf_url) {
    answerKeyBuffer = await downloadBuffer('answer-keys', assignment.answer_key_pdf_url);
  } else {
    console.warn('[GradingService] No answer_key_pdf_url — using assignment description as key');
  }

  return { submissionBuffer, questionBuffer, answerKeyBuffer };
}

async function extractTexts(buffers, urls, assignment) {
  console.log('[GradingService] Extracting text...');
  const submissionText = await extractText(buffers.submissionBuffer, urls.submissionUrl);

  const questionText = buffers.questionBuffer
    ? await extractText(buffers.questionBuffer, urls.questionUrl)
    : (assignment.description || 'No question paper provided.');

  const answerKeyText = buffers.answerKeyBuffer
    ? await extractText(buffers.answerKeyBuffer, urls.answerKeyUrl)
    : 'No answer key provided. Grade based on general academic standards and the question paper context.';

  if (!submissionText || submissionText.length < 5) {
    throw new Error('Could not extract any readable text from the student submission');
  }

  return { submissionText, questionText, answerKeyText };
}

async function saveGradingReport(submissionId, aiResult, submissionText) {
  const { error: upsertErr } = await supabaseAdmin
    .from('ai_reports')
    .upsert(
      {
        submission_id:           submissionId,
        ai_score:                aiResult.final_score,
        final_score:             aiResult.final_score,
        feedback_summary:        aiResult.feedback_summary,
        grammar_score:           aiResult.grammar_score ?? null,
        unanswered_questions:    aiResult.unanswered_questions    || [],
        improvement_suggestions: aiResult.improvement_suggestions || [],
        correct_answers:         aiResult.correct_answers         || [],
        incorrect_answers:       aiResult.incorrect_answers       || [],
        ocr_text:                submissionText,
        detailed_analysis: {
          total_questions:    aiResult.total_questions,
          questions_answered: aiResult.questions_answered,
          confidence:         aiResult.confidence,
          max_score:          aiResult.max_score,
          breakdown:          aiResult.breakdown || [],
        },
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id' },
    );

  if (upsertErr) throw new Error(`Failed to save AI report: ${upsertErr.message}`);

  await supabaseAdmin
    .from('submissions')
    .update({ status: 'graded' })
    .eq('id', submissionId);
}

function notifyStudent(submissionId, studentId, finalScore) {
  try {
    const io = socketManager.getIO();
    if (studentId) {
      io.to(`user_${studentId}`).emit('grading_complete', {
        submission_id: submissionId,
        score:         finalScore,
        message:       'AI Grading is complete for your assignment!',
      });
    }
  } catch (err) {
    console.error('[GradingService] Failed to emit socket event:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported grading function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grade a single submission.
 *
 * @param {string}   submissionId   - UUID of the submission to grade
 * @param {Function} onProgress     - optional async fn(pct) e.g. job.updateProgress
 * @returns {{ submissionId, studentId, finalScore }}
 */
async function gradeSubmission(submissionId, onProgress = async () => {}) {
  console.log(`[GradingService] Starting grading for submission ${submissionId}`);

  // 1. Fetch AI config
  const aiConfig = await getActiveAIConfig();
  await onProgress(5);

  // 2. Fetch submission data
  const submission = await fetchSubmissionData(submissionId);
  const assignment = submission.assignments;
  await onProgress(15);

  // 3. Download files
  const buffers = await downloadRequiredFiles(submission, assignment);
  await onProgress(30);

  // 4. Extract text
  const { submissionText, questionText, answerKeyText } = await extractTexts(
    buffers,
    {
      submissionUrl: submission.file_url,
      questionUrl: assignment.question_pdf_url,
      answerKeyUrl: assignment.answer_key_pdf_url,
    },
    assignment
  );
  await onProgress(55);

  // 5. Call Grok AI
  console.log('[GradingService] Calling Grok API...');
  const prompt = buildPrompt({
    basePrompt:     aiConfig.system_prompt,
    questionText,
    answerKeyText,
    submissionText,
    maxMarks:       assignment.max_marks || 100,
    aiStrictness:   assignment.ai_strictness || 50,
  });
  const aiResult = await callGrok(prompt, aiConfig.primary_model, aiConfig.temperature);
  console.log(`[GradingService] Grok responded — score: ${aiResult.final_score}/${aiResult.max_score}`);
  await onProgress(80);

  // 6. Save results
  await saveGradingReport(submissionId, aiResult, submissionText);
  await onProgress(100);
  console.log(`[GradingService] ✓ Grading complete for ${submissionId}`);

  // 7. Notify student
  notifyStudent(submissionId, submission.student_id, aiResult.final_score);

  return { submissionId, studentId: submission.student_id, finalScore: aiResult.final_score };
}

module.exports = { gradeSubmission };
