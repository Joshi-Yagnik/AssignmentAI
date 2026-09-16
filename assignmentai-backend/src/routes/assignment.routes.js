const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { notifyAdmins, notifyStudents } = require('../services/notificationService');

const teacherOrAdmin = [requireAuth, requireRole(['teacher', 'admin'])];
const adminOnly = [requireAuth, requireRole(['admin'])];

// ─────────────────────────────────────────────────────────────
// GET assignments for student (with submissions)
// ─────────────────────────────────────────────────────────────
router.get('/student', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student's class
    const { data: stData } = await supabase.from('users').select('class_name').eq('id', studentId).single();
    const stClass = stData?.class_name;

    // Get assignments the student has access to
    let query = supabase
      .from('assignments')
      .select(`
        *,
        subjects(id, name, code)
      `)
      .order('deadline', { ascending: true });

    if (stClass) {
      // PostgreSQL array contains syntax for Supabase OR filter
      query = query.or(`target_classes.cs.{${stClass}},target_classes.is.null`);
    } else {
      query = query.is('target_classes', null);
    }

    const { data: assignments, error } = await query;

    if (error) throw error;

    // Fetch this student's submissions (including upload history)
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*, ai_reports(final_score), upload_history')
      .eq('student_id', studentId);
      
    if (subError) throw subError;

    // Merge submissions into assignments
    const enriched = assignments.map(a => {
      const sub = submissions.find(s => s.assignment_id === a.id);
      return { ...a, submission: sub || null };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET all assignments (admin sees all; teacher sees their own)
// ─────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, id } = req.user;

    let query = supabase
      .from('assignments')
      .select(`
        *,
        subjects(id, name, code,
          departments(id, name,
            institutes(id, name)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (role === 'teacher') {
      query = query.eq('created_by', id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET single assignment
// ─────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        subjects(id, name, code,
          departments(id, name, institutes(id, name))
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET assignment stats (submitted vs left)
// ─────────────────────────────────────────────────────────────
router.get('/:id/stats', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('created_by, title, target_classes')
      .eq('id', assignmentId)
      .single();
    
    if (error) throw error;

    let expectedStudents = [];
    
    if (assignment.target_classes && assignment.target_classes.length > 0) {
      // If assignment has explicit target classes, use them
      const { data } = await supabase.from('users')
        .select('id, first_name, last_name, email, class_name, lab_batch, enrollment_number')
        .eq('role', 'student')
        .in('class_name', assignment.target_classes);
      expectedStudents = data || [];
    } else {
      // Fallback: use teacher's primary class
      const { data: tData } = await supabase.from('users').select('class_name, lab_batch').eq('id', assignment.created_by).single();
      if (tData && tData.class_name) {
        let q = supabase.from('users')
          .select('id, first_name, last_name, email, class_name, lab_batch, enrollment_number')
          .eq('role', 'student')
          .eq('class_name', tData.class_name);
        if (tData.lab_batch) q = q.eq('lab_batch', tData.lab_batch);
        const { data } = await q;
        expectedStudents = data || [];
      }
    }

    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        student_id, status, submitted_at,
        users!submissions_student_id_fkey(id, first_name, last_name, email, enrollment_number)
      `)
      .eq('assignment_id', assignmentId);

    const submittedMap = new Map();
    for (const sub of (submissions || [])) {
      if (sub.users) submittedMap.set(sub.student_id, { ...sub.users, submitted_at: sub.submitted_at, status: sub.status });
    }

    const submitted = Array.from(submittedMap.values());
    const left = expectedStudents.filter(s => !submittedMap.has(s.id));

    res.json({
      submitted_count: submitted.length,
      left_count: left.length,
      total_expected: submitted.length + left.length,
      submitted,
      left
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CREATE assignment
// ─────────────────────────────────────────────────────────────
router.post('/', ...teacherOrAdmin, async (req, res) => {
  try {
    const {
      title,
      instructions,
      deadline,
      total_questions,
      question_pdf_url,
      answer_key_pdf_url,
      subject_id,
      max_marks,
      allowed_formats,
      allow_resubmission,
      target_classes
    } = req.body;

    if (!title || !subject_id || !deadline) {
      return res.status(400).json({ error: 'title, subject_id, and deadline are required' });
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert([{
        title,
        instructions: instructions || null,
        deadline,
        total_questions: total_questions || null,
        question_pdf_url: question_pdf_url || null,
        answer_key_pdf_url: answer_key_pdf_url || null,
        subject_id,
        created_by: req.user.id,
        max_marks: max_marks || 100,
        allowed_formats: allowed_formats || ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg'],
        allow_resubmission: allow_resubmission !== undefined ? allow_resubmission : true,
        target_classes: target_classes || null,
      }])
      .select(`
        *,
        subjects(id, name, code, departments(id, name, institutes(id, name)))
      `)
      .single();

    if (error) throw error;

    // Send notifications
    const authorName = req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : 'A teacher';
    notifyStudents(
      'New Assignment Uploaded', 
      `${authorName} uploaded a new assignment: "${title}"`, 
      'info'
    );
    notifyAdmins(
      'New Assignment Created', 
      `${authorName} created a new assignment: "${title}" for subject ID: ${subject_id}`, 
      'info'
    );

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// UPDATE assignment (teacher can only edit their own)
// ─────────────────────────────────────────────────────────────
router.put('/:id', ...teacherOrAdmin, async (req, res) => {
  try {
    const {
      title,
      instructions,
      deadline,
      total_questions,
      question_pdf_url,
      answer_key_pdf_url,
      subject_id,
      max_marks,
      allowed_formats,
      allow_resubmission,
      target_classes,
    } = req.body;

    // Ownership check: teachers can only edit their own assignments
    if (req.user.role === 'teacher') {
      const { data: existing } = await supabase
        .from('assignments')
        .select('created_by')
        .eq('id', req.params.id)
        .single();
      if (!existing || existing.created_by !== req.user.id) {
        return res.status(403).json({ error: 'You can only edit your own assignments.' });
      }
    }

    const updatePayload = {
      title,
      instructions: instructions || null,
      deadline,
      total_questions: total_questions || null,
      question_pdf_url: question_pdf_url || null,
      answer_key_pdf_url: answer_key_pdf_url || null,
      subject_id,
      target_classes: target_classes || null,
    };
    if (max_marks !== undefined) updatePayload.max_marks = max_marks;
    if (allowed_formats !== undefined) updatePayload.allowed_formats = allowed_formats;
    if (allow_resubmission !== undefined) updatePayload.allow_resubmission = allow_resubmission;

    const { data, error } = await supabase
      .from('assignments')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select(`
        *,
        subjects(id, name, code, departments(id, name, institutes(id, name)))
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE assignment (teacher can only delete their own)
// ─────────────────────────────────────────────────────────────
router.delete('/:id', ...teacherOrAdmin, async (req, res) => {
  try {
    // Ownership check: teachers can only delete their own assignments
    if (req.user.role === 'teacher') {
      const { data: existing } = await supabase
        .from('assignments')
        .select('created_by')
        .eq('id', req.params.id)
        .single();
      if (!existing || existing.created_by !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own assignments.' });
      }
    }

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
