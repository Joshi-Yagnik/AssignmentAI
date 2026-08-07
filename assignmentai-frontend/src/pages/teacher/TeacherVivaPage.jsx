import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { getMetadataClasses } from '../../services/adminService';
import { Video, Plus, Calendar, Clock, MonitorPlay, Users, X, Bot, BarChart2 } from 'lucide-react';

export default function TeacherVivaPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [classMetadata, setClassMetadata] = useState([]);
  const [taList, setTaList] = useState([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    assignment_id: '',
    subject: '',
    topic: '',
    difficulty: 'medium',
    total_questions: 5,
    duration_minutes: 30,
    scheduled_time: '',
    ta_id: '',
    class_name: '',
    lab_batch: ''
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: sessData }, { data: asmts }] = await Promise.all([
        api.get('/viva/sessions'),
        api.get('/assignments'),
      ]);
      setSessions(sessData || []);
      setAssignments(asmts || []);

      // Load TAs and class metadata
      const { data: taUsers } = await api.get('/admin/users?role=ta');
      setTaList(taUsers || []);

      const classes = await getMetadataClasses();
      setClassMetadata(classes || []);
    } catch {
      toast({ type: 'error', title: 'Failed to load sessions' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.assignment_id && (!form.subject || !form.topic)) return;
    
    setCreating(true);
    try {
      let title = '';
      let subject = form.subject;
      let topic = form.topic;

      if (form.assignment_id) {
        const selected = assignments.find(a => a.id === form.assignment_id);
        title = `Viva for ${selected?.title}`;
        subject = selected?.subjects?.name || 'Assignment';
        topic = selected?.title || 'General';
      } else {
        title = `${form.subject} — ${form.topic}`;
      }

      await api.post('/viva/sessions', {
        title,
        duration_minutes: form.duration_minutes,
        subject,
        topic,
        difficulty: form.difficulty,
        total_questions: form.total_questions,
        assignment_id: form.assignment_id || null,
        scheduled_time: form.scheduled_time || null,
        ta_id: form.ta_id || null,
        class_name: form.class_name || null,
        lab_batch: form.lab_batch || null
      });
      toast({ type: 'success', title: 'Viva Session Created — Students will be notified!' });
      setShowModal(false);
      load();
    } catch {
      toast({ type: 'error', title: 'Failed to create session' });
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await api.patch(`/viva/sessions/${id}/status`, { status: 'live' });
      toast({ type: 'success', title: 'Session is now LIVE' });
      load();
    } catch {
      toast({ type: 'error', title: 'Failed to start session' });
    }
  };

  const handleRestart = async (id) => {
    if (!window.confirm("Are you sure you want to restart this session? It will become 'scheduled' again.")) return;
    try {
      await api.patch(`/viva/sessions/${id}/status`, { status: 'scheduled' });
      toast({ type: 'success', title: 'Session restarted' });
      load();
    } catch {
      toast({ type: 'error', title: 'Failed to restart session' });
    }
  };

  return (
    <>
      <TopBar title="AI Viva Management" subtitle="Create and monitor AI-powered oral exams." />
      <main className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-ink-primary">Your Sessions</h2>
          <button onClick={() => setShowModal(true)} className="btn-primary btn-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create AI Viva
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-ink-muted">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-12 border border-dashed border-border/60">
            <Bot className="w-10 h-10 mx-auto mb-4 text-ink-muted/50" />
            <h3 className="font-semibold text-ink-primary">No AI Viva sessions yet</h3>
            <p className="text-sm text-ink-muted mt-1">Configure an interactive AI examiner for your class.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map(s => {
              const meta = JSON.parse(s.transcript || '{}');
              const isLive = s.status === 'live';
              return (
                <div key={s.id} className={`card ${isLive ? 'border-primary/50 shadow-md shadow-primary/10' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-ink-primary">{meta.title || 'Untitled Session'}</h3>
                      <div className="text-sm text-ink-muted flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {meta.duration_minutes || 45}m</span>
                        <span className="flex items-center gap-1"><Bot className="w-3.5 h-3.5"/> {s.total_questions || 5} Questions</span>
                        <span className="flex items-center gap-1 capitalize"><Users className="w-3.5 h-3.5"/> {s.difficulty || 'medium'}</span>
                      </div>
                    </div>
                    {isLive ? (
                      <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full border border-primary/20 animate-pulse">LIVE</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-surface-high text-ink-muted text-xs font-bold rounded-full uppercase border border-border/50">{s.status}</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-5 pt-4 border-t border-border">
                    {s.status === 'scheduled' && (
                      <button onClick={() => handleStart(s.id)} className="btn-primary btn-sm flex-1">Start Session</button>
                    )}
                    {(isLive || s.status === 'scheduled') && (
                      <button onClick={() => navigate(`/teacher/viva/monitor/${s.id}`)} className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-2">
                        <MonitorPlay className="w-4 h-4" /> Monitor
                      </button>
                    )}
                    {s.status === 'completed' && (
                      <>
                        <button onClick={() => navigate(`/teacher/viva/monitor/${s.id}`)} className="btn-secondary btn-sm flex-1">
                          View Reports
                        </button>
                        <button onClick={() => handleRestart(s.id)} className="btn-outline-primary btn-sm flex-1">
                          Restart
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/teacher/viva/grading/${s.id}`)}
                      className="btn btn-ghost btn-sm flex items-center gap-1 text-primary"
                      title="Grading Queue (AI + TA)"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-border bg-surface-low">
              <h2 className="text-lg font-bold text-ink-primary flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" /> Configure AI Examiner
              </h2>
              <button onClick={() => setShowModal(false)} className="text-ink-muted hover:text-ink-primary p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 mb-2">
                <label className="label text-primary-700">Link to Assignment (Recommended)</label>
                <select 
                  className="input"
                  value={form.assignment_id}
                  onChange={e => setForm({...form, assignment_id: e.target.value})}
                >
                  <option value="">-- No Assignment (Custom Topic) --</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({a.subjects?.code || 'N/A'})</option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted mt-1">If selected, the AI will ask questions strictly based on the assignment's instructions.</p>
              </div>

              {!form.assignment_id && (
                <>
                  <div>
                    <label className="label">Subject</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Computer Science"
                      required={!form.assignment_id}
                      value={form.subject}
                      onChange={e => setForm({...form, subject: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="label">Topic to examine</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Data Structures and Trees"
                      required={!form.assignment_id}
                      value={form.topic}
                      onChange={e => setForm({...form, topic: e.target.value})}
                    />
                  </div>
                </>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Difficulty</label>
                  <select 
                    className="input"
                    value={form.difficulty}
                    onChange={e => setForm({...form, difficulty: e.target.value})}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label">Total Questions</label>
                  <input 
                    type="number" 
                    className="input" 
                    min={1} 
                    max={20}
                    value={form.total_questions}
                    onChange={e => setForm({...form, total_questions: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Duration (Minutes)</label>
                <input 
                  type="number" 
                  className="input" 
                  min={5} 
                  max={120}
                  value={form.duration_minutes}
                  onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)})}
                />
              </div>
              
              {/* ── TA & Scheduling ─────────────────────────────── */}
              <div className="border border-border rounded-xl p-4 flex flex-col gap-4">
                <p className="font-semibold text-ink-primary text-sm">TA Assignment & Scheduling</p>

                <div>
                  <label className="label">Assign TA (optional)</label>
                  <select
                    className="input"
                    value={form.ta_id}
                    onChange={e => setForm({...form, ta_id: e.target.value})}
                  >
                    <option value="">-- No TA --</option>
                    {taList.map(ta => (
                      <option key={ta.id} value={ta.id}>{ta.name || `${ta.first_name} ${ta.last_name}`} ({ta.email})</option>
                    ))}
                  </select>
                  <p className="text-xs text-ink-muted mt-1">TA will monitor students anonymously during the live session.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Class Name</label>
                    <select
                      className="input"
                      value={form.class_name}
                      onChange={e => setForm({...form, class_name: e.target.value, lab_batch: ''})}
                    >
                      <option value="">All Students</option>
                      {classMetadata.map(c => (
                        <option key={c.class_name} value={c.class_name}>{c.class_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Lab Batch</label>
                    <select
                      className="input"
                      value={form.lab_batch}
                      onChange={e => setForm({...form, lab_batch: e.target.value})}
                    >
                      <option value="">All Batches</option>
                      {(classMetadata.find(c => c.class_name === form.class_name)?.lab_batches || []).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.scheduled_time}
                    onChange={e => setForm({...form, scheduled_time: e.target.value})}
                  />
                  <p className="text-xs text-ink-muted mt-1">Students in the selected class/batch will receive a notification.</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating...' : 'Create AI Viva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
