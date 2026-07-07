import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import { Users, AlertTriangle, VideoOff, MessageSquare } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
  : 'http://localhost:5000';

export default function TeacherVivaMonitorPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [session, setSession] = useState(null);
  const [activeStudents, setActiveStudents] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/viva/sessions/${sessionId}`).then(({ data }) => setSession(data)).catch(() => navigate('/teacher/viva'));
  }, [sessionId, navigate]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_viva', { sessionId });

    socketRef.current.on('teacher_transcript_live', (data) => {
      setActiveStudents(prev => ({
        ...prev,
        [data.sessionId]: { ...prev[data.sessionId], transcript: data.transcript, lastActive: new Date() }
      }));
    });

    socketRef.current.on('teacher_viva_warning', (data) => {
      setActiveStudents(prev => {
        const student = prev[data.sessionId] || { warnings: 0, violations: [] };
        return {
          ...prev,
          [data.sessionId]: { 
            ...student, 
            warnings: (student.warnings || 0) + 1,
            violations: [...(student.violations || []), data.type]
          }
        };
      });
      toast({ type: 'warning', title: 'Security Alert', message: `Violation detected: ${data.type}` });
    });

    socketRef.current.on('teacher_viva_ended', (data) => {
       toast({ type: 'info', title: 'Student finished', message: 'A student has ended their session.' });
    });

    return () => socketRef.current.disconnect();
  }, [sessionId, toast]);

  const handleEndSession = async () => {
    if (!window.confirm("End this session for ALL students?")) return;
    try {
      await api.patch(`/viva/sessions/${sessionId}/status`, { status: 'ended' });
      toast({ type: 'success', title: 'Session Ended' });
      navigate('/teacher/viva');
    } catch {
      toast({ type: 'error', title: 'Failed to end session' });
    }
  };

  const meta = session ? JSON.parse(session.transcript || '{}') : {};
  // For demo, we just show a mock student if no one is connected, or the actual data
  const studentsList = Object.keys(activeStudents).length > 0 
    ? Object.values(activeStudents) 
    : [{ transcript: "Waiting for student to speak...", warnings: 0, violations: [] }];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TopBar title="Live Monitor" subtitle={meta.title || "Loading..."} />
      
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 text-danger rounded-lg font-bold text-sm">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" /> LIVE
            </span>
            <span className="text-ink-muted flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" /> {Object.keys(activeStudents).length} Connected
            </span>
          </div>
          <button onClick={handleEndSession} className="btn-primary bg-danger border-none hover:bg-danger/90 flex items-center gap-2">
            <VideoOff className="w-4 h-4" /> End Session For All
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {studentsList.map((st, i) => (
            <div key={i} className="card flex flex-col gap-4 border-2 border-primary/20">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    S{i+1}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-primary">Student {i+1}</h4>
                    <span className="text-xs text-ink-muted">Connected</span>
                  </div>
                </div>
                {st.warnings > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-warning-text bg-warning/10 px-2 py-1 rounded-md">
                    <AlertTriangle className="w-3 h-3" /> {st.warnings} Violations
                  </span>
                )}
              </div>
              
              <div className="bg-surface-low rounded-lg p-3 flex-1 min-h-[150px] border border-border">
                <p className="text-xs font-semibold text-ink-muted mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5" /> Live Transcript
                </p>
                <p className="text-sm text-ink-primary italic">{st.transcript}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
