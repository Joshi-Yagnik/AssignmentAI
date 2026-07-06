const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// GET all assignments (for a class, student, or teacher)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = supabase.from('assignments').select('*, classes(name, subject_id)');

    // Very basic RBAC filtering. In a real app, join with student_classes table.
    if (role === 'teacher') {
      query = query.eq('classes.teacher_id', id);
    }
    // If student, you'd filter by the classes they are enrolled in.

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single assignment
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
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

// CREATE assignment (Teachers only)
router.post('/', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { class_id, title, description, max_marks, deadline, grading_mode, ai_strictness } = req.body;
    
    const { data, error } = await supabase
      .from('assignments')
      .insert([{ class_id, title, description, max_marks, deadline, grading_mode, ai_strictness }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE assignment
router.put('/:id', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .update(req.body)
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

// DELETE assignment
router.delete('/:id', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
