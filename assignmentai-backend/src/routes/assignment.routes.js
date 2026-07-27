const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const teacherOrAdmin = [requireAuth, requireRole(['teacher', 'admin'])];
const adminOnly = [requireAuth, requireRole(['admin'])];

// ─────────────────────────────────────────────────────────────
// GET assignments for student (with submissions)
// ─────────────────────────────────────────────────────────────
router.get('/student', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    // Get assignments the student has access to (for now, all active assignments, or joined by course)
    // Here we fetch all assignments and left join submissions for this student
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select(`
        *,
        subjects(id, name, code)
      `)
      .order('deadline', { ascending: true });

    if (error) throw error;

    // Fetch this student's submissions
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*, ai_reports(final_score)')
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
      }])
      .select(`
        *,
        subjects(id, name, code, departments(id, name, institutes(id, name)))
      `)
      .single();

    if (error) throw error;
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

    const { data, error } = await supabase
      .from('assignments')
      .update({
        title,
        instructions: instructions || null,
        deadline,
        total_questions: total_questions || null,
        question_pdf_url: question_pdf_url || null,
        answer_key_pdf_url: answer_key_pdf_url || null,
        subject_id,
      })
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
