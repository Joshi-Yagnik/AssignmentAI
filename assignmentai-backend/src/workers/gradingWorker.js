const { Worker } = require('bullmq');
const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');
const { createWorker: createTesseractWorker } = require('tesseract.js');
const supabaseAdmin = require('../config/supabaseAdmin');
const { createRedisConnection } = require('../config/redisClient');
const socketManager = require('../sockets/socketManager');

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const MIN_TEXT_LENGTH = 50; // below this threshold, assume scanned PDF → run OCR

// Image file extensions that go straight to Tesseract
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Download a file from Supabase Storage and return it as a Buffer.
 */
async function downloadBuffer(bucket, path) {
  // If it's a full URL (legacy/public), fallback to fetch
  if (path.startsWith('http')) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return Buffer.from(await res.arrayBuffer());
  }

  // Otherwise, use the internal path with Supabase Admin SDK (bypasses RLS for private buckets)
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);
    
  if (error) throw new Error(`Supabase storage download failed for ${path}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Get the lowercase file extension from a path/filename.
 */
function getExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
}

/**
 * Run Tesseract OCR on a buffer (works for both scanned PDFs and raw images).
 */
async function runOCR(buffer) {
  console.log('[GradingWorker] Running Tesseract OCR...');
  const tesseract = await createTesseractWorker('eng');
  try {
    const { data } = await tesseract.recognize(buffer);
    return (data.text || '').trim();
  } finally {
    await tesseract.terminate();
  }
}

/**
 * Extract plain text from a buffer.
 * Supports: .txt, .docx (text-only fallback), .pdf (with OCR fallback), and image files.
 */
async function extractText(buffer, filename) {
  const ext = getExtension(filename);

  // ── Plain text ──────────────────────────────────────────────────────────────
  if (ext === '.txt') {
    return buffer.toString('utf-8').trim();
  }

  // ── Image files → direct OCR ────────────────────────────────────────────────
  if (IMAGE_EXTENSIONS.includes(ext)) {
    console.log(`[GradingWorker] Image file detected (${ext}) — running OCR directly.`);
    return runOCR(buffer);
  }

  // ── PDF: try text extraction first, fall back to OCR ────────────────────────
  let text = '';
  try {
    const parsed = await pdfParse(buffer);
    text = (parsed.text || '').trim();
  } catch (err) {
    console.warn('[GradingWorker] pdf-parse failed, will try OCR:', err.message);
  }

  if (text.length >= MIN_TEXT_LENGTH) {
    return text;
  }

  // Scanned PDF — use OCR
  console.log('[GradingWorker] PDF text too short — running Tesseract OCR on scanned PDF...');
  return runOCR(buffer);
}

/**
 * Build a structured prompt for Grok using the dynamic template from the DB.
 */
function buildPrompt({ basePrompt, questionText, answerKeyText, submissionText, maxMarks, aiStrictness }) {
  const strictnessLabel =
    aiStrictness >= 75 ? 'strict' : aiStrictness >= 40 ? 'balanced' : 'lenient';

  let prompt = basePrompt
    .replace('{{strictnessLabel}}', strictnessLabel)
    .replace('{{questionText}}', questionText)
    .replace('{{answerKeyText}}', answerKeyText)
    .replace('{{submissionText}}', submissionText);
    
  // Replace all occurrences of {{maxMarks}}
  prompt = prompt.split('{{maxMarks}}').join(maxMarks);

  return prompt;
}

/**
 * Call the Grok API and return the parsed JSON result.
 */
async function callGrok(prompt, model, temperature) {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error('GROK_API_KEY is not set in environment variables');

  const res = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'grok-3',
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature !== undefined ? Number(temperature) : 0.2,
      max_tokens: 3000, // increased for richer response
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Grok API error ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const rawContent = json.choices?.[0]?.message?.content || '';

  // Strip any accidental markdown code fences
  const cleaned = rawContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Grok returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker processor
// ─────────────────────────────────────────────────────────────────────────────

async function processGradingJob(job) {
  const { submissionId } = job.data;
  console.log(`[GradingWorker] Processing job ${job.id} for submission ${submissionId}`);

  // Fetch AI Config from DB
  const { data: configData, error: configErr } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'ai_engine')
    .single();

  if (configErr && configErr.code !== 'PGRST116') {
    throw new Error(`Failed to fetch AI configuration: ${configErr.message}`);
  }

  const aiConfig = configData?.value || {
    primary_model: 'grok-3',
    temperature: 0.2,
    is_active: true,
    system_prompt: "You are an expert academic grading assistant. Use a {{strictnessLabel}} grading approach...\n\nQUESTION PAPER:\n---\n{{questionText}}\n---\n\nANSWER KEY (reference solution):\n---\n{{answerKeyText}}\n---\n\nSTUDENT SUBMISSION:\n---\n{{submissionText}}\n---\n\nTotal marks available: {{maxMarks}}\n\nRespond ONLY with valid JSON..."
  };

  if (aiConfig.is_active === false) {
    throw new Error('AI Engine is globally disabled. Job aborted and kept in queue for retry.');
  }

  await job.updateProgress(5);

  // ── 1. Fetch submission + assignment ──────────────────────────────────────
  const { data: submission, error: subErr } = await supabaseAdmin
    .from('submissions')
    .select('*, assignments(title, max_marks, ai_strictness, question_pdf_url, answer_key_pdf_url, description)')
    .eq('id', submissionId)
    .single();

  if (subErr || !submission) {
    throw new Error(`Could not fetch submission ${submissionId}: ${subErr?.message}`);
  }

  const assignment = submission.assignments;

  if (!submission.file_url) {
    throw new Error(`Submission ${submissionId} has no file_url`);
  }

  if (!assignment.answer_key_pdf_url) {
    console.warn('[GradingWorker] No answer_key_pdf_url — using assignment description as key');
  }

  await job.updateProgress(15);

  // ── 2. Download files ─────────────────────────────────────────────────────
  console.log('[GradingWorker] Downloading submission file...');
  const submissionBuffer = await downloadBuffer('submissions', submission.file_url);

  let questionBuffer = null;
  if (assignment.question_pdf_url) {
    console.log('[GradingWorker] Downloading question paper PDF...');
    questionBuffer = await downloadBuffer('question-papers', assignment.question_pdf_url);
  }

  let answerKeyBuffer = null;
  if (assignment.answer_key_pdf_url) { 
    console.log('[GradingWorker] Downloading answer key PDF...');
    answerKeyBuffer = await downloadBuffer('answer-keys', assignment.answer_key_pdf_url);
  }

  await job.updateProgress(30);

  // ── 3. Extract text (with OCR fallback for scanned PDFs and images) ────────
  console.log('[GradingWorker] Extracting text from submission...');
  const submissionText = await extractText(submissionBuffer, submission.file_url);

  let questionText = '';
  if (questionBuffer) {
    console.log('[GradingWorker] Extracting text from question paper...');
    questionText = await extractText(questionBuffer, assignment.question_pdf_url);
  } else {
    questionText = assignment.description || 'No question paper provided.';
  }

  let answerKeyText = '';
  if (answerKeyBuffer) {
    console.log('[GradingWorker] Extracting text from answer key...');
    answerKeyText = await extractText(answerKeyBuffer, assignment.answer_key_pdf_url);
  } else {
    answerKeyText = 'No answer key provided. Grade based on general academic standards and the question paper context.';
  }

  if (!submissionText || submissionText.length < 5) {
    throw new Error('Could not extract any readable text from the student submission');
  }

  await job.updateProgress(55);

  // ── 4. Call Grok ──────────────────────────────────────────────────────────
  console.log('[GradingWorker] Calling Grok API...');
  const prompt = buildPrompt({
    basePrompt: aiConfig.system_prompt,
    questionText,
    answerKeyText,
    submissionText,
    maxMarks: assignment.max_marks || 100,
    aiStrictness: assignment.ai_strictness || 50,
  });

  const aiResult = await callGrok(prompt, aiConfig.primary_model, aiConfig.temperature);
  console.log(`[GradingWorker] Grok responded — score: ${aiResult.final_score}/${aiResult.max_score}`);

  await job.updateProgress(80);

  // ── 5. Save to ai_reports ─────────────────────────────────────────────────
  const { error: upsertErr } = await supabaseAdmin
    .from('ai_reports')
    .upsert(
      {
        submission_id: submissionId,
        ai_score: aiResult.final_score,
        final_score: aiResult.final_score,
        feedback_summary: aiResult.feedback_summary,
        grammar_score: aiResult.grammar_score ?? null,
        unanswered_questions: aiResult.unanswered_questions || [],
        improvement_suggestions: aiResult.improvement_suggestions || [],
        correct_answers: aiResult.correct_answers || [],
        incorrect_answers: aiResult.incorrect_answers || [],
        ocr_text: submissionText, // store extracted text for teacher reference
        detailed_analysis: {
          total_questions: aiResult.total_questions,
          questions_answered: aiResult.questions_answered,
          confidence: aiResult.confidence,
          max_score: aiResult.max_score,
          breakdown: aiResult.breakdown || [],
        },
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id' },
    );

  if (upsertErr) throw new Error(`Failed to save AI report: ${upsertErr.message}`);

  // ── 6. Mark submission as graded ──────────────────────────────────────────
  await supabaseAdmin
    .from('submissions')
    .update({ status: 'graded' })
    .eq('id', submissionId);

  await job.updateProgress(100);
  console.log(`[GradingWorker] Job ${job.id} complete ✓`);

  return { submissionId, studentId: submission.student_id, finalScore: aiResult.final_score };
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker instance
// ─────────────────────────────────────────────────────────────────────────────

let gradingWorker = null;

// Skip BullMQ worker if Redis is not configured (e.g. Render free tier without Redis)
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.warn('[GradingWorker] REDIS_URL not set — AI grading worker is DISABLED. Set REDIS_URL to enable background grading.');
}

if (REDIS_URL) try {
  const redisConnection = createRedisConnection();

  // Suppress unhandled 'error' events from ioredis so a Redis outage
  // doesn't crash the whole Express server.
  redisConnection.on('error', (err) => {
    console.warn('[GradingWorker] Redis connection error (worker disabled):', err.message);
  });

  gradingWorker = new Worker('ai-grading', processGradingJob, {
    connection: redisConnection,
    concurrency: 3, // process up to 3 submissions simultaneously
  });

  gradingWorker.on('completed', (job, result) => {
    console.log(`[GradingWorker] ✓ Completed job ${job.id} — score: ${result.finalScore}`);
    
    // Emit real-time notification to the specific student
    try {
      const io = socketManager.getIO();
      if (result.studentId) {
        io.to(`user_${result.studentId}`).emit('grading_complete', {
          submission_id: result.submissionId,
          score: result.finalScore,
          message: 'AI Grading is complete for your assignment!'
        });
      }
    } catch (err) {
      console.error('[GradingWorker] Failed to emit socket event:', err.message);
    }
  });

  gradingWorker.on('failed', (job, err) => {
    console.error(`[GradingWorker] ✗ Failed job ${job?.id}:`, err.message);
  });

  gradingWorker.on('error', (err) => {
    console.error('[GradingWorker] Worker error:', err.message);
  });

  console.log('[GradingWorker] AI grading worker started and listening for jobs...');
} catch (err) {
  console.warn('[GradingWorker] Failed to start (Redis unavailable?). AI grading is disabled.', err.message);
}

module.exports = gradingWorker;
