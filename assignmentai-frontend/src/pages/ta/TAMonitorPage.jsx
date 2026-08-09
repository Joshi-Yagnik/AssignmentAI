import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import {
  Users, AlertTriangle, MessageSquare, Clock,
  CheckCircle2, Send, Eye, EyeOff, Star, Video, VideoOff,
  Flag, ShieldAlert, ShieldCheck, Shield, Mic, MicOff, X
} from 'lucide-react';

// Warning type icons and labels
const WARNING_META = {
  tab_switch:     { label: 'Tab Switch',       color: 'text-warning',  icon: '🪟' },
  face_lost:      { label: 'Face Lost',         color: 'text-danger',   icon: '👤' },
  multiple_faces: { label: 'Multiple Faces',    color: 'text-danger',   icon: '👥' },
  default:        { label: 'Violation',         color: 'text-ink-muted',icon: '⚠️' },
};

// Risk level based on warning count
function getRisk(warnings) {
  if (warnings === 0) return { label: 'Safe',   bg: 'bg-success/10',   text: 'text-success',  icon: ShieldCheck };
  if (warnings <= 2)  return { label: 'Watch',  bg: 'bg-warning/10',   text: 'text-warning',  icon: Shield };
  return               { label: 'High Risk', bg: 'bg-danger/10',    text: 'text-danger',   icon: ShieldAlert };
}

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function TAMonitorPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [activeStudents, setActiveStudents] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [scores, setScores] = useState({});
  const [submittedScores, setSubmittedScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [liveStreams, setLiveStreams] = useState({});
  const [flaggedAnswers, setFlaggedAnswers] = useState({}); // { socketId: [{ index, content, note }] }
  const [warningEvents, setWarningEvents] = useState({}); // { socketId: [{ type, time }] }
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const liveVideoRef = useRef(null);

  useEffect(() => {
    api.get(`/viva/sessions/${sessionId}`)
      .then(({ data }) => setSession(data))
      .catch(() => {
        toast({ type: 'error', title: 'Session not found' });
        navigate('/ta');
      });

    // Fetch existing students who might have joined before TA
    api.get(`/viva/sessions/${sessionId}/students`)
      .then(({ data }) => {
        if (!data || !Array.isArray(data)) return;
        setActiveStudents(prev => {
          const next = { ...prev };
          data.forEach(stRow => {
            const key = stRow.id; 
            if (!next[key]) {
              next[key] = {
                socketId: key, // fallback socketId to dbId
                dbId: stRow.id,
                studentId: stRow.student_id,
                name: stRow.users?.first_name ? `${stRow.users.first_name} ${stRow.users.last_name}` : 'Student',
                transcript: [],
                warnings: stRow.warnings_count || 0,
                status: stRow.status,
                online: false,
                lastActive: stRow.scheduled_time
              };
              // Try to parse existing transcript
              try {
                const parsed = JSON.parse(stRow.transcript || '[]');
                if (Array.isArray(parsed)) next[key].transcript = parsed;
              } catch (e) {}
            }
          });
          return next;
        });
      })
      .catch(console.error);
  }, [sessionId, navigate, toast]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    // TA joins as 'ta' role — invisible to student
    // Join the exam session room (viva_exam_sessions ID)
    socketRef.current.emit('join_viva', { sessionId, role: 'ta' });

    // Student joined (or re-announced)
    socketRef.current.on('student_joined', (data) => {
      setActiveStudents(prev => {
        const existingKey = Object.keys(prev).find(k => 
          prev[k].studentId === data.studentId || 
          prev[k].dbId === data.sessionId || 
          k === data.sessionId
        );
        const keyToUse = existingKey || data.socketId;

        return {
          ...prev,
          [keyToUse]: {
            ...(prev[existingKey] || prev[data.socketId] || {}),
            socketId: data.socketId,
            studentId: data.studentId || (prev[existingKey]?.studentId),
            name: data.studentName || prev[existingKey]?.name || 'Student',
            online: true,
            status: 'active'
          }
        };
      });
    });

    // Live transcript (submitted)
    socketRef.current.on('teacher_transcript_live', (data) => {
      const key = data.socketId || data.sessionId;
      setActiveStudents(prev => {
        let parsed = [];
        try { parsed = JSON.parse(data.transcript || '[]'); } catch {}
        return {
          ...prev,
          [key]: {
            ...(prev[key] || { warnings: 0, name: data.studentName || 'Student' }),
            socketId: key,
            studentId: data.studentId || prev[key]?.studentId,
            transcript: parsed,
            liveDraft: '', // clear draft on submit
            lastActive: new Date(),
          }
        };
      });
    });

    // Live draft (typing/speaking)
    socketRef.current.on('teacher_transcript_live_draft', (data) => {
      const key = data.socketId || data.sessionId;
      setActiveStudents(prev => {
        return {
          ...prev,
          [key]: {
            ...(prev[key] || { warnings: 0, name: data.studentName || 'Student' }),
            socketId: key,
            studentId: data.studentId || prev[key]?.studentId,
            liveDraft: data.draft,
            lastActive: new Date(),
          }
        };
      });
    });

    // Warnings
    socketRef.current.on('teacher_viva_warning', (data) => {
      const key = data.socketId || data.sessionId;
      setActiveStudents(prev => {
        return {
          ...prev,
          [key]: {
            ...(prev[key] || { warnings: 0, name: data.studentName || 'Student' }),
            socketId: key,
            studentId: data.studentId || prev[key]?.studentId,
            warnings: ((prev[key]?.warnings) || 0) + 1,
            warningType: data.type || 'default',
          }
        };
      });
      // Push to warning timeline
      setWarningEvents(prev => ({
        ...prev,
        [key]: [
          ...(prev[key] || []),
          { type: data.type || 'default', time: new Date() }
        ]
      }));
    });

    // AI grading completed — show score on student card instantly
    socketRef.current.on('student_viva_graded', (data) => {
      setActiveStudents(prev => {
        const key = Object.keys(prev).find(k =>
          prev[k].studentId === data.studentId || k === data.sessionId
        ) || data.sessionId;
        return {
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            name: data.studentName || prev[key]?.name || 'Student',
            status: 'graded',
            aiScore: data.aiScore,
            maxScore: data.maxScore,
          }
        };
      });
    });

    // ── WebRTC: Receive stream from student ──────────────────────────────────
    socketRef.current.on('webrtc_offer', async ({ fromSocketId, sdp, studentId }) => {
      try {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[fromSocketId] = pc;
        
        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('webrtc_ice', {
              toSocketId: fromSocketId,
              candidate: event.candidate,
            });
          }
        };

        pc.ontrack = (event) => {
          setLiveStreams(prev => ({ 
            ...prev, 
            [studentId || fromSocketId]: event.streams[0] 
          }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('webrtc_answer', { toSocketId: fromSocketId, sdp: answer });
      } catch (err) {
        console.error('[WebRTC] Failed to create answer:', err);
      }
    });

    socketRef.current.on('webrtc_ice', async ({ fromSocketId, candidate }) => {
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    });

    return () => {
      socketRef.current?.disconnect();
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [sessionId]);

  // Once session data loads, also join the legacy viva_sessions template room
  // This bridges the gap for students already connected to the old room
  useEffect(() => {
    if (session?.legacy_session_id && session.legacy_session_id !== sessionId && socketRef.current) {
      socketRef.current.emit('join_viva', { sessionId: session.legacy_session_id, role: 'ta' });
    }
  }, [session?.legacy_session_id, sessionId]);

  // Request streams for all ungraded active students
  useEffect(() => {
    if (!socketRef.current) return;
    Object.values(activeStudents).forEach(st => {
      const streamKey = st.studentId || st.socketId;
      if (st.online && !liveStreams[streamKey] && !submittedScores[st.socketId]) {
        socketRef.current.emit('webrtc_request_stream_broadcast', { 
          sessionId: sessionId,
          targetStudentId: st.studentId 
        });
      }
    });
  }, [activeStudents, submittedScores, sessionId, liveStreams]); // Depend on activeStudents changes

  const requestStream = (studentId) => {
    if (socketRef.current && studentId) {
      socketRef.current.emit('webrtc_request_stream_broadcast', { 
        sessionId: sessionId,
        targetStudentId: studentId 
      });
    }
  };

  const handleScoreChange = (socketId, field, value) => {
    setScores(prev => ({
      ...prev,
      [socketId]: { ...(prev[socketId] || {}), [field]: value }
    }));
  };

  const submitScore = async (student) => {
    const entry = scores[student.socketId] || {};
    if (!entry.score && entry.score !== 0) {
      return toast({ type: 'warning', title: 'Please enter a score before submitting' });
    }
    setSubmitting(true);
    try {
      await api.post(`/viva/sessions/${sessionId}/ta-score`, {
        student_id: student.studentId || student.socketId,
        ta_score: Number(entry.score),
        notes: entry.notes || ''
      });
      setSubmittedScores(prev => ({ ...prev, [student.socketId]: true }));
      toast({ type: 'success', title: `Score submitted for ${student.name}` });
      setSelectedStudent(null);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to submit score', message: err?.response?.data?.error || '' });
    } finally {
      setSubmitting(false);
    }
  };

  const studentList = Object.values(activeStudents);
  const selected = selectedStudent ? activeStudents[selectedStudent] : null;

  // Flag a specific Q&A answer
  const toggleFlag = (socketId, msgIndex, content) => {
    setFlaggedAnswers(prev => {
      const flags = prev[socketId] || [];
      const exists = flags.find(f => f.index === msgIndex);
      if (exists) return { ...prev, [socketId]: flags.filter(f => f.index !== msgIndex) };
      return { ...prev, [socketId]: [...flags, { index: msgIndex, content, time: new Date() }] };
    });
  };

  const isFlagged = (socketId, msgIndex) => {
    return (flaggedAnswers[socketId] || []).some(f => f.index === msgIndex);
  };

  // Filter out students who have been graded
  const gridStudents = studentList.filter(s => !submittedScores[s.socketId]);

  return (
    <>
      <TopBar
        title="TA Live Monitor"
        subtitle={session?.title || 'Monitoring session...'}
      />

      <main className="p-4 md:p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-6 relative z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5 pointer-events-none -z-10 rounded-3xl hidden md:block"></div>

        {/* Session info banner */}
        <div className="bg-gradient-to-r from-surface-high via-surface to-transparent rounded-2xl border border-border/60 p-5 flex items-center gap-5 shadow-sm relative overflow-hidden group backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-success/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center shrink-0 relative">
            <span className="absolute inset-0 rounded-full border-2 border-success/20 animate-ping opacity-50 duration-1000"></span>
            <span className="w-3 h-3 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-ink-primary">
              {session?.title || 'Live Viva Monitoring'}
            </p>
            <p className="text-sm text-ink-secondary mt-0.5">
              You are monitoring anonymously — students cannot see or hear you.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-success/10 px-3 py-1.5 rounded-lg border border-success/20">
            <EyeOff className="w-4 h-4 text-success" />
            <span className="text-success font-bold text-xs uppercase tracking-wider">Anonymous Mode</span>
          </div>
        </div>

        {/* Multi-Camera Grid */}
        <div>
          <h3 className="font-semibold text-ink-primary text-label-md mb-4 flex items-center justify-between">
            <span>Ungraded Active Students ({gridStudents.length})</span>
          </h3>

          {gridStudents.length === 0 ? (
            <div className="card p-12 text-center text-ink-muted flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm border-dashed border-2 border-border/80 min-h-[300px]">
              <div className="w-16 h-16 rounded-full bg-surface-high flex items-center justify-center mb-4 shadow-inner relative">
                <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-30"></span>
                <Users className="w-7 h-7 text-primary/40" />
              </div>
              <p className="font-bold text-ink-primary">No active students to grade</p>
              <p className="text-sm mt-1 max-w-[300px]">
                {studentList.length > 0 
                  ? "All connected students have been graded."
                  : "Students will appear here automatically when they join."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gridStudents.map(student => {
                const streamKey = student.studentId || student.socketId;
                const stream = liveStreams[streamKey];
                const risk = getRisk(student.warnings || 0);
                const RiskIcon = risk.icon;
                const isSpeaking = !!student.liveDraft;

                return (
                  <div key={student.socketId} className="card overflow-hidden border border-border/80 shadow-sm flex flex-col">
                    {/* Camera Feed Area */}
                    <div className="relative bg-surface-high aspect-video">
                      {stream ? (
                        <video
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          ref={el => { if (el && stream) el.srcObject = stream; }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-muted bg-surface/50 gap-2">
                          <VideoOff className="w-8 h-8 opacity-40 mb-1" />
                          {student.online ? (
                            <>
                              <p className="text-xs font-medium">Connecting camera...</p>
                              <button 
                                onClick={() => requestStream(student.studentId)}
                                className="btn btn-secondary btn-xs mt-1"
                              >
                                Retry
                              </button>
                            </>
                          ) : (
                            <p className="text-xs font-medium">Offline</p>
                          )}
                        </div>
                      )}
                      
                      {/* Live Badge & Speaking Indicator */}
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        {isSpeaking && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white backdrop-blur flex items-center shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1 inline-block" />
                            Speaking
                          </span>
                        )}
                        {student.online ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/90 text-white backdrop-blur uppercase flex items-center shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-white mr-1 inline-block" />
                            Live
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink-muted/90 text-white backdrop-blur uppercase flex items-center shadow-sm">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info Area */}
                    <div className="p-3 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-ink-primary truncate text-sm">{student.name}</p>
                          <p className="text-[10px] text-ink-secondary truncate">{student.studentId}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${risk.bg} ${risk.text}`}>
                          <RiskIcon className="w-2.5 h-2.5" />
                          {risk.label}
                          {student.warnings > 0 && ` (${student.warnings})`}
                        </div>
                      </div>

                      {student.aiScore != null && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-ink-secondary font-medium">AI Estimate:</span>
                          <span className="text-success font-bold">{student.aiScore}/{student.maxScore}</span>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedStudent(student.socketId)}
                        className="btn btn-primary w-full mt-auto text-sm py-2 shadow-sm"
                      >
                        Evaluate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Grading Modal */}
      {selectedStudent && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up ring-1 ring-border border-2 border-surface-high">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-surface-low">
              <h3 className="font-bold text-ink-primary text-lg flex items-center gap-2">
                Evaluate: {selected.name}
              </h3>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-high text-ink-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split view */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left: Transcript */}
              <div className="flex-1 flex flex-col border-r border-border/50 overflow-hidden">
                <div className="p-3 border-b border-border/50 bg-surface-low/50 flex items-center justify-between">
                  <span className="font-semibold text-ink-primary text-sm flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Live Transcript
                  </span>
                  {selected.warnings > 0 && (
                    <span className="flex items-center gap-1 text-danger text-[11px] font-semibold bg-danger/10 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {selected.warnings} Warning{selected.warnings > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-surface">
                  {(!selected.transcript || selected.transcript.length === 0) ? (
                    <div className="flex-1 flex items-center justify-center text-ink-muted text-sm italic">
                      Waiting for student to speak...
                    </div>
                  ) : (
                    selected.transcript.map((msg, i) => {
                      const isStudent = msg.role === 'user' || msg.role === 'student';
                      const flagged = isStudent && isFlagged(selected.socketId, i);
                      return (
                        <div key={i} className={`flex ${isStudent ? 'justify-end' : 'justify-start'} group`}>
                          <div className={`relative max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                            flagged
                              ? 'bg-danger/10 border border-danger/30 text-ink-primary'
                              : isStudent
                                ? 'bg-primary text-white'
                                : 'bg-surface-high text-ink-primary'
                          }`}>
                            <p className="font-semibold text-[10px] opacity-70 mb-0.5">
                              {isStudent ? 'Student' : 'AI Question'}
                              {flagged && <span className="ml-1 text-danger">🚩 Flagged</span>}
                            </p>
                            <p>{msg.content}</p>
                            {isStudent && (
                              <button
                                onClick={() => toggleFlag(selected.socketId, i, msg.content)}
                                className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${
                                  flagged ? 'bg-danger text-white' : 'bg-surface-high border border-border text-ink-muted hover:bg-danger/10 hover:text-danger'
                                }`}
                                title={flagged ? 'Remove flag' : 'Flag this answer'}
                              >
                                🚩
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {selected.liveDraft && (
                    <div className="flex justify-end opacity-70">
                      <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-primary/20 text-primary border border-primary/30">
                        <p className="font-semibold text-[10px] opacity-70 mb-0.5">Student (Speaking...)</p>
                        <p>{selected.liveDraft}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Scoring Form & Events */}
              <div className="w-full md:w-80 flex flex-col bg-surface-low overflow-y-auto">
                <div className="p-4 flex flex-col gap-5">
                  {/* Security Events Timeline */}
                  {(warningEvents[selected.socketId] || []).length > 0 && (
                    <div className="flex flex-col gap-2 p-3 border border-danger/30 bg-danger/5 rounded-xl">
                      <h3 className="font-semibold text-danger flex items-center gap-1.5 text-xs">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Security Events ({(warningEvents[selected.socketId] || []).length})
                      </h3>
                      <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {[...(warningEvents[selected.socketId] || [])].reverse().map((ev, i) => {
                          const meta = WARNING_META[ev.type] || WARNING_META.default;
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
                              <span>{meta.icon}</span>
                              <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                              <span className="text-ink-muted ml-auto">
                                {ev.time.toLocaleTimeString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Score Form */}
                  <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-ink-primary flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-warning" />
                      Score Details
                    </h3>
                    
                    <div>
                      <label className="label text-xs">Score out of 100</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="e.g. 85"
                        value={scores[selected.socketId]?.score ?? ''}
                        onChange={e => handleScoreChange(selected.socketId, 'score', e.target.value)}
                        disabled={submittedScores[selected.socketId]}
                      />
                    </div>
                    
                    <div>
                      <label className="label text-xs flex justify-between">
                        TA Notes
                        {(flaggedAnswers[selected.socketId] || []).length > 0 && (
                          <span className="text-[10px] text-danger font-semibold">
                            ({(flaggedAnswers[selected.socketId] || []).length} flagged)
                          </span>
                        )}
                      </label>
                      <textarea
                        className="input min-h-[80px] resize-none text-sm"
                        placeholder="Private notes about performance..."
                        value={scores[selected.socketId]?.notes ?? ''}
                        onChange={e => handleScoreChange(selected.socketId, 'notes', e.target.value)}
                        disabled={submittedScores[selected.socketId]}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="btn btn-secondary flex-1 shadow-sm"
                      >
                        Close (Grade Later)
                      </button>
                      <button
                        onClick={() => submitScore(selected)}
                        disabled={
                          submitting 
                          || submittedScores[selected.socketId] 
                          || scores[selected.socketId]?.score == null 
                          || scores[selected.socketId]?.score === ''
                        }
                        className="btn btn-primary flex-1 shadow-md shadow-primary/20"
                      >
                        {submitting ? 'Submitting...' : 'Submit Score'}
                        {!submitting && <Send className="w-4 h-4 ml-1.5 inline" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
