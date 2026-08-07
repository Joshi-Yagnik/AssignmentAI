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

// ─── GET students who participated in a viva session ─────────────────────────
router.get('/sessions/:id/students', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .select('*, users!viva_sessions_student_id_fkey(first_name, last_name, email)')
      .is('submission_id', null);
      
    if (error) throw error;

    // Filter by _parent_session_id
    const students = (data || []).filter(row => {
      try {
        const m = JSON.parse(row.transcript || '{}');
        return m._parent_session_id === req.params.id;
      } catch { return false; }
    });
    
    res.json(students);
  } catch (err) {
    console.error('[Viva GET /sessions/:id/students]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH override AI report for a student session ──────────────────────────
router.patch('/sessions/:studentSessionId/report', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { ai_report } = req.body;
    const { data, error } = await supabaseAdmin
      .from('viva_sessions')
      .update({ ai_report })
      .eq('id', req.params.studentSessionId)
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Viva PATCH report]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST create a new viva session (Teacher/Admin) ──────────────────────────
// Body: { title, scheduled_time, duration_minutes, subject, topic, difficulty, total_questions, assignment_id, ta_id, lab_batch, class_name }
router.post('/sessions', requireAuth, requireRole(['teacher', 'admin', 'ta']), async (req, res) => {
  try {
    const { title, scheduled_time, duration_minutes, subject, topic, difficulty, total_questions, assignment_id, ta_id, lab_batch, class_name } = req.body;
    const teacher_id = req.user.id;

    let assignmentContext = null;
    let finalTitle = title;
    
    if (assignment_id) {
      const { data: assignData } = await supabaseAdmin
        .from('assignments')
        .select('title, instructions')
        .eq('id', assignment_id)
        .single();
      
      if (assignData) {
        assignmentContext = {
          id: assignment_id,
          title: assignData.title,
          instructions: assignData.instructions
        };
        finalTitle = title || `Viva for ${assignData.title}`;
      }
    }

    // Store metadata in transcript field as a JSON envelope
    const meta = JSON.stringify({ 
      title: finalTitle, 
      duration_minutes: duration_minutes || 45,
      assignment: assignmentContext
    });

    const { data, error } = await supabaseAdmin
      .from('viva_exam_sessions')
      .insert([{
        teacher_id,
        title: finalTitle,
        status: 'scheduled',
        scheduled_at: scheduled_time || new Date(Date.now() + 3600000).toISOString(),
        duration_minutes: duration_minutes || 45,
        questions: [],
        ta_id: ta_id || null,
        lab_batch: lab_batch || null,
        class_name: class_name || null,
        score_policy: 'ai_only'
      }])
      .select()
      .single();

    if (error) throw error;

    // Also create legacy viva_sessions row (template) for backward-compat
    const { data: legacyRow } = await supabaseAdmin
      .from('viva_sessions')
      .insert([{
        teacher_id,
        student_id: teacher_id,
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

    // Notify all students in the assigned lab-batch
    if (lab_batch || class_name) {
      let studentQuery = supabaseAdmin.from('users').select('id').eq('role', 'student');
      if (class_name) studentQuery = studentQuery.eq('class_name', class_name);
      if (lab_batch) studentQuery = studentQuery.eq('lab_batch', lab_batch);

      const { data: students } = await studentQuery;
      if (students && students.length > 0) {
        const notifications = students.map(s => ({
          user_id: s.id,
          type: 'viva_scheduled',
          title: `Viva Exam Scheduled: ${finalTitle}`,
          message: `Your viva exam has been scheduled. Time: ${new Date(scheduled_time || Date.now() + 3600000).toLocaleString()}. Duration: ${duration_minutes || 45} minutes.`,
          reference_id: data.id
        }));

        await supabaseAdmin.from('notifications').insert(notifications);
      }
    }
    
    // Return with parsed metadata for the frontend
    res.status(201).json({ ...data, legacy_session_id: legacyRow?.id });
  } catch (err) {
    console.error('[Viva POST /sessions]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── GET sessions for TA ──────────────────────────────────────────────────────
router.get('/ta/sessions', requireAuth, requireRole(['ta']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('viva_exam_sessions')
      .select(`
        id, title, status, scheduled_at, duration_minutes, lab_batch, class_name, score_policy,
        users!viva_exam_sessions_teacher_id_fkey(first_name, last_name, email)
      `)
      .eq('ta_id', req.user.id)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Viva GET /ta/sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET grading queue for a session (Professor) ─────────────────────────────
// Returns each student + their AI score (from viva_answers) + TA score
router.get('/sessions/:id/grading-queue', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    // Get session details (for score_policy, lab_batch, class_name)
    const { data: session, error: sErr } = await supabaseAdmin
      .from('viva_exam_sessions')
      .select('id, title, status, score_policy, lab_batch, class_name, ta_id, scheduled_at')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) return res.status(404).json({ error: 'Session not found' });

    // Get all students in this session's lab_batch/class
    let studentQuery = supabaseAdmin.from('users')
      .select('id, first_name, last_name, email, enrollment_number, class_name, lab_batch')
      .eq('role', 'student');
    if (session.class_name) studentQuery = studentQuery.eq('class_name', session.class_name);
    if (session.lab_batch) studentQuery = studentQuery.eq('lab_batch', session.lab_batch);
    const { data: students } = await studentQuery;

    // Get TA scores for this session
    const { data: taScores } = await supabaseAdmin
      .from('ta_viva_scores')
      .select('student_id, ta_score, notes')
      .eq('session_id', sessionId);

    // Get AI scores from viva_answers (average per student)
    const { data: vivaAnswers } = await supabaseAdmin
      .from('viva_answers')
      .select('student_id, question_index, answer')
      .eq('session_id', sessionId);

    // Also check old viva_sessions for AI report
    const { data: legacySessions } = await supabaseAdmin
      .from('viva_sessions')
      .select('student_id, ai_report')
      .is('submission_id', null)
      .neq('student_id', null);

    const taScoreMap = {};
    (taScores || []).forEach(ts => { taScoreMap[ts.student_id] = ts; });

    const aiScoreMap = {};
    (legacySessions || []).forEach(ls => {
      if (ls.ai_report && ls.student_id) {
        const report = typeof ls.ai_report === 'string' ? JSON.parse(ls.ai_report) : ls.ai_report;
        aiScoreMap[ls.student_id] = report?.total_score ?? null;
      }
    });

    const queue = (students || []).map(student => {
      const taEntry = taScoreMap[student.id];
      const aiScore = aiScoreMap[student.id] ?? null;
      const taScore = taEntry?.ta_score ?? null;

      let finalScore = null;
      if (session.score_policy === 'ai_only') finalScore = aiScore;
      else if (session.score_policy === 'ta_only') finalScore = taScore;
      else if (session.score_policy === 'max' && aiScore !== null && taScore !== null) finalScore = Math.max(aiScore, taScore);
      else if (session.score_policy === 'min' && aiScore !== null && taScore !== null) finalScore = Math.min(aiScore, taScore);
      else if (session.score_policy === 'avg' && aiScore !== null && taScore !== null) finalScore = Math.round((aiScore + taScore) / 2);

      return {
        student_id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        email: student.email,
        enrollment_number: student.enrollment_number,
        class_name: student.class_name,
        lab_batch: student.lab_batch,
        ai_score: aiScore,
        ta_score: taScore,
        ta_notes: taEntry?.notes || null,
        final_score: finalScore,
        divergence: (aiScore !== null && taScore !== null) ? Math.abs(aiScore - taScore) : null
      };
    });

    res.json({ session, queue });
  } catch (err) {
    console.error('[Viva GET /grading-queue]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST TA submits score for a student ─────────────────────────────────────
router.post('/sessions/:id/ta-score', requireAuth, requireRole(['ta', 'teacher', 'admin']), async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { student_id, ta_score, notes } = req.body;
    const ta_id = req.user.id;

    if (!student_id || ta_score == null) {
      return res.status(400).json({ error: 'student_id and ta_score are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('ta_viva_scores')
      .upsert([{ session_id: sessionId, student_id, ta_id, ta_score: Number(ta_score), notes: notes || null }], {
        onConflict: 'session_id,student_id'
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Viva POST /ta-score]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH Professor sets score policy ───────────────────────────────────────
router.patch('/sessions/:id/score-policy', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { score_policy } = req.body;

    const validPolicies = ['ai_only', 'ta_only', 'max', 'min', 'avg', 'custom'];
    if (!validPolicies.includes(score_policy)) {
      return res.status(400).json({ error: `score_policy must be one of: ${validPolicies.join(', ')}` });
    }

    const { data, error } = await supabaseAdmin
      .from('viva_exam_sessions')
      .update({ score_policy })
      .eq('id', sessionId)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Viva PATCH /score-policy]', err.message);
    res.status(500).json({ error: err.message });
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
      .select('subject, topic, difficulty, total_questions, transcript')
      .eq('id', req.params.id)
      .single();
    if (error || !session) throw new Error('Session not found');

    let assignmentContext = null;
    try {
      const parsed = JSON.parse(session.transcript || '{}');
      if (parsed.assignment) assignmentContext = parsed.assignment;
    } catch (e) {}

    const result = await generateNextVivaQuestion(
      session.subject, 
      session.topic, 
      session.difficulty, 
      transcriptMessages, 
      currentQuestionCount, 
      session.total_questions,
      assignmentContext
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
      .select('subject, topic, transcript')
      .eq('id', req.params.id)
      .single();
    if (error || !session) throw new Error('Session not found');

    let assignmentContext = null;
    try {
      const parsed = JSON.parse(session.transcript || '{}');
      if (parsed.assignment) assignmentContext = parsed.assignment;
    } catch (e) {}

    const report = await evaluateVivaSession(session.subject, session.topic, transcriptMessages, assignmentContext);

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
