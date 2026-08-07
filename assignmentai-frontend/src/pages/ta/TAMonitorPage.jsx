import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import {
  Users, AlertTriangle, MessageSquare, Clock,
  CheckCircle2, Send, Eye, EyeOff, Star
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

export default function TAMonitorPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [activeStudents, setActiveStudents] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [scores, setScores] = useState({}); // { studentId: { score, notes } }
  const [submittedScores, setSubmittedScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/viva/sessions/${sessionId}`)
      .then(({ data }) => setSession(data))
      .catch(() => {
        toast({ type: 'error', title: 'Session not found' });
        navigate('/ta');
      });
  }, [sessionId, navigate, toast]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    // TA joins as 'ta' role — invisible to student
    socketRef.current.emit('join_viva', { sessionId, role: 'ta' });

    // Student joined
    socketRef.current.on('student_joined', (data) => {
      setActiveStudents(prev => ({
        ...prev,
        [data.socketId]: {
          socketId: data.socketId,
          studentId: data.studentId,
          name: data.studentName || `Student (${data.socketId.slice(0, 6)})`,
          transcript: [],
          warnings: 0,
          lastActive: new Date(),
        }
      }));
    });

    // Live transcript
    socketRef.current.on('teacher_transcript_live', (data) => {
      setActiveStudents(prev => {
        if (!prev[data.socketId]) return prev;
        let parsed = [];
        try { parsed = JSON.parse(data.transcript || '[]'); } catch {}
        return {
          ...prev,
          [data.socketId]: {
            ...prev[data.socketId],
            transcript: parsed,
            lastActive: new Date(),
          }
        };
      });
    });

    // Warnings
    socketRef.current.on('teacher_viva_warning', (data) => {
      setActiveStudents(prev => {
        if (!prev[data.socketId]) return prev;
        return {
          ...prev,
          [data.socketId]: {
            ...prev[data.socketId],
            warnings: (prev[data.socketId].warnings || 0) + 1,
          }
        };
      });
    });

    return () => { socketRef.current?.disconnect(); };
  }, [sessionId]);

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

  return (
    <>
      <TopBar
        title="TA Live Monitor"
        subtitle={session?.title || 'Monitoring session...'}
      />

      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">

        {/* Session info banner */}
        <div className="card flex items-center gap-4 py-3 bg-gradient-to-r from-primary/5 to-transparent">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <div className="flex-1">
            <p className="font-semibold text-ink-primary">
              {session?.title || 'Viva Session'}
            </p>
            <p className="text-label-sm text-ink-muted">
              You are monitoring anonymously — students cannot see you
            </p>
          </div>
          <div className="flex items-center gap-2 text-label-sm text-ink-secondary">
            <EyeOff className="w-4 h-4 text-success" />
            <span className="text-success font-medium">Anonymous Mode</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Left: Student list */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-ink-primary text-label-md">
              Active Students ({studentList.length})
            </h3>

            {studentList.length === 0 ? (
              <div className="card p-6 text-center text-ink-muted">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Waiting for students to join...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {studentList.map(student => {
                  const isSelected = selectedStudent === student.socketId;
                  const isDone = submittedScores[student.socketId];
                  return (
                    <div
                      key={student.socketId}
                      className={`card cursor-pointer p-3 transition-all border-2 ${isSelected ? 'border-primary' : 'border-transparent hover:border-border'}`}
                      onClick={() => setSelectedStudent(student.socketId)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {student.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-ink-primary truncate">{student.name}</p>
                          <p className="text-[11px] text-ink-muted">
                            {student.warnings > 0 ? (
                              <span className="text-danger flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                {student.warnings} warning{student.warnings > 1 ? 's' : ''}
                              </span>
                            ) : 'No violations'}
                          </p>
                        </div>
                        {isDone && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Transcript + Score */}
          <div className="col-span-2 flex flex-col gap-4">
            {!selected ? (
              <div className="card p-12 text-center text-ink-muted">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select a student to monitor</p>
              </div>
            ) : (
              <>
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
                      selected.transcript.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-high text-ink-primary'}`}>
                            <p className="font-semibold text-[10px] opacity-70 mb-0.5">
                              {msg.role === 'user' ? 'Student' : 'AI Question'}
                            </p>
                            <p>{msg.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Score form */}
                <div className="card flex flex-col gap-3">
                  <h3 className="font-semibold text-ink-primary flex items-center gap-2">
                    <Star className="w-4 h-4 text-warning" />
                    Submit Score for {selected.name}
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
