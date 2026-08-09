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

      <main className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-6 relative z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-info/5 pointer-events-none -z-10 rounded-3xl hidden md:block"></div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="card relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-info bg-white/80 backdrop-blur-sm">
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none">
              <Calendar className="w-32 h-32 text-info" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 flex items-center justify-center shrink-0 shadow-sm border border-info/10 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-ink-primary tracking-tight">{upcoming.length}</p>
                <p className="text-sm font-medium text-ink-secondary">Scheduled</p>
              </div>
            </div>
          </div>
          <div className="card relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-success bg-white/80 backdrop-blur-sm">
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none">
              <PlayCircle className="w-32 h-32 text-success" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center shrink-0 shadow-sm border border-success/10 group-hover:scale-110 transition-transform duration-300">
                <PlayCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-ink-primary tracking-tight">{live.length}</p>
                <p className="text-sm font-medium text-ink-secondary">Live Now</p>
              </div>
            </div>
          </div>
          <div className="card relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-ink-muted bg-white/80 backdrop-blur-sm">
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.02] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 pointer-events-none">
              <CheckCircle className="w-32 h-32 text-ink-primary" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-surface-high to-surface-low flex items-center justify-center shrink-0 shadow-sm border border-border group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-6 h-6 text-ink-muted" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-ink-primary tracking-tight">{ended.length}</p>
                <p className="text-sm font-medium text-ink-secondary">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live sessions alert */}
        {live.length > 0 && (
          <div className="bg-gradient-to-r from-success/10 via-success/5 to-transparent rounded-2xl border border-success/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-fade-in shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-success/5 animate-pulse-soft pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center shrink-0 relative">
                <span className="absolute inset-0 rounded-full border-2 border-success/30 animate-ping opacity-75 duration-1000"></span>
                <span className="w-4 h-4 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
              </div>
              <div>
                <p className="font-bold text-lg text-ink-primary flex items-center gap-2">
                  {live[0].title}
                  <span className="px-2.5 py-0.5 rounded-full bg-success text-white text-[10px] uppercase font-extrabold tracking-wider shadow-sm">Live Now</span>
                </p>
                <p className="text-sm text-ink-secondary font-medium mt-0.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {live[0].lab_batch || live[0].class_name}
                </p>
              </div>
            </div>
            <button
              className="btn bg-success text-white hover:bg-success/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 shadow-success/20 transition-all duration-300 w-full sm:w-auto justify-center relative z-10 px-6 py-2.5 font-bold"
              onClick={() => navigate(`/ta/monitor/${live[0].id}`)}
            >
              <PlayCircle className="w-5 h-5 mr-1" /> Monitor Session
            </button>
          </div>
        )}

        {/* Sessions list */}
        <div className="card p-0 overflow-hidden shadow-sm border border-border/60 bg-white/90 backdrop-blur-md">
          <div className="p-6 border-b border-border/50 bg-surface-low/30 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink-primary flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                Assigned Sessions
              </h2>
              <p className="text-sm text-ink-muted mt-2 ml-12">Monitor and evaluate your assigned viva exams.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-16 text-center text-ink-muted flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-surface-high to-surface rounded-full flex items-center justify-center mb-6 shadow-inner border border-border/50">
                <Video className="w-10 h-10 text-primary/40" />
              </div>
              <p className="text-lg font-bold text-ink-primary">No sessions assigned yet</p>
              <p className="text-sm mt-2 max-w-sm text-ink-secondary">You're all caught up! When a professor assigns you to monitor a viva session, it will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {sessions.map(s => {
                const scheduledDate = s.scheduled_at ? new Date(s.scheduled_at) : null;
                const isLive = s.status === 'live';
                return (
                  <div key={s.id} className="p-5 flex items-start sm:items-center gap-4 hover:bg-primary/5 transition-all duration-300 group relative overflow-hidden">
                    {isLive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>}
                    
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${isLive ? 'bg-gradient-to-br from-success/20 to-success/5 border border-success/20' : 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10'}`}>
                      <Video className={`w-5 h-5 ${isLive ? 'text-success' : 'text-primary'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap mb-1.5">
                          <p className="text-base font-bold text-ink-primary truncate group-hover:text-primary transition-colors">{s.title}</p>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${STATUS_STYLES[s.status] || ''}`}>
                            {s.status}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-secondary">
                          {scheduledDate && (
                            <span className="flex items-center gap-1.5 bg-surface-high/50 px-2 py-0.5 rounded-md border border-border/50">
                              <Calendar className="w-3.5 h-3.5 opacity-70" />
                              <span className="font-medium text-ink-primary">{scheduledDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-70" />
                            {s.duration_minutes} min
                          </span>
                          {(s.lab_batch || s.class_name) && (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 opacity-70" />
                              {s.class_name}{s.lab_batch ? ` / ${s.lab_batch}` : ''}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-ink-secondary mt-2.5 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold border border-indigo-200">
                            {s.users?.first_name?.[0]}{s.users?.last_name?.[0]}
                          </span>
                          <span className="font-medium">Prof. {s.users?.first_name} {s.users?.last_name}</span>
                        </p>
                      </div>
                      
                      {(isLive || s.status === 'scheduled') && (
                        <div className="shrink-0 mt-2 sm:mt-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 transform sm:translate-x-4 group-hover:translate-x-0">
                          <button
                            className={`w-full sm:w-auto shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${isLive ? 'bg-success text-white hover:bg-success/90' : 'bg-white text-primary border border-primary/20 hover:border-primary hover:bg-primary/5'}`}
                            onClick={() => navigate(`/ta/monitor/${s.id}`)}
                          >
                            <PlayCircle className={`w-4 h-4 ${isLive ? 'text-white' : 'text-primary'}`} />
                            {isLive ? 'Monitor Now' : 'Enter Room'}
                          </button>
                        </div>
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
