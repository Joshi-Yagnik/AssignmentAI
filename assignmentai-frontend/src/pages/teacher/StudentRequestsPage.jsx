import { useState, useEffect, useCallback, useRef } from 'react';
import TopBar from '../../components/shared/TopBar';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import { getAllRequests, resolveRequest } from '../../services/requestService';
import io from 'socket.io-client';
import {
  Clock, CheckCircle2, XCircle, MessageSquare,
  ChevronDown, ChevronUp, Calendar, FileText,
  AlertTriangle, Zap, RefreshCw
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

// ── Configs ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:        { label: 'Pending',        className: 'bg-warning/10 text-warning-text border border-warning/20', dot: 'bg-warning',  icon: Clock },
  approved:       { label: 'Approved',       className: 'bg-success/10 text-success border border-success/20',      dot: 'bg-success',  icon: CheckCircle2 },
  rejected:       { label: 'Rejected',       className: 'bg-danger/10 text-danger border border-danger/20',         dot: 'bg-danger',   icon: XCircle },
  info_requested: { label: 'Info Requested', className: 'bg-primary/10 text-primary border border-primary/20',      dot: 'bg-primary',  icon: MessageSquare },
};

const TYPE_LABELS = {
  deadline_extension: 'Deadline Extension',
  grade_appeal:       'Grade Appeal',
  other:              'Other',
};

const TYPE_ICONS = {
  deadline_extension: Calendar,
  grade_appeal:       FileText,
  other:              MessageSquare,
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    className: 'bg-surface-high text-ink-muted', order: 2 },
  medium: { label: 'Medium', className: 'bg-warning/10 text-warning-text', order: 1 },
  high:   { label: 'High',   className: 'bg-danger/10 text-danger', order: 0 },
};

// ── Action Modal ───────────────────────────────────────────────────────────────
function ActionModal({ req, onClose, onSave }) {
  const toast = useToast();
  const [status, setStatus] = useState(req.status);
  const [comment, setComment] = useState(req.teacher_comment || '');
  const [newDeadline, setNewDeadline] = useState(
    req.new_deadline ? new Date(req.new_deadline).toISOString().slice(0, 16) : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await resolveRequest(req.id, {
        status,
        teacher_comment: comment,
        new_deadline: req.type === 'deadline_extension' && newDeadline
          ? new Date(newDeadline).toISOString()
          : undefined,
      });
      toast({ type: 'success', title: 'Request updated', message: 'Student has been notified.' });
      onSave(updated);
      onClose();
    } catch (err) {
      toast({ type: 'error', title: 'Failed to update', message: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  };

  const actions = [
    { value: 'approved',       label: 'Approve',       className: 'btn-success' },
    { value: 'rejected',       label: 'Reject',        className: 'btn-danger' },
    { value: 'info_requested', label: 'Request Info',  className: 'btn-ghost border border-border' },
    { value: 'pending',        label: 'Keep Pending',  className: 'btn-ghost border border-border' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="Review Request"
      size="md"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Decision'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Student Info */}
        <div className="p-4 bg-surface-low rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center">
              {req.users?.first_name?.[0]}{req.users?.last_name?.[0]}
            </div>
            <div>
              <p className="font-semibold text-ink-primary">{req.users?.first_name} {req.users?.last_name}</p>
              <p className="text-xs text-ink-muted">{req.users?.email}</p>
            </div>
          </div>
        </div>

        {/* Request details */}
        <div>
          <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1.5">Type</p>
          <p className="text-sm text-ink-primary">{TYPE_LABELS[req.type]}</p>
          {req.assignments?.title && (
            <p className="text-xs text-ink-muted mt-0.5">Assignment: {req.assignments.title}</p>
          )}
        </div>

        <div>
          <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1.5">Student's Reason</p>
          <p className="text-sm text-ink-primary leading-relaxed bg-surface-low rounded-lg p-3">{req.reason}</p>
        </div>

        {/* Deadline fields */}
        {req.type === 'deadline_extension' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1">Current Deadline</p>
              <p className="text-sm text-ink-primary">
                {req.assignments?.deadline ? new Date(req.assignments.deadline).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1">Requested Deadline</p>
              <p className="text-sm font-medium text-warning-text">
                {req.new_deadline ? new Date(req.new_deadline).toLocaleString() : '—'}
              </p>
            </div>
            {status === 'approved' && (
              <div className="col-span-2">
                <label className="label mb-1">Confirmed New Deadline</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                />
                <p className="text-xs text-ink-muted mt-1">This will update the assignment's deadline for this student.</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div>
          <p className="text-label-sm font-semibold text-ink-muted uppercase mb-2">Decision</p>
          <div className="flex flex-wrap gap-2">
            {actions.map(a => (
              <button
                key={a.value}
                type="button"
                onClick={() => setStatus(a.value)}
                className={`btn btn-sm ${a.className} ${status === a.value ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="label mb-1" htmlFor="teacher-comment">Comment / Note to Student</label>
          <textarea
            id="teacher-comment"
            className="input resize-none"
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Explain your decision or ask for more information…"
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expanded, setExpanded] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllRequests();
      setRequests(data || []);
      setLiveCount(0); // reset new-request indicator on manual refresh
    } catch {
      toast({ type: 'error', title: 'Failed to load requests' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();

    // Real-time Socket.IO updates
    const socket = io(BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('request:new', (req) => {
      setRequests(rs => [req, ...rs]);
      setLiveCount(c => c + 1);
      toast({ type: 'info', title: 'New student request!', message: `${req.users?.first_name || 'A student'} submitted a ${TYPE_LABELS[req.type] || req.type} request.` });
    });

    socket.on('request:updated', (updatedReq) => {
      setRequests(rs => rs.map(r => r.id === updatedReq.id ? updatedReq : r));
    });

    return () => socket.disconnect();
  }, [load]);

  const handleSave = (updated) => {
    setRequests(rs => rs.map(r => r.id === updated.id ? updated : r));
  };

  const counts = {
    all:            requests.length,
    pending:        requests.filter(r => r.status === 'pending').length,
    approved:       requests.filter(r => r.status === 'approved').length,
    rejected:       requests.filter(r => r.status === 'rejected').length,
    info_requested: requests.filter(r => r.status === 'info_requested').length,
  };

  const TABS = [
    { key: 'all',            label: `All (${counts.all})` },
    { key: 'pending',        label: `Pending (${counts.pending})` },
    { key: 'approved',       label: `Approved (${counts.approved})` },
    { key: 'rejected',       label: `Rejected (${counts.rejected})` },
    { key: 'info_requested', label: `Needs Info (${counts.info_requested})` },
  ];

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const sorted = [...filtered].sort((a, b) =>
    (PRIORITY_CONFIG[a.priority]?.order ?? 9) - (PRIORITY_CONFIG[b.priority]?.order ?? 9)
  );

  return (
    <>
      <TopBar
        title="Student Requests"
        subtitle={`${counts.all} total · ${counts.pending} pending action`}
        actions={
          <div className="flex items-center gap-2">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-3 py-1.5 rounded-full animate-pulse">
                <Zap className="w-3 h-3" /> {liveCount} new
              </span>
            )}
            <button className="btn btn-ghost btn-sm gap-1.5" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        }
      />

      <main className="p-4 md:p-6 flex flex-col gap-5 max-w-5xl mx-auto w-full">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending',    value: counts.pending,        icon: Clock,       color: 'bg-warning/10 text-warning' },
            { label: 'Approved',   value: counts.approved,       icon: CheckCircle2,color: 'bg-success/10 text-success' },
            { label: 'Rejected',   value: counts.rejected,       icon: XCircle,     color: 'bg-danger/10 text-danger' },
            { label: 'Needs Info', value: counts.info_requested, icon: MessageSquare, color: 'bg-primary/10 text-primary' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card flex items-center gap-3 py-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-ink-primary leading-none">{loading ? '…' : s.value}</p>
                  <p className="text-label-sm text-ink-muted">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-surface-container rounded-full w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-1.5 text-label-sm rounded-full transition-all duration-200 ${
                filter === t.key
                  ? 'bg-white text-primary font-semibold shadow-sm'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Request List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-surface-high" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center border-dashed">
            <AlertTriangle className="w-12 h-12 text-ink-muted/20 mb-3" />
            <p className="text-ink-secondary font-semibold">No {filter !== 'all' ? filter : ''} requests</p>
            <p className="text-label-sm text-ink-muted mt-1">Students can submit requests from their dashboard.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map(req => {
              const TypeIcon = TYPE_ICONS[req.type] || MessageSquare;
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
              const isExpanded = expanded === req.id;

              return (
                <div key={req.id} className="card p-0 overflow-hidden">
                  {/* Row header */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface-low/60 transition-colors"
                    onClick={() => setExpanded(e => e === req.id ? null : req.id)}
                  >
                    {/* Avatar */}
                    <span className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {req.users?.first_name?.[0]}{req.users?.last_name?.[0]}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeIcon className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                        <p className="font-semibold text-ink-primary text-sm">{req.users?.first_name} {req.users?.last_name}</p>
                        <span className="text-ink-muted text-xs">·</span>
                        <p className="text-ink-secondary text-sm">{TYPE_LABELS[req.type]}</p>
                      </div>
                      <p className="text-label-sm text-ink-muted mt-0.5">
                        {req.assignments?.title && <span>{req.assignments.title} · </span>}
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Badges + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityCfg.className}`}>
                        {priorityCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      {req.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-primary gap-1"
                          onClick={e => { e.stopPropagation(); setActionModal(req); }}
                        >
                          Review
                        </button>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4 bg-surface-low/40 animate-fade-in">
                      <div className="flex flex-col gap-4 max-w-2xl">
                        <div>
                          <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1.5">Student's Reason</p>
                          <p className="text-sm text-ink-primary leading-relaxed">{req.reason}</p>
                        </div>
                        {req.type === 'deadline_extension' && req.new_deadline && (
                          <div>
                            <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1">Requested New Deadline</p>
                            <p className="text-sm font-medium text-warning-text">
                              {new Date(req.new_deadline).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {req.teacher_comment && (
                          <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                            <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1">Your Comment</p>
                            <p className="text-sm text-ink-primary">{req.teacher_comment}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            className="btn btn-sm btn-primary gap-1.5"
                            onClick={() => setActionModal(req)}
                          >
                            {req.status === 'pending' ? 'Review & Decide' : 'Edit Decision'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Action Modal */}
      {actionModal && (
        <ActionModal
          req={actionModal}
          onClose={() => setActionModal(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
