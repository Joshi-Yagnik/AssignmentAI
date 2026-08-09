import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import {
  Users, AlertTriangle, MessageSquare, Clock,
  CheckCircle2, Send, Eye, EyeOff, Star, Video, VideoOff,
  Flag, ShieldAlert, ShieldCheck, Shield, Mic, MicOff
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
            ...(prev[keyToUse] || { transcript: [], warnings: 0, lastActive: new Date() }),
            socketId: data.socketId,
            studentId: data.studentId,
            name: data.studentName || prev[keyToUse]?.name || `Student (${data.socketId.slice(0, 6)})`,
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
    socketRef.current.on('webrtc_offer', async ({ fromSocketId, sdp }) => {
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
          setLiveStreams(prev => ({ ...prev, [fromSocketId]: event.streams[0] }));
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
  }, [session, sessionId]);

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

  // Request the student's WebRTC stream whenever selected student changes
  useEffect(() => {
    if (!selected?.socketId || !socketRef.current) return;
    if (liveStreams[selected.socketId]) {
      if (liveVideoRef.current) liveVideoRef.current.srcObject = liveStreams[selected.socketId];
      return;
    }
    socketRef.current.emit('webrtc_request_stream', { studentSocketId: selected.socketId });
  }, [selected?.socketId]);

  // Attach stream to video element when it becomes available
  useEffect(() => {
    if (selected?.socketId && liveStreams[selected.socketId] && liveVideoRef.current) {
      liveVideoRef.current.srcObject = liveStreams[selected.socketId];
    }
  }, [liveStreams, selected?.socketId]);

  return (
    <>
      <TopBar
        title="TA Live Monitor"
        subtitle={session?.title || 'Monitoring session...'}
      />

      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 relative z-0">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student list */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-ink-primary text-label-md">
              Active Students ({studentList.length})
            </h3>

            {studentList.length === 0 ? (
              <div className="card p-8 text-center text-ink-muted flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm border-dashed border-2 border-border/80">
                <div className="w-16 h-16 rounded-full bg-surface-high flex items-center justify-center mb-4 shadow-inner relative">
                  <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-30"></span>
                  <Users className="w-7 h-7 text-primary/40" />
                </div>
                <p className="font-bold text-ink-primary">Waiting for students</p>
                <p className="text-xs mt-1 max-w-[200px]">Students will appear here automatically when they join.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {studentList.map(student => {
                  const isSelected = selectedStudent === student.socketId;
                  const isDone = submittedScores[student.socketId];
                  const risk = getRisk(student.warnings || 0);
                  const isSpeaking = !!student.liveDraft;
                  const RiskIcon = risk.icon;
                  return (
                    <div
                      key={student.socketId}
                      className={`card cursor-pointer p-3 transition-all border-2 ${
                        isSelected ? 'border-primary shadow-md shadow-primary/10' : 'border-transparent hover:border-border'
                      }`}
                      onClick={() => setSelectedStudent(student.socketId)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {student.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          {isSpeaking && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-base animate-pulse" title="Speaking now" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-ink-primary truncate">{student.name}</p>
                          <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit mt-0.5 ${risk.bg} ${risk.text}`}>
                            <RiskIcon className="w-2.5 h-2.5" />
                            {risk.label}
                            {student.warnings > 0 && ` (${student.warnings})`}
                          </div>
                          {student.aiScore != null && (
                            <p className="text-[11px] font-bold text-success mt-0.5">
                              AI: {student.aiScore}/{student.maxScore}
                            </p>
                          )}
                        </div>
                        {student.status === 'graded'
                          ? <Star className="w-4 h-4 text-warning shrink-0" />
                          : isDone && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Transcript + Score */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
            {!selected ? (
              <div className="card p-16 flex flex-col items-center justify-center text-ink-muted h-full min-h-[400px] bg-white/60 backdrop-blur-sm border-dashed border-2 border-border/80">
                <div className="w-24 h-24 rounded-full bg-surface-high flex items-center justify-center mb-6 shadow-inner">
                  <Eye className="w-10 h-10 text-primary/30" />
                </div>
                <h3 className="text-xl font-bold text-ink-primary mb-2">Select a student</h3>
                <p className="text-sm text-center max-w-md text-ink-secondary">
                  Click on any active student from the list on the left to view their live camera feed, transcript, and submit scores.
                </p>
              </div>
            ) : (
              <>
                {/* Live Camera Feed */}
                <div className="card flex flex-col gap-3 p-5 border border-border/80 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-ink-primary flex items-center gap-2">
                      <div className="p-1.5 bg-success/10 rounded-lg">
                        <Video className="w-4 h-4 text-success" />
                      </div>
                      Live Camera — {selected.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-success text-white uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-success/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                      LIVE NOW
                    </span>
                  </div>
                  <div className="relative bg-surface-high/50 rounded-xl overflow-hidden ring-1 ring-border/50 shadow-inner" style={{ aspectRatio: '16/9' }}>
                    {liveStreams[selected.socketId] ? (
                      <video
                        ref={liveVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-muted bg-surface/50 gap-3">
                        <div className="w-16 h-16 rounded-full bg-surface-high flex items-center justify-center relative">
                          <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-50"></span>
                          <VideoOff className="w-6 h-6 opacity-50" />
                        </div>
                        <p className="text-sm font-medium">Connecting to student's camera...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcript */}
                <div className="card flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-ink-primary flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      {selected.name} — Live Transcript
                    </h3>
                    {selected.warnings > 0 && (
                      <span className="flex items-center gap-1 text-danger text-label-sm font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {selected.warnings} Warning{selected.warnings > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="bg-surface-low rounded-xl p-4 min-h-[200px] max-h-[340px] overflow-y-auto flex flex-col gap-3">
                    {(!selected.transcript || selected.transcript.length === 0) ? (
                      <p className="text-ink-muted text-sm italic text-center mt-8">
                        Waiting for student to speak...
                      </p>
                    ) : (
                      selected.transcript.map((msg, i) => {
                        const isStudent = msg.role === 'user' || msg.role === 'student';
                        const flagged = isStudent && isFlagged(selected.socketId, i);
                        return (
                          <div key={i} className={`flex ${isStudent ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`relative max-w-[80%] rounded-xl px-3 py-2 text-sm ${
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
                        <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-primary/20 text-primary border border-primary/30">
                          <p className="font-semibold text-[10px] opacity-70 mb-0.5">Student (Speaking...)</p>
                          <p>{selected.liveDraft}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Events Timeline */}
                {(warningEvents[selected.socketId] || []).length > 0 && (
                  <div className="card flex flex-col gap-2 p-4 border-l-4 border-l-danger">
                    <h3 className="font-semibold text-danger flex items-center gap-2 text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      Security Events ({(warningEvents[selected.socketId] || []).length})
                    </h3>
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                      {[...(warningEvents[selected.socketId] || [])].reverse().map((ev, i) => {
                        const meta = WARNING_META[ev.type] || WARNING_META.default;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs text-ink-secondary">
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

                {/* Score form */}
                <div className="card flex flex-col gap-3">
                  <h3 className="font-semibold text-ink-primary flex items-center gap-2">
                    <Star className="w-4 h-4 text-warning" />
                    Submit Score for {selected.name}
                    {(flaggedAnswers[selected.socketId] || []).length > 0 && (
                      <span className="ml-auto text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full font-semibold">
                        🚩 {(flaggedAnswers[selected.socketId] || []).length} Flagged Answer{(flaggedAnswers[selected.socketId] || []).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Score (0–100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="e.g. 78"
                        value={scores[selected.socketId]?.score ?? ''}
                        onChange={e => handleScoreChange(selected.socketId, 'score', e.target.value)}
                        disabled={submittedScores[selected.socketId]}
                      />
                    </div>
                    <div>
                      <label className="label">Notes (optional)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Any observations..."
                        value={scores[selected.socketId]?.notes ?? ''}
                        onChange={e => handleScoreChange(selected.socketId, 'notes', e.target.value)}
                        disabled={submittedScores[selected.socketId]}
                      />
                    </div>
                  </div>
                  {submittedScores[selected.socketId] ? (
                    <div className="flex items-center gap-2 text-success font-medium text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Score submitted successfully
                    </div>
                  ) : (
                    <button
                      className="btn-primary self-end flex items-center gap-2"
                      onClick={() => submitScore(selected)}
                      disabled={submitting}
                    >
                      <Send className="w-4 h-4" />
                      Submit Score
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
