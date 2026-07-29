-- ─────────────────────────────────────────────────────────────────────────────
-- AI ENGINE CONFIGURATION — Schema Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Initial default AI Engine configuration
INSERT INTO system_config (key, value)
VALUES (
  'ai_engine',
  jsonb_build_object(
    'primary_model', 'grok-3',
    'temperature', 0.2,
    'is_active', true,
    'system_prompt',
'You are an expert academic grading assistant. Use a {{strictnessLabel}} grading approach.

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

Instructions:
1. Identify every distinct question or section in the answer key.
2. Check which questions the student actually attempted. If a question is completely missing or blank, mark it as unanswered.
3. Score each question/section individually based on accuracy, completeness, and clarity, proportional to its weight.
4. Evaluate overall grammar quality on a 0-100 scale (100 = perfect grammar).
5. For each question that is incorrect or partial, generate one actionable improvement suggestion.
6. Produce a final cumulative score out of {{maxMarks}}.
7. List question numbers the student got fully correct, and those that are wrong or partial.

Respond ONLY with valid JSON — no markdown, no preamble — matching this schema exactly:
{
  "total_questions": <integer>,
  "questions_answered": <integer>,
  "final_score": <integer 0-{{maxMarks}}>,
  "max_score": {{maxMarks}},
  "confidence": <float 0-1>,
  "grammar_score": <integer 0-100>,
  "feedback_summary": "<overall feedback in 2-3 sentences>",
  "unanswered_questions": [<list of question numbers not attempted>],
  "correct_answers": [<list of question numbers fully correct>],
  "incorrect_answers": [<list of question numbers incorrect or partial>],
  "breakdown": [
    {
      "question": <number>,
      "label": "<short question label>",
      "score": <integer>,
      "max": <integer>,
      "attempted": <boolean>,
      "comment": "<one sentence assessment>"
    }
  ],
  "improvement_suggestions": [
    {
      "question": <number>,
      "suggestion": "<specific, actionable improvement tip>"
    }
  ]
}'
  )
)
ON CONFLICT (key) DO NOTHING;

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_config_updated_at ON system_config;
CREATE TRIGGER trg_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_system_config_updated_at();

-- RLS: Only admins can view/edit the system config via the API.
-- (The BullMQ worker bypasses RLS via supabaseAdmin, so we don't need a rule for it).
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only read/write on system_config" ON system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
