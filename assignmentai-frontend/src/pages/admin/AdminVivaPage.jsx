import { useState, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import api from '../../services/api';
import { Video, ShieldAlert, CheckCircle2, Search } from 'lucide-react';

export default function AdminVivaPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/viva/sessions')
       .then(({ data }) => setSessions(data || []))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  const liveCount = sessions.filter(s => s.status === 'live').length;
  const violationCount = sessions.reduce((acc, s) => acc + (s.warnings_count || 0), 0);

  return (
    <>
      <TopBar title="Viva Management" subtitle="Platform-wide monitoring of live viva exams." />
      
      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-surface flex flex-col justify-center">
            <span className="text-label-sm text-ink-muted flex items-center gap-2"><Video className="w-4 h-4 text-primary"/> Total Sessions</span>
            <span className="text-3xl font-bold mt-2">{sessions.length}</span>
          </div>
          <div className="card bg-surface flex flex-col justify-center border-b-4 border-danger">
            <span className="text-label-sm text-ink-muted flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-danger animate-pulse" /> Active Live
            </span>
            <span className="text-3xl font-bold mt-2">{liveCount}</span>
          </div>
          <div className="card bg-surface flex flex-col justify-center">
            <span className="text-label-sm text-ink-muted flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-warning"/> Total Violations</span>
            <span className="text-3xl font-bold mt-2">{violationCount}</span>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-surface-low">
            <h3 className="font-bold text-ink-primary">All Sessions</h3>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input type="text" placeholder="Search sessions..." className="input pl-9 h-9 text-sm w-full" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-low text-label-sm text-ink-muted border-b border-border">
                  <th className="p-4 font-semibold">Session Details</th>
                  <th className="p-4 font-semibold">Teacher</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Security Flags</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-ink-muted">Loading sessions...</td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-ink-muted">No sessions found in the system.</td></tr>
                ) : sessions.map(s => {
                  let meta = {};
                  if (typeof s.transcript === 'object' && s.transcript !== null) {
                    meta = s.transcript;
                  } else if (typeof s.transcript === 'string') {
                    try { meta = JSON.parse(s.transcript); } catch (_) {}
                  }
                  const sessionTitle = s.topic || s.subject || meta.title || 'Untitled Session';
                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-surface-high/50 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-ink-primary">{sessionTitle}</p>
                        <p className="text-xs text-ink-muted mt-1">{s.scheduled_time ? new Date(s.scheduled_time).toLocaleString() : '—'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium">{s.users ? `${s.users.first_name} ${s.users.last_name}` : 'Unknown'}</p>
                        <p className="text-xs text-ink-muted">{s.users?.email}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                          ${s.status === 'live' ? 'bg-danger/10 text-danger' : 
                            s.status === 'scheduled' ? 'bg-primary/10 text-primary' : 'bg-surface-high text-ink-muted'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {s.warnings_count > 0 ? (
                          <span className="flex items-center gap-1.5 text-sm text-warning-text font-bold">
                            <ShieldAlert className="w-4 h-4" /> {s.warnings_count} Flags
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm text-success font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Secure
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
