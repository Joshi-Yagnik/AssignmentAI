import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import {
  Video, Clock, Calendar, Users, PlayCircle, CheckCircle, AlertCircle
} from 'lucide-react';

const STATUS_STYLES = {
  scheduled: 'bg-info/10 text-info border border-info/20',
  live:      'bg-success/10 text-success border border-success/20',
  ended:     'bg-surface-high text-ink-muted border border-border',
};

export default function TADashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const { data } = await api.get('/viva/ta/sessions');
      setSessions(data || []);
    } catch (err) {
      if (!isPolling) {
        const msg = err.response?.data?.error || err.message || 'Unknown error';
        toast({ type: 'error', title: `Failed to load sessions: ${msg}` });
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { 
    load(); 
    const interval = setInterval(() => load(true), 3000);
    return () => clearInterval(interval);
  }, [load]);

  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const live     = sessions.filter(s => s.status === 'live');
  const ended    = sessions.filter(s => s.status === 'ended');

  return (
    <>
      <TopBar
        title="TA Dashboard"
        subtitle="Your assigned viva monitoring sessions"
      />

      <main className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{upcoming.length}</p>
              <p className="text-label-sm text-ink-muted">Scheduled</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{live.length}</p>
              <p className="text-label-sm text-ink-muted">Live Now</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-surface-high flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-ink-muted" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{ended.length}</p>
              <p className="text-label-sm text-ink-muted">Completed</p>
            </div>
          </div>
        </div>

        {/* Live sessions alert */}
        {live.length > 0 && (
          <div className="card border-l-4 border-l-success flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
              <div>
                <p className="font-semibold text-ink-primary">{live[0].title} — LIVE NOW</p>
                <p className="text-label-sm text-ink-muted">{live[0].lab_batch || live[0].class_name}</p>
              </div>
            </div>
            <button
              className="btn-primary btn-sm w-full sm:w-auto justify-center"
              onClick={() => navigate(`/ta/monitor/${live[0].id}`)}
            >
              Enter Monitor
            </button>
          </div>
        )}

        {/* Sessions list */}
        <div className="card p-0 overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-ink-primary flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" /> Assigned Sessions
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-ink-muted">
              <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No sessions assigned yet</p>
              <p className="text-label-sm mt-1">Your professor will assign you to monitor viva sessions.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map(s => {
                const scheduledDate = s.scheduled_at ? new Date(s.scheduled_at) : null;
                const isLive = s.status === 'live';
                return (
                  <div key={s.id} className="p-4 flex items-start gap-3 hover:bg-surface-high/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLive ? 'bg-success/10' : 'bg-primary/10'}`}>
                      <Video className={`w-5 h-5 ${isLive ? 'text-success' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-ink-primary truncate">{s.title}</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[s.status] || ''}`}>
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-label-sm text-ink-muted">
                        {scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {scheduledDate.toLocaleString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {s.duration_minutes} min
                        </span>
                        {(s.lab_batch || s.class_name) && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {s.class_name}{s.lab_batch ? ` / ${s.lab_batch}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-label-sm text-ink-secondary mt-0.5">
                        Prof: {s.users?.first_name} {s.users?.last_name}
                      </p>
                      {(isLive || s.status === 'scheduled') && (
                        <button
                          className={`mt-2 ${isLive ? 'btn-primary btn-sm' : 'btn btn-secondary btn-sm'}`}
                          onClick={() => navigate(`/ta/monitor/${s.id}`)}
                          disabled={s.status === 'scheduled'}
                        >
                          {isLive ? 'Monitor' : 'Pending'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
