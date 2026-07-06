-- ═══════════════════════════════════════════════════════════════════════════
-- AssignmentAI — Full Supabase Schema Migration
-- Run this entire file in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK 1 — INSTITUTES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutes (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  address    TEXT,
  logo_url   TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_institutes_updated_at ON institutes;
CREATE TRIGGER trg_institutes_updated_at
  BEFORE UPDATE ON institutes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK 1 — DEPARTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institute_id, code)
);

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK 1 — SUBJECTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,
  credits       INTEGER NOT NULL DEFAULT 3 CHECK (credits BETWEEN 1 AND 6),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON subjects;
CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK 2 — USERS (Teachers & Students)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK 3 — ASSIGNMENTS (New Schema)
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop existing assignments table if it exists and recreate with new schema
-- WARNING: Only run DROP if you are OK losing existing assignment data.
-- Comment out the DROP line if you want to use ALTER TABLE instead.

-- DROP TABLE IF EXISTS assignments CASCADE;

CREATE TABLE IF NOT EXISTS assignments (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title              TEXT NOT NULL,
  instructions       TEXT,
  deadline           TIMESTAMPTZ NOT NULL,
  total_questions    INTEGER CHECK (total_questions > 0),
  question_pdf_url   TEXT,
  answer_key_pdf_url TEXT,
  subject_id         UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON assignments;
CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK 3 — ALTER TABLE (use this if table already exists instead of DROP+CREATE)
-- Uncomment lines below if assignments table already exists and you want to
-- add the new columns without losing data.
-- ─────────────────────────────────────────────────────────────────────────────
/*
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS instructions       TEXT,
  ADD COLUMN IF NOT EXISTS total_questions    INTEGER CHECK (total_questions > 0),
  ADD COLUMN IF NOT EXISTS question_pdf_url   TEXT,
  ADD COLUMN IF NOT EXISTS answer_key_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS subject_id         UUID REFERENCES subjects(id) ON DELETE CASCADE;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
-- Since the backend uses a service role key, RLS is enforced at the app layer
-- via JWT middleware. Enable RLS on tables as needed for additional security.

-- ALTER TABLE institutes  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subjects    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_departments_institute_id ON departments(institute_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department_id   ON subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role               ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department_id      ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id   ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by   ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_deadline     ON assignments(deadline);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA (optional — comment out in production)
-- ─────────────────────────────────────────────────────────────────────────────
/*
INSERT INTO institutes (name, code, address) VALUES
  ('Mumbai University', 'MU-2025', 'Fort, Mumbai 400001'),
  ('IIT Bombay', 'IIT-B', 'Powai, Mumbai 400076')
ON CONFLICT (code) DO NOTHING;
*/
