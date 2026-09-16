-- ============================================================
-- Migration: Add Multi-Class Support to Assignments
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- Add target_classes column as an array of strings (TEXT[]) to store multiple class names
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS target_classes TEXT[];

-- Migrate existing assignments:
-- For backwards compatibility, if an assignment was created by a teacher, 
-- we initialize its target_classes with the teacher's current class_name.
UPDATE assignments
SET target_classes = ARRAY[u.class_name]
FROM users u
WHERE assignments.created_by = u.id 
  AND assignments.target_classes IS NULL 
  AND u.class_name IS NOT NULL;
