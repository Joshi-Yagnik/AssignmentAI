import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import SubmitRequestModal from '../../components/shared/SubmitRequestModal';
import { getMyRequests, retractRequest } from '../../services/requestService';
import { getStudentAssignments } from '../../services/assignmentService';
import {
  Plus, Clock, CheckCircle2, XCircle, MessageSquare,
  Calendar, FileText, RefreshCw, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:        { label: 'Pending',          className: 'bg-warning/10 text-warning-text border border-warning/20',  dot: 'bg-warning',   icon: Clock },
  approved:       { label: 'Approved',         className: 'bg-success/10 text-success border border-success/20',       dot: 'bg-success',   icon: CheckCircle2 },
  rejected:       { label: 'Rejected',         className: 'bg-danger/10 text-danger border border-danger/20',          dot: 'bg-danger',    icon: XCircle },
  info_requested: { label: 'Info Requested',   className: 'bg-primary/10 text-primary border border-primary/20',       dot: 'bg-primary',   icon: MessageSquare },
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
  low:    { label: 'Low',    className: 'bg-surface-high text-ink-muted' },
  medium: { label: 'Medium', className: 'bg-warning/10 text-warning-text' },
  high:   { label: 'High',   className: 'bg-danger/10 text-danger' },
};

function RequestCard({ req, onRetract }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
  const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
  const TypeIcon = TYPE_ICONS[req.type] || MessageSquare;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="card p-0 overflow-hidden transition-all duration-200">
      {/* Row header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface-low/60 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Type Icon */}
        <div className="w-10 h-10 rounded-xl bg-surface-high flex items-center justify-center shrink-0">
          <TypeIcon className="w-5 h-5 text-ink-secondary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink-primary text-sm">{TYPE_LABELS[req.type] || req.type}</p>
            {req.assignments?.title && (
              <>
                <span className="text-ink-muted text-xs">·</span>
                <p className="text-ink-secondary text-xs truncate max-w-[180px]">{req.assignments.title}</p>
              </>
            )}
          </div>
          <p className="text-label-sm text-ink-muted mt-0.5">
            {new Date(req.created_at).toLocaleString()}
          </p>
        </div>

        {/* Badges + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityCfg.className}`}>
            {priorityCfg.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 bg-surface-low/40 animate-fade-in">
          <div className="flex flex-col gap-4 max-w-2xl">

            {/* Reason */}
            <div>
              <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1.5">Your Reason</p>
              <p className="text-sm text-ink-primary leading-relaxed">{req.reason}</p>
            </div>

            {/* Requested deadline (if extension) */}
            {req.type === 'deadline_extension' && req.new_deadline && (
              <div>
                <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1.5">Requested New Deadline</p>
                <p className="text-sm text-ink-primary font-medium">
                  {new Date(req.new_deadline).toLocaleString()}
                </p>
              </div>
            )}

            {/* Teacher Response */}
            {req.teacher_comment && (
              <div className={`p-3 rounded-xl border ${
                req.status === 'approved' ? 'bg-success/5 border-success/20' :
                req.status === 'rejected' ? 'bg-danger/5 border-danger/20' :
                'bg-primary/5 border-primary/10'
              }`}>
                <p className="text-label-sm font-semibold text-ink-muted uppercase mb-1">Teacher's Response</p>
                <p className="text-sm text-ink-primary">{req.teacher_comment}</p>
              </div>
            )}

            {/* Retract button for pending */}
            {req.status === 'pending' && (
              <div>
                <button
                  className="btn btn-sm btn-ghost text-danger border border-danger/20 hover:bg-danger/5 gap-1.5"
                  onClick={() => onRetract(req.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Retract Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentMyRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [reqs, asgns] = await Promise.all([
        getMyRequests(),
        getStudentAssignments().catch(() => []),
      ]);
      setRequests(reqs || []);
      setAssignments(asgns || []);
    } catch {
      toast({ type: 'error', title: 'Failed to load requests' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleRetract = async (id) => {
    if (!window.confirm('Retract this request?')) return;
    try {
      await retractRequest(id);
      setRequests(rs => rs.filter(r => r.id !== id));
      toast({ type: 'success', title: 'Request retracted.' });
    } catch (err) {
      toast({ type: 'error', title: err.response?.data?.error || err.message });
    }
  };

  const handleSubmitted = (newReq) => {
    setRequests(rs => [newReq, ...rs]);
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

  return (
    <>
      <TopBar
        title="My Requests"
        subtitle="Track your deadline extensions, grade appeals, and other requests."
        actions={
          <button className="btn btn-primary gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> New Request
          </button>
        }
      />

      <main className="p-4 md:p-6 flex flex-col gap-5 max-w-4xl mx-auto w-full">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: counts.all,            icon: RefreshCw,  color: 'bg-surface-high text-ink-secondary' },
            { label: 'Pending',  value: counts.pending,        icon: Clock,       color: 'bg-warning/10 text-warning' },
            { label: 'Approved', value: counts.approved,       icon: CheckCircle2,color: 'bg-success/10 text-success' },
            { label: 'Rejected', value: counts.rejected,       icon: XCircle,     color: 'bg-danger/10 text-danger' },
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
            {[1, 2, 3].map(i => (
              <div key={i} className="card h-20 animate-pulse bg-surface-high" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center border-dashed">
            <MessageSquare className="w-12 h-12 text-ink-muted/20 mb-3" />
            <p className="text-ink-secondary font-semibold">No {filter !== 'all' ? filter : ''} requests yet</p>
            <p className="text-label-sm text-ink-muted mt-1">Submit a request using the button above.</p>
            <button className="btn btn-primary btn-sm mt-4 gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> New Request
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(req => (
              <RequestCard key={req.id} req={req} onRetract={handleRetract} />
            ))}
          </div>
        )}

      </main>

      <SubmitRequestModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmitted={handleSubmitted}
        assignments={assignments}
      />
    </>
  );
}
