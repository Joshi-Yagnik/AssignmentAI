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
      
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full relative z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-danger/5 pointer-events-none -z-10 rounded-3xl hidden md:block"></div>

        <div className="bg-gradient-to-r from-surface-high via-surface to-transparent rounded-2xl border border-border/60 p-5 flex flex-wrap justify-between items-center gap-5 shadow-sm mb-6 relative overflow-hidden group backdrop-blur-sm">
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none ${session?.status === 'completed' ? 'bg-ink-muted/10' : 'bg-danger/10'}`}></div>
          
          <div className="flex items-center gap-4 relative z-10">
            {session?.status === 'completed' ? (
              <span className="flex items-center gap-2 px-4 py-2 bg-ink-muted/10 text-ink-muted rounded-xl font-bold text-sm uppercase tracking-wider border border-border">
                <span className="w-2.5 h-2.5 rounded-full bg-ink-muted" /> 
                Ended
              </span>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger rounded-xl font-bold text-sm uppercase tracking-wider border border-danger/20 shadow-sm shadow-danger/10 relative overflow-hidden">
                <span className="absolute inset-0 bg-danger/5 animate-pulse-soft pointer-events-none"></span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
                </span>
                LIVE NOW
              </span>
            )}
            
            <div className="h-8 w-px bg-border hidden sm:block"></div>
            
            <span className="text-ink-secondary font-medium flex items-center gap-2 text-sm bg-surface-low px-3 py-1.5 rounded-lg border border-border/50">
              <Users className="w-4 h-4 text-primary" /> {connectedCount} Connected {connectedCount === 1 ? 'Student' : 'Students'}
            </span>
          </div>
          
          <div className="relative z-10 w-full sm:w-auto">
            {session?.status === 'completed' ? (
              <button onClick={handleRestartSession} className="w-full sm:w-auto btn bg-success text-white border-none hover:bg-success/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 px-5 py-2.5 shadow-md shadow-success/20">
                <Clock className="w-4 h-4" /> Restart Session
              </button>
            ) : (
              <button onClick={handleEndSession} className="w-full sm:w-auto btn bg-danger text-white border-none hover:bg-danger/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 px-5 py-2.5 shadow-md shadow-danger/20">
                <VideoOff className="w-4 h-4" /> End Session For All
              </button>
            )}
          </div>
        </div>

        {studentsList.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-24 text-center bg-white/60 backdrop-blur-sm border-dashed border-2 border-border/80">
            <div className="w-20 h-20 rounded-full bg-surface-high flex items-center justify-center mb-5 shadow-inner relative">
              <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-30"></span>
              <Users className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-xl font-bold text-ink-primary">Waiting for students to join</p>
            <p className="text-sm text-ink-secondary mt-2 max-w-sm mx-auto">
              Share the session link with your students. They will automatically appear here once they connect.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {studentsList.map((st, i) => (
              <div key={st.socketId || i} className={`card flex flex-col gap-4 transition-all duration-300 relative overflow-hidden ${st.status === 'ended' ? 'border-border opacity-75 bg-surface-low/30' : 'border border-primary/20 hover:border-primary/40 hover:shadow-md bg-white/90'}`}>
                {st.status !== 'ended' && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-info opacity-70"></div>}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${st.status === 'ended' ? 'bg-surface-high text-ink-muted' : 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/10'}`}>
                      {(st.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-ink-primary text-base truncate max-w-[150px]" title={st.name || `Student ${i + 1}`}>{st.name || `Student ${i + 1}`}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex mt-1 ${st.status === 'ended' ? 'bg-surface-high text-ink-muted border border-border' : 'bg-success/10 text-success border border-success/20'}`}>
                        {st.status === 'ended' ? 'Finished' : 'Live Now'}
                      </span>
                    </div>
                  </div>
                  {st.warnings > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-danger bg-danger/10 px-2.5 py-1 rounded-lg border border-danger/20 shadow-sm">
                      <AlertTriangle className="w-3.5 h-3.5" /> {st.warnings} Violations
                    </span>
                  )}
                </div>
                
                {st.violations && st.violations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {st.violations.map((v, vi) => (
                      <span key={vi} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-danger/5 text-danger border border-danger/10 rounded-full">{v}</span>
                    ))}
                  </div>
                )}

                <div className="bg-surface-low/50 rounded-xl p-4 flex-1 min-h-[180px] border border-border/60 overflow-y-auto max-h-[280px] shadow-inner relative">
                  <div className="sticky top-0 bg-surface-low/90 backdrop-blur-sm pb-2 mb-3 border-b border-border/50 z-10 -mx-4 px-4 -mt-4 pt-4">
                    <p className="text-[11px] font-bold text-ink-secondary flex items-center gap-1.5 uppercase tracking-wider">
                      <MessageSquare className="w-3.5 h-3.5 text-primary/70" /> Live Transcript
                    </p>
                  </div>
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
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                    <p className="text-[11px] font-medium text-ink-muted flex items-center gap-1.5 bg-surface-low px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5" /> {new Date(st.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
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
                        className="btn bg-white text-primary border border-primary/20 hover:border-primary hover:bg-primary/5 hover:shadow-sm btn-sm px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Report
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
