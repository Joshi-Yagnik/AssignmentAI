-- ─────────────────────────────────────────────────────────────────────────────
-- ANALYTICS ENHANCEMENT — Schema Migration
-- Run this in your Supabase SQL Editor to support AI Grading Accuracy Trend
-- ─────────────────────────────────────────────────────────────────────────────

-- Add ai_score to ai_reports so we can preserve the original AI-assigned score
-- even after a teacher overrides final_score.
ALTER TABLE ai_reports
  ADD COLUMN IF NOT EXISTS ai_score INTEGER;

-- For rows that already have final_score but no ai_score, backfill ai_score
-- from final_score (they were never manually overridden so they are the same).
UPDATE ai_reports
  SET ai_score = final_score
  WHERE ai_score IS NULL AND final_score IS NOT NULL;

-- Optional index for analytics queries on ai_score
CREATE INDEX IF NOT EXISTS idx_ai_reports_ai_score ON ai_reports(ai_score);
