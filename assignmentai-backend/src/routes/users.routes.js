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
      .select('id, first_name, last_name, email, role, department_id, created_at, departments(name, code)')
      .order('created_at', { ascending: false });

    if (role && role !== 'all') {
      query = query.eq('role', role);
    } else {
      query = query.in('role', ['teacher', 'student']);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Normalise: add a virtual `name` field for frontend compatibility
    const normalised = (data || []).map(u => ({
      ...u,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    }));

    res.json(normalised);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CREATE a single user
// ─────────────────────────────────────────────────────────────
router.post('/', ...adminOnly, async (req, res) => {
  try {
    const { name, first_name, last_name, email, password, role, department_id } = req.body;

    // Accept either `name` (split on first space) or `first_name`/`last_name`
    let fName = first_name || '';
    let lName = last_name  || '';
    if (!fName && name) {
      const parts = name.trim().split(' ');
      fName = parts[0];
      lName = parts.slice(1).join(' ');
    }

    if (!fName || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher or student' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ first_name: fName, last_name: lName, email, password_hash, role, department_id: department_id || null }])
      .select('id, first_name, last_name, email, role, department_id, created_at, departments(name, code)')
      .single();

    if (error) throw error;

    res.status(201).json({
      ...data,
      name: [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// UPDATE a user
// ─────────────────────────────────────────────────────────────
router.put('/:id', ...adminOnly, async (req, res) => {
  try {
    const { name, first_name, last_name, email, password, role, department_id } = req.body;

    // Accept either `name` or `first_name`/`last_name`
    let fName = first_name || '';
    let lName = last_name  || '';
    if (!fName && name) {
      const parts = name.trim().split(' ');
      fName = parts[0];
      lName = parts.slice(1).join(' ');
    }

    const updates = {
      ...(fName && { first_name: fName }),
      ...(lName !== undefined && { last_name: lName }),
      email,
      role,
      department_id: department_id || null,
    };

    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, first_name, last_name, email, role, department_id, created_at, departments(name, code)')
      .single();

    if (error) throw error;

    res.json({
      ...data,
      name: [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email,
    });
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

    // Pre-load all departments once — avoid one DB round-trip per row
    const { data: allDepts } = await supabase
      .from('departments')
      .select('id, code');
    const deptByCode = {};
    (allDepts || []).forEach(d => { deptByCode[d.code.toUpperCase()] = d.id; });

    const success = [];
    const failed  = [];

    for (const user of users) {
      try {
        if (!user.name || !user.email || !user.password) {
          failed.push({ email: user.email || '?', error: 'Missing name, email, or password' });
          continue;
        }

        const parts = (user.name || '').trim().split(' ');
        const fName = parts[0];
        const lName = parts.slice(1).join(' ');

        const password_hash = await bcrypt.hash(user.password, 10);

        // ── Resolve department_code → department_id ───────────────────────
        let department_id = null;
        const inputVal = (user.department_code || user.dept_code || user.department_id || '').trim();

        if (inputVal) {
          // Check if it's a valid UUID
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inputVal);
          
          if (isUUID) {
            department_id = inputVal;
          } else {
            // Treat as department code, even if they filled out the legacy 'department_id' column
            const deptCode = inputVal.toUpperCase();
            if (!deptByCode[deptCode]) {
              failed.push({ email: user.email, error: `Department code '${deptCode}' not found. Check the code or create the department first.` });
              continue;
            }
            department_id = deptByCode[deptCode];
          }
        }

        const { data, error } = await supabase
          .from('users')
          .insert([{
            first_name: fName,
            last_name:  lName,
            email:      user.email,
            password_hash,
            role,
            department_id,
          }])
          .select('id, first_name, last_name, email, role')
          .single();

        if (error) {
          failed.push({ email: user.email, error: error.message });
        } else {
          success.push({
            ...data,
            name: [data.first_name, data.last_name].filter(Boolean).join(' '),
          });
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

