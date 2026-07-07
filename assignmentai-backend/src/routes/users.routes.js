const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const bcrypt = require('bcrypt');

const adminOnly = [requireAuth, requireRole(['admin'])];

// ─────────────────────────────────────────────────────────────
// GET all users (teachers + students)
// ─────────────────────────────────────────────────────────────
router.get('/', ...adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    let query = supabase
      .from('users')
      .select('id, name, email, role, department_id, created_at, departments(name, code)')
      .order('created_at', { ascending: false });

    if (role && role !== 'all') {
      query = query.eq('role', role);
    } else {
      query = query.in('role', ['teacher', 'student']);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CREATE a single user
// ─────────────────────────────────────────────────────────────
router.post('/', ...adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, department_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher or student' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password_hash, role, department_id: department_id || null }])
      .select('id, name, email, role, department_id, created_at, departments(name, code)')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// UPDATE a user
// ─────────────────────────────────────────────────────────────
router.put('/:id', ...adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, department_id } = req.body;
    const updates = { name, email, role, department_id: department_id || null };

    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, name, email, role, department_id, created_at, departments(name, code)')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE a user
// ─────────────────────────────────────────────────────────────
router.delete('/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// BULK UPLOAD users via CSV payload
// ─────────────────────────────────────────────────────────────
router.post('/bulk', ...adminOnly, async (req, res) => {
  try {
    const { role, users } = req.body;

    if (!role || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'role and users array are required' });
    }
    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher or student' });
    }

    const success = [];
    const failed  = [];

    for (const user of users) {
      try {
        if (!user.name || !user.email || !user.password) {
          failed.push({ email: user.email || '?', error: 'Missing name, email, or password' });
          continue;
        }

        const password_hash = await bcrypt.hash(user.password, 10);

        const { data, error } = await supabase
          .from('users')
          .insert([{
            name: user.name,
            email: user.email,
            password_hash,
            role,
            department_id: user.department_id || null,
          }])
          .select('id, name, email, role')
          .single();

        if (error) {
          failed.push({ email: user.email, error: error.message });
        } else {
          success.push(data);
        }
      } catch (e) {
        failed.push({ email: user.email || '?', error: e.message });
      }
    }

    res.json({ success, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
