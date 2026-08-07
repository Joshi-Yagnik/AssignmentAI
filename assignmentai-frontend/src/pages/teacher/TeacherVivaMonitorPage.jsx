import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import { Users, AlertTriangle, VideoOff, MessageSquare, Clock, Edit2 } from 'lucide-react';

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

  const [editingReport, setEditingReport] = useState(null); // { studentId, dbId, reportData }

  useEffect(() => {
    // 1. Fetch master session
    api.get(`/viva/sessions/${sessionId}`)
      .then(({ data }) => setSession(data))
      .catch(() => navigate('/teacher/viva'));

    // 2. Fetch all historical student rows
    api.get(`/viva/sessions/${sessionId}/students`)
      .then(({ data }) => {
        if (!data || !Array.isArray(data)) return;
        setActiveStudents(prev => {
          const next = { ...prev };
          data.forEach(stRow => {
            const key = stRow.id; 
            if (!next[key]) {
              next[key] = {
                socketId: key,
                dbId: stRow.id,
                name: stRow.users?.first_name ? `${stRow.users.first_name} ${stRow.users.last_name}` : 'Unknown',
                transcript: '[]', // historical transcripts are not strictly saved here in full array in standard format, but wait, are they? Actually, they aren't saved in the same format unless it's in the AI report.
                warnings: stRow.warnings_count || 0,
                status: stRow.status,
                ai_report: stRow.ai_report,
                lastActive: stRow.scheduled_time
              };
            }
          });
          return next;
        });
      })
      .catch(console.error);
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

      // Live transcript update (submitted answers) — keyed by socketId
      socketRef.current.on('teacher_transcript_live', (data) => {
        const key = data.socketId || data.sessionId;
        setActiveStudents(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            socketId: key,
            name: data.studentName || prev[key]?.name || `Student (${key.slice(0, 6)})`,
            transcript: data.transcript,
            liveDraft: '', // clear draft on submit
            lastActive: new Date(),
          }
        }));
      });
  
      // Live draft update (typing/speaking) — keyed by socketId
      socketRef.current.on('teacher_transcript_live_draft', (data) => {
        const key = data.socketId || data.sessionId;
        setActiveStudents(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            socketId: key,
            name: data.studentName || prev[key]?.name || `Student (${key.slice(0, 6)})`,
            liveDraft: data.draft,
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

    // AI grade arrived — update student card instantly
    socketRef.current.on('student_viva_graded', (data) => {
      setActiveStudents(prev => {
        // Find by studentId or sessionId
        const key = Object.keys(prev).find(k =>
          prev[k].studentId === data.studentId || k === data.sessionId
        ) || data.sessionId;
        return {
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            socketId: key,
            name: data.studentName || prev[key]?.name || 'Student',
            status: 'graded',
            aiScore: data.aiScore,
            maxScore: data.maxScore,
          }
        };
      });
      toast({
        type: 'success',
        title: '🎯 AI Grade Ready',
        message: `${data.studentName} scored ${data.aiScore}/${data.maxScore}`
      });
    });

    // TA submitted a score — show it on student card
    socketRef.current.on('ta_score_submitted', (data) => {
      setActiveStudents(prev => {
        const key = Object.keys(prev).find(k =>
          prev[k].studentId === data.studentId || k === data.sessionId
        ) || data.sessionId;
        return {
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            socketId: key,
            name: data.studentName || prev[key]?.name || 'Student',
            taScore: data.taScore,
          }
        };
      });
      toast({
        type: 'info',
        title: '📝 TA Score Submitted',
        message: `${data.studentName}: ${data.taScore}/100`
      });
    });

    return () => socketRef.current.disconnect();
  }, [sessionId, toast]);

  const handleEndSession = async () => {
    if (!window.confirm("End this session for ALL students?")) return;
    try {
      await api.patch(`/viva/sessions/${sessionId}/status`, { status: 'ended' });
      toast({ type: 'success', title: 'Session Ended' });
      setSession(prev => ({ ...prev, status: 'completed' }));
    } catch {
      toast({ type: 'error', title: 'Failed to end session' });
    }
  };

  const handleRestartSession = async () => {
    if (!window.confirm("Restart this session?")) return;
    try {
      await api.patch(`/viva/sessions/${sessionId}/status`, { status: 'scheduled' });
      toast({ type: 'success', title: 'Session Restarted' });
      setSession(prev => ({ ...prev, status: 'scheduled' }));
    } catch {
      toast({ type: 'error', title: 'Failed to restart session' });
    }
  };

  const handleSaveReport = async () => {
    if (!editingReport) return;
    try {
      const updatedReport = {
        ...editingReport.reportData,
        overall_score: parseFloat(editingReport.overall_score),
        subject_knowledge_score: parseFloat(editingReport.subject_knowledge_score),
        ai_feedback: editingReport.ai_feedback,
      };
      
      const { data } = await api.patch(`/viva/sessions/${editingReport.dbId}/report`, { ai_report: updatedReport });
      toast({ type: 'success', title: 'Report Updated' });
      
      setActiveStudents(prev => ({
        ...prev,
        [editingReport.studentId]: {
          ...prev[editingReport.studentId],
          ai_report: data.ai_report
        }
      }));
      setEditingReport(null);
    } catch {
      toast({ type: 'error', title: 'Failed to update report' });
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
              <span className={`w-2 h-2 rounded-full bg-danger ${session?.status !== 'completed' ? 'animate-pulse' : ''}`} /> 
              {session?.status === 'completed' ? 'ENDED' : 'LIVE'}
            </span>
            <span className="text-ink-muted flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" /> {connectedCount} Connected
            </span>
          </div>
          {session?.status === 'completed' ? (
            <button onClick={handleRestartSession} className="btn-primary bg-success border-none hover:bg-success/90 flex items-center gap-2">
              <VideoOff className="w-4 h-4" /> Restart Session
            </button>
          ) : (
            <button onClick={handleEndSession} className="btn-primary bg-danger border-none hover:bg-danger/90 flex items-center gap-2">
              <VideoOff className="w-4 h-4" /> End Session For All
            </button>
          )}
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

                <div className="bg-surface-low rounded-lg p-3 flex-1 min-h-[150px] border border-border overflow-y-auto max-h-[250px]">
                  <p className="text-xs font-semibold text-ink-muted mb-3 flex items-center gap-1.5 uppercase tracking-wider sticky top-0 bg-surface-low pb-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Live Transcript
                  </p>
                  <div className="flex flex-col gap-2">
                    {(() => {
                      if (!st.transcript || st.transcript === 'Waiting for student to speak...') {
                        return <p className="text-sm text-ink-primary italic">{st.transcript}</p>;
                      }
                      try {
                        const msgs = JSON.parse(st.transcript);
                        if (!Array.isArray(msgs)) throw new Error('Not array');
                        return msgs.map((m, idx) => (
                          <div key={idx} className="flex flex-col mb-1">
                            <span className="text-[10px] font-bold text-ink-muted uppercase">{m.role === 'ai' ? 'AI' : 'Student'}</span>
                            <span className={`text-xs p-1.5 rounded ${m.role === 'ai' ? 'bg-primary-50 text-primary-800' : 'bg-surface-high text-ink-primary'}`}>
                              {m.content}
                            </span>
                          </div>
                        ));
                      } catch (e) {
                        return <p className="text-sm text-ink-primary">{st.transcript}</p>;
                      }
                    })()}
                    
                    {st.liveDraft && st.liveDraft.trim().length > 0 && st.status !== 'ended' && (
                      <div className="flex flex-col mb-1 animate-pulse">
                        <span className="text-[10px] font-bold text-ink-muted uppercase">Student (Typing/Speaking...)</span>
                        <span className="text-xs p-1.5 rounded bg-surface-high text-ink-muted italic border border-dashed border-border">
                          {st.liveDraft}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {st.lastActive && (
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-ink-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Last active: {new Date(st.lastActive).toLocaleTimeString()}
                    </p>
                    {st.status === 'ended' && st.dbId && (
                      <button 
                        onClick={() => setEditingReport({
                          studentId: st.socketId,
                          dbId: st.dbId,
                          reportData: st.ai_report || {},
                          overall_score: st.ai_report?.overall_score || 0,
                          subject_knowledge_score: st.ai_report?.subject_knowledge_score || 0,
                          ai_feedback: st.ai_report?.ai_feedback || ''
                        })}
                        className="btn-outline-primary btn-sm px-2 py-1 text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Report Modal */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-low">
              <h3 className="font-bold text-ink-primary">Edit AI Report</h3>
              <button onClick={() => setEditingReport(null)} className="text-ink-muted hover:text-ink-primary">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Overall Score (0-100)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editingReport.overall_score} 
                  onChange={e => setEditingReport({ ...editingReport, overall_score: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Subject Knowledge Score (0-10)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editingReport.subject_knowledge_score} 
                  onChange={e => setEditingReport({ ...editingReport, subject_knowledge_score: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Feedback</label>
                <textarea 
                  className="input-field min-h-[120px]" 
                  value={editingReport.ai_feedback} 
                  onChange={e => setEditingReport({ ...editingReport, ai_feedback: e.target.value })} 
                />
              </div>
            </div>
            <div className="p-4 bg-surface-low border-t border-border flex justify-end gap-3">
              <button onClick={() => setEditingReport(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveReport} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
