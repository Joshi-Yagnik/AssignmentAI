-- ============================================================
-- AssignmentAI — Full Schema Migration
-- Run this ENTIRE script in your Supabase SQL Editor
-- It is safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ASSIGNMENTS table — add missing columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS subject_id         UUID REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by         UUID REFERENCES users(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructions       TEXT,
  ADD COLUMN IF NOT EXISTS total_questions    INT,
  ADD COLUMN IF NOT EXISTS question_pdf_url   TEXT,
  ADD COLUMN IF NOT EXISTS answer_key_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS allowed_formats    JSONB    DEFAULT '["pdf","docx","doc","png","jpg","jpeg"]'::jsonb,
  ADD COLUMN IF NOT EXISTS allow_resubmission BOOLEAN  DEFAULT true,
  ADD COLUMN IF NOT EXISTS answer_key_url     TEXT,
  ADD COLUMN IF NOT EXISTS ai_strictness      INT      DEFAULT 50;

-- ────────────────────────────────────────────────────────────
-- 2. SUBMISSIONS table — add missing columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS upload_history JSONB DEFAULT '[]'::jsonb;

-- ────────────────────────────────────────────────────────────
-- 3. AI_REPORTS table — make final_score nullable (AI may not
--    have run yet when a placeholder row is inserted)
-- ────────────────────────────────────────────────────────────
ALTER TABLE ai_reports
  ALTER COLUMN final_score DROP NOT NULL;

-- add ai_score column if missing
ALTER TABLE ai_reports
  ADD COLUMN IF NOT EXISTS ai_score         INT,
  ADD COLUMN IF NOT EXISTS feedback_summary TEXT;   -- may already exist; safe

-- ────────────────────────────────────────────────────────────
-- 4. USERS table — add missing columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 5. VIVA_SESSIONS table — add extra columns used by routes
-- ────────────────────────────────────────────────────────────
ALTER TABLE viva_sessions
  ADD COLUMN IF NOT EXISTS subject         TEXT,
  ADD COLUMN IF NOT EXISTS topic           TEXT,
  ADD COLUMN IF NOT EXISTS difficulty      TEXT    DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS total_questions INT     DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_report       JSONB;

-- ────────────────────────────────────────────────────────────
-- 6. STUDY_MATERIALS table (used by material.routes.js)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES users(id)    ON DELETE SET NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  file_url    TEXT NOT NULL,
  file_type   VARCHAR(50),
  file_size   BIGINT DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS table (used by notificationService.js)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  type       VARCHAR(50)  DEFAULT 'info',
  is_read    BOOLEAN      DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ────────────────────────────────────────────────────────────
-- 8. SECURITY_LOGS table (used by report.routes.js)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id     UUID REFERENCES subjects(id) ON DELETE SET NULL,
  source         VARCHAR(100),
  reference_id   UUID,
  violation_type VARCHAR(100),
  severity       VARCHAR(50) DEFAULT 'medium',
  details        JSONB       DEFAULT '{}'::jsonb,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ────────────────────────────────────────────────────────────
-- 9. Useful indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_status        ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id    ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_submission_id  ON ai_reports(submission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id     ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by    ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id    ON assignments(subject_id);
