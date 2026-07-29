-- ─────────────────────────────────────────────────────────────────────────────
-- AI EVALUATION ENHANCEMENT — Schema Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Add richer evaluation columns to ai_reports
ALTER TABLE ai_reports
  ADD COLUMN IF NOT EXISTS grammar_score         INTEGER,
  ADD COLUMN IF NOT EXISTS unanswered_questions  JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS improvement_suggestions JSONB  DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS correct_answers       JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS incorrect_answers     JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ocr_text              TEXT;

-- Indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_ai_reports_unanswered
  ON ai_reports USING gin(unanswered_questions);
CREATE INDEX IF NOT EXISTS idx_ai_reports_suggestions
  ON ai_reports USING gin(improvement_suggestions);
