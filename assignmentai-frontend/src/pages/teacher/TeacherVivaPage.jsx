import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { Video, Plus, Calendar, Clock, MonitorPlay, Users, X, Bot } from 'lucide-react';

export default function TeacherVivaPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    topic: '',
    difficulty: 'medium',
    total_questions: 5,
    duration_minutes: 30
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/viva/sessions');
      setSessions(data || []);
    } catch {
      toast({ type: 'error', title: 'Failed to load sessions' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.topic) return;
    
    setCreating(true);
    try {
      await api.post('/viva/sessions', {
        title: `${form.subject} — ${form.topic}`,
        duration_minutes: form.duration_minutes,
        subject: form.subject,
        topic: form.topic,
        difficulty: form.difficulty,
        total_questions: form.total_questions
      });
      toast({ type: 'success', title: 'AI Viva Session Created' });
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
                        <MonitorPlay className="w-4 h-4" /> Monitor Students
                      </button>
                    )}
                    {s.status === 'completed' && (
                      <button onClick={() => navigate(`/teacher/viva/monitor/${s.id}`)} className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-2">
                        View Reports
                      </button>
                    )}
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
              <div>
                <label className="label">Subject</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Computer Science"
                  required
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
                  required
                  value={form.topic}
                  onChange={e => setForm({...form, topic: e.target.value})}
                />
              </div>
              
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
