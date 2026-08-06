import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useToast } from './Toast';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification
} from '../../services/notificationService';
import NotificationPanel from './NotificationPanel';

export default function GlobalNotifications() {
  const { socket } = useSocket();
  const toast = useToast();

  const [isOpen, setIsOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(false);

  // ── Fetch from API ──────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Broadcast unread count so TopBar badge stays in sync ───────────────────
  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    window.dispatchEvent(new CustomEvent('aaai:unread-count', { detail: unread }));
  }, [notifications]);

  // ── Toggle panel from TopBar bell ──────────────────────────────────────────
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => {
        if (!prev) fetchList(); // refresh on open
        return !prev;
      });
    };
    window.addEventListener('aaai:toggle-notifications', handleToggle);
    return () => window.removeEventListener('aaai:toggle-notifications', handleToggle);
  }, [fetchList]);

  // ── Real-time socket events ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const push = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      toast({ type: notif.type || 'info', title: notif.title, message: notif.message });
    };

    const handleNew = (item) => push({
      id: item.id || `socket-${Date.now()}`,
      title: item.title || 'New Notification',
      message: item.message,
      type: item.type || 'info',
      is_read: false,
      created_at: item.created_at || new Date().toISOString(),
    });

    const handleGrading = (data) => push({
      id: `socket-${Date.now()}`,
      title: 'Grading Complete',
      message: data.message || `AI grading finished with a score of ${data.score}.`,
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    const handleRequest = (data) => push({
      id: `socket-${Date.now()}`,
      title: 'Request Update',
      message: data.message || `Your request is now ${data.status}.`,
      type: data.status === 'approved' ? 'success' : data.status === 'rejected' ? 'error' : 'info',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    const handleSubmission = (data) => push({
      id: `socket-${Date.now()}`,
      title: 'New Submission',
      message: data.message || `${data.student_name} submitted ${data.assignment_title}.`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    const handleVivaAlert = (data) => push({
      id: `socket-${Date.now()}`,
      title: 'Viva Alert',
      message: data.message || 'A viva session event occurred.',
      type: 'warning',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    socket.on('new_notification', handleNew);
    socket.on('grading_complete', handleGrading);
    socket.on('request_updated', handleRequest);
    socket.on('new_submission', handleSubmission);
    socket.on('viva_alert', handleVivaAlert);

    return () => {
      socket.off('new_notification', handleNew);
      socket.off('grading_complete', handleGrading);
      socket.off('request_updated', handleRequest);
      socket.off('new_submission', handleSubmission);
      socket.off('viva_alert', handleVivaAlert);
    };
  }, [socket, toast]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleMarkAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      if (!String(id).startsWith('socket-')) await markAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id) => {
    // Optimistic remove
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      if (!String(id).startsWith('socket-')) await deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchList(); // re-sync if delete failed
    }
  };

  return (
    <NotificationPanel
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onDelete={handleDelete}
      loading={loading}
    />
  );
}
