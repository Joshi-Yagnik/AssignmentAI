const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const adminOnly = [requireAuth, requireRole(['admin'])];

// ─────────────────────────────────────────────────────────────
// INSTITUTES
// ─────────────────────────────────────────────────────────────
router.get('/institutes', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutes')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/institutes', ...adminOnly, async (req, res) => {
  try {
    const { name, code, address, logo_url } = req.body;
    const { data, error } = await supabase
      .from('institutes')
      .insert([{ name, code, address, logo_url }])
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/institutes/:id', ...adminOnly, async (req, res) => {
  try {
    const { name, code, address, logo_url, is_active } = req.body;
    const { data, error } = await supabase
      .from('institutes')
      .update({ name, code, address, logo_url, is_active })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/institutes/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('institutes')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Institute deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────
router.get('/departments', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*, institutes(name, code)')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/departments', ...adminOnly, async (req, res) => {
  try {
    const { institute_id, name, code } = req.body;
    const { data, error } = await supabase
      .from('departments')
      .insert([{ institute_id, name, code }])
      .select('*, institutes(name, code)').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/departments/:id', ...adminOnly, async (req, res) => {
  try {
    const { institute_id, name, code, is_active } = req.body;
    const { data, error } = await supabase
      .from('departments')
      .update({ institute_id, name, code, is_active })
      .eq('id', req.params.id)
      .select('*, institutes(name, code)').single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/departments/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Department deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────
router.get('/subjects', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, departments(name, code, institutes(name))')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects', ...adminOnly, async (req, res) => {
  try {
    const { department_id, name, code, credits, description } = req.body;
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ department_id, name, code, credits, description }])
      .select('*, departments(name, code, institutes(name))').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/subjects/:id', ...adminOnly, async (req, res) => {
  try {
    const { department_id, name, code, credits, description, is_active } = req.body;
    const { data, error } = await supabase
      .from('subjects')
      .update({ department_id, name, code, credits, description, is_active })
      .eq('id', req.params.id)
      .select('*, departments(name, code, institutes(name))').single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/subjects/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Subject deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
