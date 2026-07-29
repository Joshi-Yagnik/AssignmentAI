-- ─────────────────────────────────────────────────────────────────────────────
-- STUDENT REQUESTS & APPEALS SYSTEM — Schema Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id      UUID REFERENCES users(id) ON DELETE SET NULL,

  -- What kind of request?
  type            TEXT NOT NULL CHECK (type IN ('deadline_extension', 'grade_appeal', 'other')),

  -- Context: linked to a specific assignment or viva (optional)
  assignment_id   UUID REFERENCES assignments(id) ON DELETE SET NULL,
  submission_id   UUID REFERENCES submissions(id) ON DELETE SET NULL,

  -- Request content
  reason          TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

  -- Lifecycle
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
  teacher_comment TEXT,
  new_deadline    TIMESTAMPTZ,              -- for deadline extension requests

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_student_requests_student ON student_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_requests_teacher ON student_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_requests_status  ON student_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_requests_assignment ON student_requests(assignment_id);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_student_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_requests_updated_at ON student_requests;
CREATE TRIGGER trg_student_requests_updated_at
  BEFORE UPDATE ON student_requests
  FOR EACH ROW EXECUTE FUNCTION update_student_requests_updated_at();

-- Row-Level Security
ALTER TABLE student_requests ENABLE ROW LEVEL SECURITY;

-- Students can see and insert their own requests
CREATE POLICY "Students: own requests" ON student_requests
  FOR ALL USING (auth.uid() = student_id);

-- Teachers can see all requests (they'll be filtered in the app)
CREATE POLICY "Teachers and admins: view all" ON student_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Teachers and admins can update status/comment
CREATE POLICY "Teachers and admins: update" ON student_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );
