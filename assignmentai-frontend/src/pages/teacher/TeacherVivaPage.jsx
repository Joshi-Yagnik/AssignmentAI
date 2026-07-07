import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { Video, Plus, Calendar, Clock, MonitorPlay, Users } from 'lucide-react';

export default function TeacherVivaPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleCreate = async () => {
    try {
      const questions = [
        { text: 'Define Artificial Intelligence and explain its key branches.', difficulty: 'easy' },
        { text: 'Explain supervised vs unsupervised learning.', difficulty: 'medium' }
      ];
      await api.post('/viva/sessions', {
        title: 'New AI Viva Session',
        duration_minutes: 45,
        questions
      });
      toast({ type: 'success', title: 'Session Created' });
      load();
    } catch {
      toast({ type: 'error', title: 'Failed to create session' });
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
      <TopBar title="Live Viva Management" subtitle="Create and monitor live viva sessions for your classes." />
      <main className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-ink-primary">Your Sessions</h2>
          <button onClick={handleCreate} className="btn-primary btn-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Session
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-ink-muted">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-12">
            <Video className="w-10 h-10 mx-auto mb-4 text-ink-muted/50" />
            <h3 className="font-semibold text-ink-primary">No sessions yet</h3>
            <p className="text-sm text-ink-muted mt-1">Create your first live viva session above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map(s => {
              const meta = JSON.parse(s.transcript || '{}');
              const isLive = s.status === 'live';
              return (
                <div key={s.id} className={`card ${isLive ? 'border-danger/30 border-2' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-ink-primary">{meta.title || 'Untitled Session'}</h3>
                      <div className="text-sm text-ink-muted flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {meta.duration_minutes || 45}m</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> All Enrolled</span>
                      </div>
                    </div>
                    {isLive ? (
                      <span className="px-2 py-1 bg-danger/10 text-danger text-xs font-bold rounded-full animate-pulse">LIVE</span>
                    ) : (
                      <span className="px-2 py-1 bg-surface-high text-ink-muted text-xs font-bold rounded-full uppercase">{s.status}</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    {s.status === 'scheduled' && (
                      <button onClick={() => handleStart(s.id)} className="btn-primary btn-sm flex-1">Start Session</button>
                    )}
                    {(isLive || s.status === 'scheduled') && (
                      <button onClick={() => navigate(`/teacher/viva/monitor/${s.id}`)} className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-2">
                        <MonitorPlay className="w-4 h-4" /> Monitor
                      </button>
                    )}
                    {s.status === 'completed' && (
                      <button disabled className="btn-secondary btn-sm flex-1 opacity-50">Session Ended</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
