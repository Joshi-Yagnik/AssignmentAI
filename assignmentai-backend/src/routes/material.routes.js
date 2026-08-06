const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const teacherOnly = [requireAuth, requireRole(['teacher'])];

// ─────────────────────────────────────────────────────────────
// POST /api/materials (Teacher only)
// ─────────────────────────────────────────────────────────────
router.post('/', ...teacherOnly, async (req, res) => {
  try {
    const { title, description, file_url, file_type, file_size, subject_id } = req.body;

    if (!title || !file_url || !subject_id || !file_type) {
      return res.status(400).json({ error: 'title, file_url, file_type and subject_id are required' });
    }

    const { data, error } = await supabase
      .from('study_materials')
      .insert([{
        title,
        description: description || null,
        file_url,
        file_type,
        file_size: file_size || 0,
        subject_id,
        created_by: req.user.id,
      }])
      .select(`
        *,
        subjects(id, name, code)
      `)
      .single();

    if (error) throw error;

    // Emit real-time event to all connected clients
    // (In a more complex app, we would emit to a specific room like 'subject_SUBJECT_ID')
    const io = req.app.get('io');
    if (io) {
      io.emit('new_study_material', data);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[Create Material Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/materials (Student & Teacher)
// ─────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, id } = req.user;

    let query = supabase
      .from('study_materials')
      .select(`
        *,
        subjects(id, name, code),
        users(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    // If teacher, only show materials they created.
    // If student, we could filter by enrolled subjects, but for simplicity
    // we fetch all active materials. Filtering by enrolled subjects can be 
    // done here or on the frontend.
    if (role === 'teacher') {
      query = query.eq('created_by', id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('[Get Materials Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/materials/:id (Teacher only)
// ─────────────────────────────────────────────────────────────
router.delete('/:id', ...teacherOnly, async (req, res) => {
  try {
    // Ownership check
    const { data: existing } = await supabase
      .from('study_materials')
      .select('created_by')
      .eq('id', req.params.id)
      .single();

    if (!existing || existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own study materials.' });
    }

    const { error } = await supabase
      .from('study_materials')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Study material deleted' });
  } catch (err) {
    console.error('[Delete Material Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
