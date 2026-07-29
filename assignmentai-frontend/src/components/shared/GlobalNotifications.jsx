import { useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useToast } from './Toast';

export default function GlobalNotifications() {
  const { socket } = useSocket();
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;

    const handleGradingComplete = (data) => {
      toast({
        type: 'success',
        title: 'Grading Complete',
        message: data.message || `AI Grading finished with a score of ${data.score}.`
      });
    };

    const handleRequestUpdated = (data) => {
      toast({
        type: data.status === 'approved' ? 'success' : 'info',
        title: 'Request Update',
        message: data.message || `Your request is now ${data.status}.`
      });
    };

    const handleNewSubmission = (data) => {
      toast({
        type: 'info',
        title: 'New Submission',
        message: data.message || `${data.student_name} submitted ${data.assignment_title}.`
      });
    };

    socket.on('grading_complete', handleGradingComplete);
    socket.on('request_updated', handleRequestUpdated);
    socket.on('new_submission', handleNewSubmission);

    return () => {
      socket.off('grading_complete', handleGradingComplete);
      socket.off('request_updated', handleRequestUpdated);
      socket.off('new_submission', handleNewSubmission);
    };
  }, [socket, toast]);

  // This component doesn't render any UI itself.
  return null;
}
