-- PLATFORM SETTINGS — Schema Migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  maintenance_mode BOOLEAN DEFAULT false,
  default_grading_strictness TEXT DEFAULT 'normal' CHECK (default_grading_strictness IN ('lenient', 'normal', 'strict')),
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  require_2fa BOOLEAN DEFAULT false,
  session_timeout_minutes INTEGER DEFAULT 120,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with a default row if it doesn't exist
INSERT INTO platform_settings (maintenance_mode, default_grading_strictness, theme_preference, require_2fa, session_timeout_minutes)
SELECT false, 'normal', 'system', false, 120
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);
