-- ============================================================
-- AssignmentAI — Migration 004: TA Viva System
-- Run this ENTIRE script in your Supabase SQL Editor
-- It is safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add 'ta' to valid roles in users table
-- ────────────────────────────────────────────────────────────
-- Drop the existing constraint and replace with one that includes 'ta'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'teacher', 'admin', 'ta'));

-- ────────────────────────────────────────────────────────────
-- 2. Extend viva_exam_sessions table for TA system
-- ────────────────────────────────────────────────────────────
ALTER TABLE viva_exam_sessions
  ADD COLUMN IF NOT EXISTS ta_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lab_batch        TEXT,
  ADD COLUMN IF NOT EXISTS class_name       TEXT,
  ADD COLUMN IF NOT EXISTS email_sent       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS score_policy     TEXT DEFAULT 'ai_only'
    CHECK (score_policy IN ('ai_only', 'ta_only', 'max', 'min', 'avg', 'custom'));

-- ────────────────────────────────────────────────────────────
-- 3. TA Viva Scores Table
--    Stores the marks that a TA gives to each student
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ta_viva_scores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID REFERENCES viva_exam_sessions(id) ON DELETE CASCADE,
    student_id  UUID REFERENCES users(id)              ON DELETE CASCADE,
    ta_id       UUID REFERENCES users(id)              ON DELETE SET NULL,
    ta_score    NUMERIC(5, 2),
    notes       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(session_id, student_id)
);

-- ────────────────────────────────────────────────────────────
-- 4. Disable RLS for new table
-- ────────────────────────────────────────────────────────────
ALTER TABLE ta_viva_scores DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 5. Indexes for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ta_viva_scores_session_id ON ta_viva_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_ta_viva_scores_student_id ON ta_viva_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_ta_viva_scores_ta_id      ON ta_viva_scores(ta_id);
CREATE INDEX IF NOT EXISTS idx_viva_exam_sessions_ta_id  ON viva_exam_sessions(ta_id);
