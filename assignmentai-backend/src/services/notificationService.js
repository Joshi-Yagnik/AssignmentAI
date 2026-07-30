const supabase = require('../config/supabaseClient');
const { getIo } = require('../socket');

/**
 * Create a notification in the database and optionally emit a real-time event.
 * @param {string} userId - UUID of the user receiving the notification
 * @param {string} title - Title of the notification
 * @param {string} message - Detailed message
 * @param {string} type - 'info', 'success', 'warning', 'error'
 */
async function createNotification(userId, title, message, type = 'info') {
  try {
    // 1. Insert into database
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ user_id: userId, title, message, type }])
      .select()
      .single();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        // Notifications table doesn't exist yet, just skip DB save
        console.warn('Notifications table missing, skipping DB insert.');
      } else {
        console.error('Failed to save notification:', error);
      }
    }

    const notificationPayload = data || {
      id: `temp-${Date.now()}`,
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString()
    };

    // 2. Emit real-time socket event
    const io = getIo();
    if (io) {
      // Assuming users join a room with their userId
      io.to(userId).emit('new_notification', notificationPayload);
    }

    return notificationPayload;
  } catch (err) {
    console.error('Notification Service Error:', err);
  }
}

module.exports = {
  createNotification
};
