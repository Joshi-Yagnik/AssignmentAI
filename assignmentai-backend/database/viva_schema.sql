-- Live Viva Extended Schema
-- Run this in your Supabase SQL Editor to support the full Live Viva feature

-- Viva exam class-level sessions (Teacher creates these)
CREATE TABLE IF NOT EXISTS viva_exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INT DEFAULT 45,
    questions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Student answers within a viva exam session
CREATE TABLE IF NOT EXISTS viva_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES viva_exam_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_index INT NOT NULL,
    answer TEXT,
    warnings INT DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(session_id, student_id, question_index)
);

-- Violation events per student per session
CREATE TABLE IF NOT EXISTS viva_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES viva_exam_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Disable RLS for these new tables so backend can read/write freely
ALTER TABLE viva_exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE viva_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE viva_violations DISABLE ROW LEVEL SECURITY;
