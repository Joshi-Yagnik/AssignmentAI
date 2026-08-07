import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import { BarChart2, Bot, Star, ChevronDown, AlertTriangle, CheckCircle2, Minus, ArrowUpDown, Send } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

const POLICY_OPTIONS = [
  { value: 'ai_only',  label: 'AI Only',      desc: 'Use AI score exclusively' },
  { value: 'ta_only',  label: 'TA Only',       desc: 'Use TA score exclusively' },
  { value: 'max',      label: 'Max (AI, TA)',   desc: 'Higher of the two scores' },
  { value: 'min',      label: 'Min (AI, TA)',   desc: 'Lower of the two scores' },
  { value: 'avg',      label: 'Average',        desc: '(AI + TA) / 2' },
];

function DivergenceBadge({ divergence }) {
  if (divergence === null) return <span className="text-ink-muted text-xs">—</span>;
  if (divergence === 0)    return <span className="flex items-center gap-1 text-success text-xs font-semibold"><CheckCircle2 className="w-3 h-3" />Match</span>;
  if (divergence <= 10)   return <span className="flex items-center gap-1 text-info text-xs font-semibold"><ArrowUpDown className="w-3 h-3" />±{divergence}</span>;
  if (divergence <= 20)   return <span className="flex items-center gap-1 text-warning text-xs font-semibold"><ArrowUpDown className="w-3 h-3" />±{divergence}</span>;
  return <span className="flex items-center gap-1 text-danger text-xs font-semibold"><AlertTriangle className="w-3 h-3" />±{divergence}</span>;
}

export default function VivaGradingQueuePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState('ai_only');
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [declaringResult, setDeclaringResult] = useState({}); // { studentSessionId: true/false }
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/viva/sessions/${sessionId}/grading-queue`);
      setSession(data.session);
      setQueue(data.queue || []);
      setPolicy(data.session?.score_policy || 'ai_only');
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load grading queue', message: err?.response?.data?.error || '' });
    } finally {
      setLoading(false);
    }
  }, [sessionId, toast]);

  useEffect(() => { load(); }, [load]);

  // Socket: update TA score live when TA submits
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_viva', { sessionId, role: 'teacher' });
    socketRef.current.on('ta_score_submitted', (data) => {
      setQueue(prev => prev.map(s =>
        s.student_id === data.studentId
          ? { ...s, ta_score: data.taScore, ta_notes: data.notes }
          : s
      ));
      toast({ type: 'info', title: '📝 TA Score Updated', message: `${data.studentName}: ${data.taScore}/100` });
    });
    return () => socketRef.current?.disconnect();
  }, [sessionId, toast]);

  const declareResult = async (student) => {
    if (!student.student_session_id) {
      return toast({ type: 'warning', title: 'Cannot declare — student has not taken this viva yet' });
    }
    const score = student.final_score;
    if (score == null) {
      return toast({ type: 'warning', title: 'No final score available to declare' });
    }
    setDeclaringResult(prev => ({ ...prev, [student.student_id]: true }));
    try {
      await api.post(`/viva/sessions/${sessionId}/declare-result`, {
        studentSessionId: student.student_session_id,
        finalScore: score,
      });
      setQueue(prev => prev.map(s =>
        s.student_id === student.student_id ? { ...s, result_declared: true } : s
      ));
      toast({ type: 'success', title: `✅ Result declared for ${student.name}` });
    } catch (err) {
      toast({ type: 'error', title: 'Failed to declare result', message: err?.response?.data?.error || '' });
    } finally {
      setDeclaringResult(prev => ({ ...prev, [student.student_id]: false }));
    }
  };

  const handlePolicyChange = async (newPolicy) => {
    setPolicy(newPolicy);
    setSavingPolicy(true);
    try {
      await api.patch(`/viva/sessions/${sessionId}/score-policy`, { score_policy: newPolicy });
      toast({ type: 'success', title: `Score policy updated to: ${POLICY_OPTIONS.find(p => p.value === newPolicy)?.label}` });
      load();
    } catch {
      toast({ type: 'error', title: 'Failed to update policy' });
    } finally {
      setSavingPolicy(false);
    }
  };

  const policyLabel = POLICY_OPTIONS.find(p => p.value === policy)?.label || policy;

  return (
    <>
      <TopBar
        title="Viva Grading Queue"
        subtitle={session?.title || 'Loading...'}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
        }
      />

      <main className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-5">

        {/* Session info + Policy selector */}
        <div className="card flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="font-bold text-ink-primary">{session?.title || '—'}</h2>
            <p className="text-label-sm text-ink-muted mt-0.5">
              {session?.class_name}{session?.lab_batch ? ` / ${session?.lab_batch}` : ''} • {queue.length} students
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-ink-muted font-semibold">Scoring Policy</label>
            <div className="relative">
              <select
                className="input pr-10 font-semibold text-primary appearance-none"
                value={policy}
                onChange={e => handlePolicyChange(e.target.value)}
                disabled={savingPolicy}
              >
                {POLICY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
            </div>
            {savingPolicy && <p className="text-label-sm text-ink-muted">Saving...</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{queue.length}</p>
              <p className="text-label-sm text-ink-muted">Total Students</p>
            </div>
          </div>
          <div className="card py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{queue.filter(q => q.ai_score !== null).length}</p>
              <p className="text-label-sm text-ink-muted">AI Graded</p>
            </div>
          </div>
          <div className="card py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{queue.filter(q => q.ta_score !== null).length}</p>
              <p className="text-label-sm text-ink-muted">TA Graded</p>
            </div>
          </div>
          <div className="card py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{queue.filter(q => q.divergence !== null && q.divergence > 20).length}</p>
              <p className="text-label-sm text-ink-muted">High Divergence</p>
            </div>
          </div>
        </div>

        {/* Grading Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-low text-label-sm text-ink-muted border-b border-border">
                  <th className="p-4 font-semibold">Student</th>
                  <th className="p-4 font-semibold text-center">Enrollment</th>
                  <th className="p-4 font-semibold text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-info" /> AI Score
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-warning" /> TA Score
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-center">Divergence</th>
                  <th className="p-4 font-semibold text-center bg-primary/5 text-primary">Final Score</th>
                  <th className="p-4 font-semibold text-right">TA Notes</th>
                  <th className="p-4 font-semibold text-center text-success">Declare</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border animate-pulse">
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-32" /></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-20 mx-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-12 mx-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-12 mx-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-16 mx-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-12 mx-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : queue.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-ink-muted">
                      No students found in this session's batch.
                    </td>
                  </tr>
                ) : (
                  queue.map(student => (
                    <tr key={student.student_id} className="border-b border-border hover:bg-surface-high/40 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-ink-primary">{student.name}</p>
                          <p className="text-xs text-ink-muted">{student.email}</p>
                          {student.lab_batch && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-high border border-border font-bold uppercase text-ink-secondary mt-0.5 inline-block">
                              {student.lab_batch}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center text-sm text-ink-secondary">
                        {student.enrollment_number || '—'}
                      </td>
                      <td className="p-4 text-center">
                        {student.ai_score !== null ? (
                          <span className="inline-flex items-center gap-1 font-bold text-info bg-info/10 px-2 py-1 rounded-lg text-sm">
                            <Bot className="w-3 h-3" />{student.ai_score}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-sm">Pending</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {student.ta_score !== null ? (
                          <span className="inline-flex items-center gap-1 font-bold text-warning bg-warning/10 px-2 py-1 rounded-lg text-sm">
                            <Star className="w-3 h-3" />{student.ta_score}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-sm">Not graded</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <DivergenceBadge divergence={student.divergence} />
                      </td>
                      <td className="p-4 text-center bg-primary/5">
                        {student.final_score !== null ? (
                          <span className="font-extrabold text-primary text-lg">{student.final_score}</span>
                        ) : (
                          <span className="text-ink-muted text-sm flex items-center justify-center gap-1">
                            <Minus className="w-3.5 h-3.5" /> —
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {student.ta_notes ? (
                          <span className="text-xs text-ink-secondary italic">{student.ta_notes}</span>
                        ) : (
                          <span className="text-ink-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {student.result_declared ? (
                          <span className="flex items-center justify-center gap-1 text-success text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Declared
                          </span>
                        ) : (
                          <button
                            onClick={() => declareResult(student)}
                            disabled={declaringResult[student.student_id] || student.final_score == null}
                            className="btn btn-primary btn-sm flex items-center gap-1 text-xs mx-auto disabled:opacity-40"
                          >
                            <Send className="w-3 h-3" />
                            {declaringResult[student.student_id] ? 'Sending...' : 'Declare'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-label-sm text-ink-muted text-center">
          Policy: <strong className="text-ink-primary">{policyLabel}</strong> — Final scores update automatically when you change the policy.
        </p>
      </main>
    </>
  );
}
