const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabaseAdmin');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { generateNextVivaQuestion, evaluateVivaSession } = require('../services/grokService');

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

    if (role === 'teacher') {
      // Teacher sees their own class-wide template sessions
      // Template rows: student_id = teacher_id, no _parent_session_id in transcript
      const { data, error } = await supabaseAdmin
        .from('viva_sessions')
        .select(`
          id, status, scheduled_time, warnings_count, transcript,
          submission_id, student_id, teacher_id,
          subject, topic, difficulty, total_questions, ai_report,
          users!viva_sessions_teacher_id_fkey(first_name, last_name, email)
        `)
        .eq('teacher_id', userId)
        .is('submission_id', null)
        .order('scheduled_time', { ascending: false });
      if (error) throw error;
      // Filter out student participation rows (created by /join endpoint)
      const templateRows = (data || []).filter(row => {
        try { return !JSON.parse(row.transcript || '{}')._parent_session_id; }
        catch { return true; }
      });
      res.json(templateRows);
    } else if (role === 'student') {
      // Students see class-wide template sessions (submission_id IS NULL).
      // Template rows: no _parent_session_id in transcript.
      // Student participation rows: have _parent_session_id in transcript.
      // We only want to show template rows in the lobby.
      const { data: allNullSubRows, error: e1 } = await supabaseAdmin
        .from('viva_sessions')
        .select(`
          id, status, scheduled_time, warnings_count, transcript,
          submission_id, student_id, teacher_id,
          subject, topic, difficulty, total_questions, ai_report,
          users!viva_sessions_teacher_id_fkey(first_name, last_name, email)
        `)
        .is('submission_id', null)
        .order('scheduled_time', { ascending: false });
      if (e1) throw e1;

      // Filter: keep only "template" rows (those without _parent_session_id in transcript)
      const templateRows = (allNullSubRows || []).filter(row => {
        try {
          const m = JSON.parse(row.transcript || '{}');
          // Template rows don't have _parent_session_id; student participation rows do
          return !m._parent_session_id;
        } catch { return true; }
      });

      res.json(templateRows);
    } else {
      // admin sees all
      const { data, error } = await supabaseAdmin
        .from('viva_sessions')
        .select(`
          id, status, scheduled_time, warnings_count, transcript,
          submission_id, student_id, teacher_id,
          subject, topic, difficulty, total_questions, ai_report,
          users!viva_sessions_teacher_id_fkey(first_name, last_name, email)
        `)
        .order('scheduled_time', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    }
  } catch (err) {
    console.error('[Viva GET /sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET student's own completed viva sessions ────────────────────────────────
router.get('/sessions/me', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .select(`
        id, status, scheduled_time, warnings_count, transcript,
        subject, topic, difficulty, total_questions, ai_report,
        users!viva_sessions_teacher_id_fkey(first_name, last_name, email)
      `)
      .eq('student_id', req.user.id)
      .is('submission_id', null) // student's viva participation rows
      .in('status', ['completed', 'ended'])
      .order('scheduled_time', { ascending: false });
    
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Viva GET /sessions/me]', err.message);
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
        subject, topic, difficulty, total_questions, ai_report,
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
// Body: { title, scheduled_time, duration_minutes, subject, topic, difficulty, total_questions }
router.post('/sessions', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { title, scheduled_time, duration_minutes, subject, topic, difficulty, total_questions } = req.body;
    const teacher_id = req.user.id;

    // Store metadata in transcript field as a JSON envelope (for backwards compatibility/title)
    const meta = JSON.stringify({ title, duration_minutes: duration_minutes || 45 });

    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .insert([{
        teacher_id,
        student_id: teacher_id, // required NOT NULL — use teacher as placeholder for template rows
        status: 'scheduled',
        scheduled_time: scheduled_time || new Date(Date.now() + 3600000).toISOString(),
        transcript: meta,
        warnings_count: 0,
        subject,
        topic,
        difficulty: difficulty || 'medium',
        total_questions: total_questions || 5
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

// ─── POST student joins a class-wide viva session ────────────────────────────
// Creates a participation row for this student that references the template session
// via a _parent_session_id marker in the transcript JSON (avoids FK issues).
router.post('/sessions/:id/join', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const student_id = req.user.id;
    const templateId = req.params.id;

    // Fetch the master template row to copy metadata
    const { data: template, error: te } = await supabaseAdmin
      .from('viva_sessions')
      .select('teacher_id, scheduled_time, transcript, status, subject, topic, difficulty, total_questions')
      .eq('id', templateId)
      .single();
    if (te || !template) return res.status(404).json({ error: 'Session not found' });
    if (template.status !== 'live' && template.status !== 'scheduled') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Parse existing meta to inherit questions etc.
    let templateMeta = {};
    try { templateMeta = JSON.parse(template.transcript || '{}'); } catch {}

    // Check if student already joined — look for a row with _parent_session_id marker
    const { data: existingRows } = await supabaseAdmin
      .from('viva_sessions')
      .select('id, status, transcript')
      .eq('student_id', student_id)
      .is('submission_id', null);

    if (existingRows) {
      const alreadyJoined = existingRows.find(row => {
        try {
          const m = JSON.parse(row.transcript || '{}');
          return m._parent_session_id === templateId;
        } catch { return false; }
      });
      if (alreadyJoined) {
        return res.json({ sessionId: alreadyJoined.id, alreadyJoined: true });
      }
    }

    // Build participation transcript: embed questions + parent marker
    const participationMeta = JSON.stringify({
      ...templateMeta,
      _parent_session_id: templateId,
      _student_answer: '',
    });

    // Create student participation row (submission_id = null to avoid FK constraint)
    const { data: newRow, error: ne } = await supabaseAdmin
      .from('viva_sessions')
      .insert([{
        teacher_id: template.teacher_id,
        student_id,
        submission_id: null,
        status: 'live',
        scheduled_time: template.scheduled_time || new Date().toISOString(),
        transcript: participationMeta,
        warnings_count: 0,
        subject: template.subject,
        topic: template.topic,
        difficulty: template.difficulty,
        total_questions: template.total_questions,
      }])
      .select()
      .single();
    if (ne) throw ne;

    res.status(201).json({ sessionId: newRow.id, alreadyJoined: false });
  } catch (err) {
    console.error('[Viva POST /join]', err.message);
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

// ─── POST generate next viva question (AI Interviewer) ───────────────────────
router.post('/sessions/:id/next-question', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { transcriptMessages, currentQuestionCount } = req.body;
    
    // Fetch session details
    const { data: session, error } = await supabaseAdmin
      .from('viva_sessions')
      .select('subject, topic, difficulty, total_questions')
      .eq('id', req.params.id)
      .single();
    if (error || !session) throw new Error('Session not found');

    const result = await generateNextVivaQuestion(
      session.subject, 
      session.topic, 
      session.difficulty, 
      transcriptMessages, 
      currentQuestionCount, 
      session.total_questions
    );

    res.json(result);
  } catch (err) {
    console.error('[Viva POST /next-question]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST evaluate viva session (AI Grading) ─────────────────────────────────
router.post('/sessions/:id/evaluate', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { transcriptMessages } = req.body;
    
    // Fetch session details
    const { data: session, error } = await supabaseAdmin
      .from('viva_sessions')
      .select('subject, topic')
      .eq('id', req.params.id)
      .single();
    if (error || !session) throw new Error('Session not found');

    const report = await evaluateVivaSession(session.subject, session.topic, transcriptMessages);

    // Save report to DB and mark ended
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('viva_sessions')
      .update({ ai_report: report, status: 'completed' })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (updateErr) throw updateErr;

    res.json({ report, session: updated });
  } catch (err) {
    console.error('[Viva POST /evaluate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
