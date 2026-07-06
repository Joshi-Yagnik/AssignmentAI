import { useState } from 'react';
import TopBar from '../../components/shared/TopBar';
import StatusBadge from '../../components/shared/StatusBadge';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import {
  Clock, CheckCircle, MessageSquare,
  ChevronDown, ChevronUp, Paperclip
} from 'lucide-react';
import { STUDENT_REQUESTS } from '../../data/mockData';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function StudentRequestsPage() {
  const toast = useToast();
  const [filter, setFilter]     = useState('pending');
  const [expanded, setExpanded] = useState('r1');
  const [resolveModal, setResolveModal] = useState(null);
  const [requests, setRequests] = useState(STUDENT_REQUESTS);

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const sorted = [...filtered].sort((a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
  );

  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    resolved: requests.filter(r => r.status === 'resolved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const handleAction = (id, action) => {
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status: action } : r));
    setExpanded(null);
    toast({ type: action === 'resolved' ? 'success' : 'error', title: action === 'resolved' ? 'Request approved.' : 'Request rejected.', message: 'Student will be notified.' });
  };

  const TABS = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'pending',  label: `Pending (${counts.pending})` },
    { key: 'resolved', label: `Resolved (${counts.resolved})` },
    { key: 'rejected', label: `Rejected (${counts.rejected})` },
  ];

  return (
    <>
      <TopBar
        title="Student Requests"
        subtitle={`${counts.all} total · ${counts.pending} pending action`}
        showSearch
        breadcrumb={['Students', 'Student Requests']}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => toast({ type: 'info', title: 'Exporting…' })}>
            Export
          </button>
        }
      />

      <main className="p-6 flex flex-col gap-5">
        {/* Summary chips */}
        <div className="flex items-center gap-3">
          <div className="card py-3 px-5 flex items-center gap-3">
            <Clock className="w-4 h-4 text-warning" />
            <div>
              <p className="text-[20px] font-bold text-ink-primary leading-none">{counts.pending}</p>
              <p className="text-label-sm text-ink-muted">Pending</p>
            </div>
          </div>
          <div className="card py-3 px-5 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-success" />
            <div>
              <p className="text-[20px] font-bold text-ink-primary leading-none">3</p>
              <p className="text-label-sm text-ink-muted">Resolved Today</p>
            </div>
          </div>
          <div className="card py-3 px-5 flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[20px] font-bold text-ink-primary leading-none">4.2h</p>
              <p className="text-label-sm text-ink-muted">Avg. Response</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex p-1 bg-surface-container rounded-full w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-5 py-2 text-label-md rounded-full transition-all duration-200
                ${filter === t.key
                  ? 'bg-white text-primary font-semibold shadow-sm shadow-primary/10'
                  : 'text-ink-muted hover:text-ink-primary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Request rows */}
        <div className="flex flex-col gap-2">
          {sorted.map(req => (
            <div key={req.id} className="card p-0 overflow-hidden">
              {/* Row header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface-low transition-colors"
                onClick={() => setExpanded(e => e === req.id ? null : req.id)}
              >
                {/* Avatar */}
                <span className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {req.avatar}
                </span>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink-primary text-sm">{req.student}</p>
                    <span className="text-ink-muted text-xs">·</span>
                    <p className="text-ink-secondary text-sm">{req.type}</p>
                  </div>
                  <p className="text-label-sm text-ink-muted mt-0.5">
                    {req.assignment} · {req.course} · {req.submitted}
                  </p>
                </div>
                {/* Badges + action */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={req.priority} />
                  <StatusBadge status={req.status}   />
                  {req.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-sm bg-success-bg text-success-text border border-success/30 hover:bg-success/20"
                        onClick={e => { e.stopPropagation(); handleAction(req.id, 'resolved'); }}
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        className="btn btn-sm bg-danger-bg text-danger-text border border-danger/30 hover:bg-danger/20"
                        onClick={e => { e.stopPropagation(); handleAction(req.id, 'rejected'); }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {expanded === req.id
                    ? <ChevronUp className="w-4 h-4 text-ink-muted" />
                    : <ChevronDown className="w-4 h-4 text-ink-muted" />
                  }
                </div>
              </div>

              {/* Expanded details */}
              {expanded === req.id && (
                <div className="border-t border-border px-5 py-4 bg-primary-50/40 animate-fade-in">
                  <div className="flex flex-col gap-4 max-w-2xl">
                    <div>
                      <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1.5">Student Reason</p>
                      <p className="text-label-md text-ink-primary">{req.reason}</p>
                      <button className="flex items-center gap-1.5 text-label-sm text-primary mt-2 hover:underline">
                        <Paperclip className="w-3.5 h-3.5" /> View Attachment
                      </button>
                    </div>
                    {req.type === 'Deadline Extension' && (
                      <div>
                        <label className="label">Extend Deadline To</label>
                        <input type="date" className="input w-48" defaultValue="2026-07-12" />
                      </div>
                    )}
                    <div>
                      <label className="label">Admin Note</label>
                      <textarea className="input resize-none" rows={2} placeholder="Add an internal note…" />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleAction(req.id, 'resolved')}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {req.type === 'Deadline Extension' ? 'Approve Extension' : 'Approve'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleAction(req.id, 'rejected')}
                      >
                        Reject
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toast({ type: 'info', title: 'Info requested from student.' })}
                      >
                        Request More Info
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {sorted.length === 0 && (
            <div className="card text-center py-16 text-ink-muted">
              No {filter} requests.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
