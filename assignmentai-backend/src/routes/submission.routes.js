const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { gradingQueue } = require('../queues/gradingQueue');

// GET all pending submissions across all assignments (Teacher/Admin)
router.get('/pending', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        status,
        submitted_at,
        file_url,
        student_id,
        assignment_id,
        users!submissions_student_id_fkey(first_name, last_name, email),
        assignments(title, max_marks, class_id)
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET submissions for an assignment (Teacher/Admin)
router.get('/assignment/:assignmentId', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        status,
        submitted_at,
        file_url,
        users!submissions_student_id_fkey(first_name, last_name, email),
        ai_reports(final_score, feedback_summary, generated_at)
      `)
      .eq('assignment_id', req.params.assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET user's submissions
router.get('/me', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*, assignments(title, deadline)')
      .eq('student_id', req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE submission — enqueues an AI grading job automatically
router.post('/', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { assignment_id, file_url } = req.body;
    const student_id = req.user.id;

    // Upsert submission (if user submits again, it overwrites previous)
    const { data, error } = await supabase
      .from('submissions')
      .upsert(
        { assignment_id, student_id, file_url, status: 'submitted', submitted_at: new Date() },
        { onConflict: 'assignment_id, student_id' }
      )
      .select()
      .single();

    if (error) throw error;

    // ── Enqueue AI grading job ─────────────────────────────────────────────
    let gradingJobId = null;
    if (gradingQueue) {
      const job = await gradingQueue.add('grade', { submissionId: data.id });
      gradingJobId = job.id;
      console.log(`[SubmissionRoute] Enqueued grading job ${job.id} for submission ${data.id}`);
    } else {
      console.warn('[SubmissionRoute] Grading queue unavailable (Redis not running). Submission saved without queuing.');
    }

    res.status(201).json({ ...data, gradingJobId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH submission grade — teacher confirms / overrides AI grade
router.patch('/:id/grade', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { finalGrade, remarks, notify } = req.body;
    const submissionId = req.params.id;

    // Update submission status to graded
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .update({ status: 'graded' })
      .eq('id', submissionId)
      .select()
      .single();

    if (subErr) throw subErr;

    // Update the AI report with the teacher-confirmed final score and remarks
    const { data: report, error: repErr } = await supabase
      .from('ai_reports')
      .update({
        final_score: finalGrade,
        feedback_summary: remarks || undefined,
      })
      .eq('submission_id', submissionId)
      .select()
      .single();

    if (repErr) throw repErr;

    // TODO: trigger student notification if notify === true

    res.json({ submission, report, notified: notify ?? false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE submission status (legacy — kept for compatibility)
router.patch('/:id/status', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
