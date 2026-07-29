-- ─────────────────────────────────────────────────────────────────────────────
-- AI VIVA SYSTEM — Schema Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Add configuration and report columns to viva_sessions
ALTER TABLE viva_sessions
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_report JSONB;
