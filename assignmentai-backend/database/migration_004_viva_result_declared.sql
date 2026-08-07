-- Migration: Add result_declared and final_score to viva_sessions
ALTER TABLE viva_sessions
  ADD COLUMN IF NOT EXISTS result_declared BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_score INTEGER;
