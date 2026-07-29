-- ─────────────────────────────────────────────────────────────────────────────
-- ASSIGNMENT SUBMISSION FEATURE — Schema Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add new columns to the assignments table
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allowed_formats  TEXT[]  DEFAULT ARRAY['.pdf','.docx','.doc','.png','.jpg','.jpeg'],
  ADD COLUMN IF NOT EXISTS allow_resubmission BOOLEAN DEFAULT TRUE;

-- 2. Add upload_history to the submissions table
--    Each entry will be: { "file_url": "...", "submitted_at": "..." }
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS upload_history JSONB DEFAULT '[]'::jsonb;

-- 3. Index on upload_history for fast JSONB queries (optional)
CREATE INDEX IF NOT EXISTS idx_submissions_upload_history
  ON submissions USING gin(upload_history);
