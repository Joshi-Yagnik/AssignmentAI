-- ============================================================
-- AssignmentAI — Bulk Upload Fields Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS phone             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS current_semester  INT,
  ADD COLUMN IF NOT EXISTS gender            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS class_name        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lab_batch         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS batch_year        VARCHAR(50);
