-- Migration 001: Add answer_key_url to assignments table
-- Run this in your Supabase SQL Editor

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS answer_key_url TEXT;

-- Index to speed up worker lookups on submission status
CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON submissions(status);

-- Index to speed up report lookups
CREATE INDEX IF NOT EXISTS idx_ai_reports_submission_id
  ON ai_reports(submission_id);

-- Comment for clarity
COMMENT ON COLUMN assignments.answer_key_url IS
  'URL to the teacher-uploaded answer key PDF (AI-only, hidden from students)';
