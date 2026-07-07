const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabaseAdmin');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// We use the existing viva_sessions table schema:
//   id, submission_id, student_id, teacher_id, status, scheduled_time,
//   warnings_count, transcript
//
// For class-wide sessions (teacher creates for all students to join),
// we store the class info in a dedicated way by using submission_id as NULL
// for the "session template" row (teacher's master row), and student rows
// link to assignments/submissions as normal.
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET all viva sessions (role-based) ─────────────────────────────────────
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query = supabaseAdmin
      .from('viva_sessions')
      .select(`
        id, status, scheduled_time, warnings_count, transcript,
        submission_id, student_id, teacher_id,
        users!viva_sessions_teacher_id_fkey(first_name, last_name, email)
      `)
      .order('scheduled_time', { ascending: false });

    if (role === 'teacher') {
      query = query.eq('teacher_id', userId).is('submission_id', null);
    } else if (role === 'student') {
      query = query.eq('student_id', userId);
    }
    // admin sees all

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Viva GET /sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET a single viva session ───────────────────────────────────────────────
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .select(`
        id, status, scheduled_time, warnings_count, transcript,
        submission_id, student_id, teacher_id,
        users!viva_sessions_teacher_id_fkey(first_name, last_name, email)
      `)
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Session not found' });
  }
});

// ─── POST create a new viva session (Teacher/Admin) ──────────────────────────
// Body: { title, scheduled_time, duration_minutes, questions }
// We store title/questions in transcript field as JSON metadata until we extend the schema
router.post('/sessions', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { title, scheduled_time, duration_minutes, questions } = req.body;
    const teacher_id = req.user.id;

    // Store metadata in transcript field as a JSON envelope (schema workaround)
    const meta = JSON.stringify({ title, duration_minutes: duration_minutes || 45, questions: questions || [] });

    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .insert([{
        teacher_id,
        student_id: teacher_id, // required NOT NULL — use teacher as placeholder for template rows
        status: 'scheduled',
        scheduled_time: scheduled_time || new Date(Date.now() + 3600000).toISOString(),
        transcript: meta,
        warnings_count: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Return with parsed metadata for the frontend
    res.status(201).json({ ...data, _meta: JSON.parse(data.transcript || '{}') });
  } catch (err) {
    console.error('[Viva POST /sessions]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── PATCH update viva session status ────────────────────────────────────────
router.patch('/sessions/:id/status', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { status } = req.body; // 'live' | 'ended' | 'scheduled'
    // Map to DB enum: scheduled → scheduled, live → live, ended → completed
    const dbStatus = status === 'ended' ? 'completed' : status;

    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .update({ status: dbStatus })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Viva PATCH status]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── POST save/update student transcript + warnings ──────────────────────────
// Body: { transcript, warnings, status }
router.post('/sessions/:id/answers', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { transcript, warnings, status } = req.body;
    const student_id = req.user.id;

    // Find existing row for this student in this session
    const { data: existing } = await supabaseAdmin
      .from('viva_sessions')
      .select('id')
      .eq('id', req.params.id)
      .eq('student_id', student_id)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('viva_sessions')
        .update({ transcript, warnings_count: warnings, status: status || 'live' })
        .eq('id', req.params.id)
        .select().single();
      if (error) throw error;
      result = data;
    } else {
      // If student doesn't have their own row, update the master row directly
      const { data, error } = await supabaseAdmin
        .from('viva_sessions')
        .update({ transcript, warnings_count: warnings, status: status || 'live' })
        .eq('id', req.params.id)
        .select().single();
      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (err) {
    console.error('[Viva POST /answers]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── POST log a violation (best-effort) ──────────────────────────────────────
router.post('/sessions/:id/violations', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .select('warnings_count')
      .eq('id', req.params.id)
      .single();
    
    if (!error && data) {
      await supabaseAdmin
        .from('viva_sessions')
        .update({ warnings_count: (data.warnings_count || 0) + 1 })
        .eq('id', req.params.id);
    }
    res.json({ ok: true });
  } catch (_) {
    res.json({ ok: false });
  }
});

module.exports = router;
