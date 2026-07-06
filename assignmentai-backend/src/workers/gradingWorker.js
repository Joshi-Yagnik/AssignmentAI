const { Worker } = require('bullmq');
const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');
const { createWorker: createTesseractWorker } = require('tesseract.js');
const supabaseAdmin = require('../config/supabaseAdmin');
const { createRedisConnection } = require('../config/redisClient');

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-3';
const MIN_TEXT_LENGTH = 50; // below this threshold, assume scanned PDF → run OCR

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
 * Extract plain text from a buffer. Supports .txt and .pdf files.
 * Falls back to Tesseract OCR when the PDF is image-only (scanned).
 */
async function extractText(buffer, filename) {
  let text = '';
  
  if (filename && filename.toLowerCase().endsWith('.txt')) {
    return buffer.toString('utf-8').trim();
  }

  try {
    const parsed = await pdfParse(buffer);
    text = (parsed.text || '').trim();
  } catch (err) {
    console.warn('[GradingWorker] pdf-parse failed, will try OCR:', err.message);
  }

  if (text.length >= MIN_TEXT_LENGTH) {
    return text;
  }

  // ── Scanned PDF: convert to image then OCR ────────────────────────────────
  console.log('[GradingWorker] Text too short — running Tesseract OCR...');
  const tesseract = await createTesseractWorker('eng');
  try {
    // Tesseract can read PDFs directly in its Node.js binding
    const { data } = await tesseract.recognize(buffer);
    text = (data.text || '').trim();
  } finally {
    await tesseract.terminate();
  }

  return text;
}

/**
 * Build a structured prompt for Grok.
 */
function buildPrompt({ answerKeyText, submissionText, maxMarks, aiStrictness }) {
  const strictnessLabel =
    aiStrictness >= 75 ? 'strict' : aiStrictness >= 40 ? 'balanced' : 'lenient';

  return `You are an academic grading assistant. Use a ${strictnessLabel} grading approach.

ANSWER KEY (reference solution):
---
${answerKeyText}
---

STUDENT SUBMISSION:
---
${submissionText}
---

Total marks available: ${maxMarks}

Instructions:
1. Identify every distinct question or section in the answer key.
2. Check which questions the student actually attempted.
3. Score each question/section individually based on accuracy, completeness,
   and clarity, proportional to its weight.
4. Produce a final cumulative score out of ${maxMarks}.

Respond ONLY with valid JSON — no markdown, no preamble — matching this schema exactly:
{
  "total_questions": <integer>,
  "questions_answered": <integer>,
  "final_score": <integer 0-${maxMarks}>,
  "max_score": ${maxMarks},
  "confidence": <float 0-1>,
  "feedback_summary": "<overall feedback in 2-3 sentences>",
  "breakdown": [
    {
      "question": <number>,
      "label": "<short question label>",
      "score": <integer>,
      "max": <integer>,
      "comment": "<one sentence feedback>"
    }
  ]
}`;
}

/**
 * Call the Grok API and return the parsed JSON result.
 */
async function callGrok(prompt) {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error('GROK_API_KEY is not set in environment variables');

  const res = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, // low temp for consistent grading
      max_tokens: 2048,
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

  await job.updateProgress(5);

  // ── 1. Fetch submission + assignment ──────────────────────────────────────
  const { data: submission, error: subErr } = await supabaseAdmin
    .from('submissions')
    .select('*, assignments(title, max_marks, ai_strictness, answer_key_pdf_url, description)')
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
    // Fallback: use the assignment description as the answer key
    console.warn('[GradingWorker] No answer_key_pdf_url — using assignment description as key');
  }

  await job.updateProgress(15);

  // ── 2. Download PDFs ──────────────────────────────────────────────────────
  console.log('[GradingWorker] Downloading submission PDF...');
  const submissionBuffer = await downloadBuffer('submissions', submission.file_url);

  let answerKeyBuffer = null;
  if (assignment.answer_key_pdf_url) { 
    console.log('[GradingWorker] Downloading answer key PDF...');
    answerKeyBuffer = await downloadBuffer('answer-keys', assignment.answer_key_pdf_url);
  }

  await job.updateProgress(30);

  // ── 3. Extract text (with OCR fallback) ───────────────────────────────────
  console.log('[GradingWorker] Extracting text from submission...');
  const submissionText = await extractText(submissionBuffer, submission.file_url);

  let answerKeyText = '';
  if (answerKeyBuffer) {
    console.log('[GradingWorker] Extracting text from answer key...');
    answerKeyText = await extractText(answerKeyBuffer, assignment.answer_key_pdf_url);
  } else {
    answerKeyText = assignment.description || 'No answer key provided. Grade based on general academic standards.';
  }

  if (!submissionText || submissionText.length < 5) {
    throw new Error('Could not extract any readable text from the student submission');
  }

  await job.updateProgress(55);

  // ── 4. Call Grok ──────────────────────────────────────────────────────────
  console.log('[GradingWorker] Calling Grok API...');
  const prompt = buildPrompt({
    answerKeyText,
    submissionText,
    maxMarks: assignment.max_marks || 100,
    aiStrictness: assignment.ai_strictness || 50,
  });

  const aiResult = await callGrok(prompt);
  console.log(`[GradingWorker] Grok responded — score: ${aiResult.final_score}/${aiResult.max_score}`);

  await job.updateProgress(80);

  // ── 5. Save to ai_reports ─────────────────────────────────────────────────
  const { error: upsertErr } = await supabaseAdmin
    .from('ai_reports')
    .upsert(
      {
        submission_id: submissionId,
        final_score: aiResult.final_score,
        feedback_summary: aiResult.feedback_summary,
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

  return { submissionId, finalScore: aiResult.final_score };
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker instance
// ─────────────────────────────────────────────────────────────────────────────

const gradingWorker = new Worker('ai-grading', processGradingJob, {
  connection: createRedisConnection(),
  concurrency: 3, // process up to 3 submissions simultaneously
});

gradingWorker.on('completed', (job, result) => {
  console.log(`[GradingWorker] ✓ Completed job ${job.id} — score: ${result.finalScore}`);
});

gradingWorker.on('failed', (job, err) => {
  console.error(`[GradingWorker] ✗ Failed job ${job?.id}:`, err.message);
});

gradingWorker.on('error', (err) => {
  console.error('[GradingWorker] Worker error:', err);
});

console.log('[GradingWorker] AI grading worker started and listening for jobs...');

module.exports = gradingWorker;
