const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth } = require('../middleware/auth.middleware');

// GET all notifications for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50); // Get last 50 notifications

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        // Table doesn't exist yet, return empty list gracefully
        return res.json([]);
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('[Notifications GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT mark a single notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Notification PUT read]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT mark all as read for the user
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return res.json([]);
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('[Notification PUT read-all]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a single notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // ensure ownership

    if (error) throw error;
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('[Notification DELETE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
