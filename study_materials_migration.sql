-- ─────────────────────────────────────────────────────────────────────────────
-- TASK 4 — STUDY MATERIALS
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS study_materials (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_size   INTEGER,
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_study_materials_subject_id ON study_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_created_at ON study_materials(created_at DESC);
