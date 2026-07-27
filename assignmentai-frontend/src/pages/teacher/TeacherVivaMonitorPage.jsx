import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import { Users, AlertTriangle, VideoOff, MessageSquare, Clock } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
  : 'http://localhost:5000';

export default function TeacherVivaMonitorPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [session, setSession] = useState(null);
  // keyed by socketId (unique per student)
  const [activeStudents, setActiveStudents] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/viva/sessions/${sessionId}`)
      .then(({ data }) => setSession(data))
      .catch(() => navigate('/teacher/viva'));
  }, [sessionId, navigate]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    // Teacher joins the session room to receive all student events
    socketRef.current.emit('join_viva', { sessionId, role: 'teacher' });

    // A new student connected to the room
    socketRef.current.on('student_joined', (data) => {
      setActiveStudents(prev => ({
        ...prev,
        [data.socketId]: {
          socketId: data.socketId,
          name: data.studentName || `Student (${data.socketId.slice(0, 6)})`,
          transcript: 'Waiting for student to speak...',
          warnings: 0,
          violations: [],
          joinedAt: new Date(data.joinedAt),
          lastActive: new Date(),
        }
      }));
      toast({ type: 'info', title: 'Student Joined', message: `${data.studentName || 'A student'} has joined the session.` });
    });

    // Live transcript update — keyed by socketId
    socketRef.current.on('teacher_transcript_live', (data) => {
      const key = data.socketId || data.sessionId;
      setActiveStudents(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          socketId: key,
          name: data.studentName || prev[key]?.name || `Student (${key.slice(0, 6)})`,
          transcript: data.transcript,
          lastActive: new Date(),
        }
      }));
    });

    // Security warning — keyed by socketId
    socketRef.current.on('teacher_viva_warning', (data) => {
      const key = data.socketId || data.sessionId;
      setActiveStudents(prev => {
        const student = prev[key] || { name: data.studentName || 'Unknown', warnings: 0, violations: [], transcript: '' };
        return {
          ...prev,
          [key]: { 
            ...student, 
            socketId: key,
            warnings: (student.warnings || 0) + 1,
            violations: [...(student.violations || []), data.type],
            lastActive: new Date(),
          }
        };
      });
      toast({ type: 'warning', title: 'Security Alert', message: `${data.studentName || 'A student'}: ${data.type} detected` });
    });

    // Student ended their exam
    socketRef.current.on('teacher_viva_ended', (data) => {
      const key = data.socketId || data.sessionId;
      setActiveStudents(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          socketId: key,
          status: 'ended',
          name: data.studentName || prev[key]?.name || 'Student',
        }
      }));
      toast({ type: 'info', title: 'Student Finished', message: `${data.studentName || 'A student'} has ended their session.` });
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
  const studentsList = Object.values(activeStudents);
  const connectedCount = studentsList.filter(s => s.status !== 'ended').length;

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
              <Users className="w-4 h-4" /> {connectedCount} Connected
            </span>
          </div>
          <button onClick={handleEndSession} className="btn-primary bg-danger border-none hover:bg-danger/90 flex items-center gap-2">
            <VideoOff className="w-4 h-4" /> End Session For All
          </button>
        </div>

        {studentsList.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-ink-muted/30 mb-4" />
            <p className="text-ink-secondary font-semibold">Waiting for students to join...</p>
            <p className="text-label-sm text-ink-muted mt-1">Students will appear here once they join the session.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {studentsList.map((st, i) => (
              <div key={st.socketId || i} className={`card flex flex-col gap-4 border-2 ${st.status === 'ended' ? 'border-surface-high opacity-60' : 'border-primary/20'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {(st.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-ink-primary text-sm">{st.name || `Student ${i + 1}`}</h4>
                      <span className={`text-xs ${st.status === 'ended' ? 'text-ink-muted' : 'text-success font-medium'}`}>
                        {st.status === 'ended' ? 'Finished' : 'Active'}
                      </span>
                    </div>
                  </div>
                  {st.warnings > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-warning-text bg-warning/10 px-2 py-1 rounded-md">
                      <AlertTriangle className="w-3 h-3" /> {st.warnings} Violations
                    </span>
                  )}
                </div>
                
                {st.violations && st.violations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {st.violations.map((v, vi) => (
                      <span key={vi} className="text-xs px-2 py-0.5 bg-danger/10 text-danger rounded-full">{v}</span>
                    ))}
                  </div>
                )}

                <div className="bg-surface-low rounded-lg p-3 flex-1 min-h-[150px] border border-border">
                  <p className="text-xs font-semibold text-ink-muted mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5" /> Live Transcript
                  </p>
                  <p className="text-sm text-ink-primary italic leading-relaxed">
                    {st.transcript || 'Waiting for student to speak...'}
                  </p>
                </div>

                {st.lastActive && (
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last active: {new Date(st.lastActive).toLocaleTimeString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
