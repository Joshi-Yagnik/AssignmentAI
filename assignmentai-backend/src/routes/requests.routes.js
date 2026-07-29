const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabaseAdmin');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const socketManager = require('../sockets/socketManager');

// ─────────────────────────────────────────────────────────────────────────────
// GET /requests — fetch requests based on role
//   Teacher/Admin: all requests (for assignments they own)
//   Student: only their own
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    let query = supabaseAdmin
      .from('student_requests')
      .select(`
        id, type, reason, priority, status, teacher_comment,
        new_deadline, created_at, updated_at,
        student_id, teacher_id, assignment_id, submission_id,
        users!student_requests_student_id_fkey(first_name, last_name, email),
        assignments(id, title, deadline, max_marks)
      `)
      .order('created_at', { ascending: false });

    if (role === 'student') {
      query = query.eq('student_id', userId);
    }
    // teachers/admin see all (frontend filters by their assignments)

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Requests GET /]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /requests/stats — summary counts for the teacher dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('student_requests')
      .select('status, priority');

    if (error) throw error;

    const rows = data || [];
    const stats = {
      total:            rows.length,
      pending:          rows.filter(r => r.status === 'pending').length,
      approved:         rows.filter(r => r.status === 'approved').length,
      rejected:         rows.filter(r => r.status === 'rejected').length,
      info_requested:   rows.filter(r => r.status === 'info_requested').length,
      high_priority:    rows.filter(r => r.priority === 'high').length,
    };
    res.json(stats);
  } catch (err) {
    console.error('[Requests GET /stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /requests — student submits a new request
// Body: { type, reason, priority, assignment_id?, submission_id?, new_deadline? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { type, reason, priority, assignment_id, submission_id, new_deadline } = req.body;
    const student_id = req.user.id;

    if (!type || !reason) {
      return res.status(400).json({ error: 'type and reason are required.' });
    }

    // Resolve teacher_id from assignment if provided
    let teacher_id = null;
    if (assignment_id) {
      const { data: asgn } = await supabaseAdmin
        .from('assignments')
        .select('created_by')
        .eq('id', assignment_id)
        .single();
      teacher_id = asgn?.created_by || null;
    }

    const { data, error } = await supabaseAdmin
      .from('student_requests')
      .insert([{
        student_id,
        teacher_id,
        type,
        reason,
        priority: priority || 'medium',
        assignment_id: assignment_id || null,
        submission_id: submission_id || null,
        new_deadline: new_deadline || null,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) throw error;

    // Emit socket event so teachers see it in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('request:new', data);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[Requests POST /]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /requests/:id — teacher/admin updates status + optional comment
// Body: { status, teacher_comment?, new_deadline? }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { status, teacher_comment, new_deadline } = req.body;
    const { id } = req.params;

    const validStatuses = ['pending', 'approved', 'rejected', 'info_requested'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updatePayload = {};
    if (status)           updatePayload.status = status;
    if (teacher_comment !== undefined) updatePayload.teacher_comment = teacher_comment;
    if (new_deadline)     updatePayload.new_deadline = new_deadline;

    const { data, error } = await supabaseAdmin
      .from('student_requests')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id, type, reason, priority, status, teacher_comment,
        new_deadline, created_at, updated_at,
        student_id, teacher_id, assignment_id, submission_id,
        users!student_requests_student_id_fkey(first_name, last_name, email),
        assignments(id, title, deadline, max_marks)
      `)
      .single();

    if (error) throw error;

    // If it's a deadline extension that was approved, update the assignment deadline
    if (status === 'approved' && data.type === 'deadline_extension' && new_deadline && data.assignment_id) {
      await supabaseAdmin
        .from('assignments')
        .update({ deadline: new_deadline })
        .eq('id', data.assignment_id);
    }

    // Emit real-time update to relevant student
    try {
      const io = socketManager.getIO();
      if (data && data.student_id) {
        io.to(`user_${data.student_id}`).emit('request_updated', {
          request_id: data.id,
          status: data.status,
          message: `Your request for ${data.type} has been ${data.status}.`
        });
      }
    } catch (err) {
      console.error('[Socket] Failed to emit request_updated:', err.message);
    }

    res.json(data);
  } catch (err) {
    console.error('[Requests PATCH /:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /requests/:id — student can retract a pending request
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership check: only the student who made the request can delete it
    const { data: req_row } = await supabaseAdmin
      .from('student_requests')
      .select('student_id, status')
      .eq('id', id)
      .single();

    if (!req_row || req_row.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed.' });
    }
    if (req_row.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be retracted.' });
    }

    const { error } = await supabaseAdmin
      .from('student_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Requests DELETE /:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
