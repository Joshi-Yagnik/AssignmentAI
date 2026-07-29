-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY LOGS — Schema Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('viva', 'assignment')),
  reference_id UUID, -- Optional link to viva_session_id or submission_id
  violation_type TEXT NOT NULL CHECK (violation_type IN ('tab_switch', 'face_lost', 'multiple_faces', 'mobile_detected', 'audio_anomaly')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_security_logs_subject ON security_logs(subject_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(violation_type);

-- Note: In a real scenario, you would seed this using existing user and subject IDs.
-- The backend endpoints will join these properly.
