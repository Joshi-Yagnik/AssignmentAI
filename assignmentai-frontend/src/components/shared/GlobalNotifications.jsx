import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useToast } from './Toast';
import { getNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';
import NotificationPanel from './NotificationPanel';

export default function GlobalNotifications() {
  const { socket } = useSocket();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn('Failed to load persistent notifications list:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Listen to toggle event from TopBar or Sidebar
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => {
        if (!prev) fetchList(); // refresh when opening
        return !prev;
      });
    };

    window.addEventListener('aaai:toggle-notifications', handleToggle);
    return () => window.removeEventListener('aaai:toggle-notifications', handleToggle);
  }, [fetchList]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (item) => {
      setNotifications(prev => [item, ...prev]);
      toast({
        type: item.type || 'info',
        title: item.title || 'New Notification',
        message: item.message
      });
    };

    const handleGradingComplete = (data) => {
      const newNotif = {
        id: `socket-${Date.now()}`,
        title: 'Grading Complete',
        message: data.message || `AI Grading finished with a score of ${data.score}.`,
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      toast({
        type: 'success',
        title: newNotif.title,
        message: newNotif.message
      });
    };

    const handleRequestUpdated = (data) => {
      const newNotif = {
        id: `socket-${Date.now()}`,
        title: 'Request Update',
        message: data.message || `Your request is now ${data.status}.`,
        type: data.status === 'approved' ? 'success' : 'info',
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      toast({
        type: newNotif.type,
        title: newNotif.title,
        message: newNotif.message
      });
    };

    const handleNewSubmission = (data) => {
      const newNotif = {
        id: `socket-${Date.now()}`,
        title: 'New Submission',
        message: data.message || `${data.student_name} submitted ${data.assignment_title}.`,
        type: 'info',
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      toast({
        type: 'info',
        title: newNotif.title,
        message: newNotif.message
      });
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('grading_complete', handleGradingComplete);
    socket.on('request_updated', handleRequestUpdated);
    socket.on('new_submission', handleNewSubmission);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('grading_complete', handleGradingComplete);
      socket.off('request_updated', handleRequestUpdated);
      socket.off('new_submission', handleNewSubmission);
    };
  }, [socket, toast]);

  const handleMarkAsRead = async (id) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      if (!String(id).startsWith('socket-')) {
        await markAsRead(id);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
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

  return (
    <NotificationPanel
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      loading={loading}
    />
  );
}
