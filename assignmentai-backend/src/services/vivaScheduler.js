const cron = require('node-cron');
const supabaseAdmin = require('../config/supabaseAdmin');
const socketManager = require('../sockets/socketManager');

// Store which sessions we have already sent the 5-min warning for in memory
const warningSent = new Set();

const checkVivaSessions = async () => {
  try {
    const io = socketManager.getIO();
    const now = new Date();

    // 1. Find sessions that need to be started or ended
    const { data: sessions, error } = await supabaseAdmin
      .from('viva_exam_sessions')
      .select('id, status, scheduled_at, duration_minutes, title, teacher_id')
      .in('status', ['scheduled', 'live'])
      .not('scheduled_at', 'is', null);

    if (error) {
      console.error('[Viva Scheduler] Error fetching sessions:', error.message);
      return;
    }

    const updateLegacyStatus = async (session, newStatus) => {
      try {
        const { data: templates } = await supabaseAdmin
          .from('viva_sessions')
          .select('id, transcript')
          .eq('teacher_id', session.teacher_id)
          .is('submission_id', null);

        if (templates) {
          for (const t of templates) {
            try {
              const meta = JSON.parse(t.transcript || '{}');
              if (meta.title === session.title && !meta._parent_session_id) {
                await supabaseAdmin.from('viva_sessions').update({ status: newStatus }).eq('id', t.id);
                if (newStatus === 'live') {
                  io.to(t.id).emit('viva_status_changed', { status: 'live' });
                } else if (newStatus === 'completed') {
                  io.to(t.id).emit('viva_ended', { message: 'The exam time has concluded.' });
                }
              }
            } catch(e) {}
          }
        }
      } catch(e) {
        console.error('[Viva Scheduler] Failed to sync legacy status', e.message);
      }
    };

    for (const session of sessions) {
      const scheduledAt = new Date(session.scheduled_at);
      const endTime = new Date(scheduledAt.getTime() + (session.duration_minutes * 60000));
      const remainingMs = endTime.getTime() - now.getTime();

      // CASE A: Scheduled -> Live
      if (session.status === 'scheduled' && now >= scheduledAt && now < endTime) {
        console.log(`[Viva Scheduler] Starting session ${session.title}`);
        await supabaseAdmin.from('viva_exam_sessions').update({ status: 'live' }).eq('id', session.id);
        io.to(session.id).emit('viva_status_changed', { status: 'live' });
        await updateLegacyStatus(session, 'live');
      }

      // CASE B: Live -> 5 min Warning
      if (session.status === 'live' && remainingMs > 0 && remainingMs <= 5 * 60000) {
        if (!warningSent.has(session.id)) {
          console.log(`[Viva Scheduler] 5 min warning for ${session.title}`);
          io.to(session.id).emit('viva_ending_soon', { minutes: 5 });
          warningSent.add(session.id);
        }
      }

      // CASE C: Live/Scheduled -> Ended
      if (now >= endTime) {
        console.log(`[Viva Scheduler] Ending session ${session.title}`);
        await supabaseAdmin.from('viva_exam_sessions').update({ status: 'ended' }).eq('id', session.id);
        io.to(session.id).emit('viva_ended', { message: 'The exam time has concluded.' });
        warningSent.delete(session.id); // clean up memory
        await updateLegacyStatus(session, 'completed');
      }
    }
  } catch (err) {
    console.error('[Viva Scheduler] Cron job failed:', err.message);
  }
};

const initScheduler = () => {
  // Run every minute at the 0th second
  cron.schedule('* * * * *', checkVivaSessions);
  console.log('[Viva Scheduler] Initialized (running every minute).');
};

module.exports = {
  initScheduler
};
