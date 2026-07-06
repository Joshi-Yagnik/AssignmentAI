import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import {
  BookOpen, Clock, CheckCircle2, Star, Upload, ChevronRight,
  Search, Filter, AlertCircle, Calendar, FileText
} from 'lucide-react';
import { getStudentAssignments, getDownloadUrl } from '../../services/assignmentService';
import { useNavigate } from 'react-router-dom';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border border-warning/20',
    dot: 'bg-warning',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-info/10 text-info border border-info/20',
    dot: 'bg-info',
  },
  graded: {
    label: 'Graded',
    className: 'bg-success/10 text-success border border-success/20',
    dot: 'bg-success',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-danger/10 text-danger border border-danger/20',
    dot: 'bg-danger',
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-label-sm font-semibold px-2.5 py-1 rounded-full ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-[26px] font-bold text-ink-primary leading-none">{value}</p>
        <p className="text-label-md text-ink-secondary mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function formatDeadline(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (diffDays < 0)  return { text: formatted, overdue: true, label: 'Overdue' };
  if (diffDays === 0) return { text: formatted, urgent: true, label: 'Due today' };
  if (diffDays <= 2)  return { text: formatted, urgent: true, label: `${diffDays}d left` };
  return { text: formatted, label: `${diffDays}d left` };
}

function getEffectiveStatus(assignment) {
  if (assignment.submission?.status === 'graded')    return 'graded';
  if (assignment.submission?.status === 'submitted') return 'submitted';
  const now = new Date();
    if (new Date(assignment.deadline) < now)           return 'overdue';
    return 'pending';
  }
  
  const handleViewPdf = async (pathUrl) => {
    try {
      const { signedUrl } = await getDownloadUrl({ bucket: 'question-papers', path: pathUrl });
      window.open(signedUrl, '_blank');
    } catch {
      toast({ type: 'error', title: 'Failed to open question paper' });
    }
  };

export default function StudentAssignmentsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStudentAssignments();
      setAssignments(data);
    } catch {
      toast({ type: 'error', title: 'Failed to load assignments' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const enriched = assignments.map(a => ({
    ...a,
    effectiveStatus: getEffectiveStatus(a),
    deadlineInfo: formatDeadline(a.deadline),
  }));

  const filtered = enriched.filter(a => {
    const matchSearch =
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.subjects?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.effectiveStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:       enriched.length,
    pending:   enriched.filter(a => a.effectiveStatus === 'pending').length,
    submitted: enriched.filter(a => a.effectiveStatus === 'submitted').length,
    graded:    enriched.filter(a => a.effectiveStatus === 'graded').length,
    overdue:   enriched.filter(a => a.effectiveStatus === 'overdue').length,
  };

  return (
    <>
      <TopBar
        title="My Assignments"
        subtitle="View and submit your assigned work"
      />

      <main className="p-4 md:p-6 flex flex-col gap-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}    label="Total"     value={counts.all}       color="bg-info" />
          <StatCard icon={Clock}       label="Pending"   value={counts.pending}   color="bg-warning" />
          <StatCard icon={CheckCircle2} label="Submitted" value={counts.submitted} color="bg-primary" />
          <StatCard icon={Star}        label="Graded"    value={counts.graded}    color="bg-success" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input className="input pl-9" placeholder="Search assignments…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1 bg-surface-low border border-border rounded-lg p-1 flex-wrap">
            {[
              { key: 'all',       label: 'All' },
              { key: 'pending',   label: 'Pending' },
              { key: 'submitted', label: 'Submitted' },
              { key: 'graded',    label: 'Graded' },
              { key: 'overdue',   label: 'Overdue' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 text-label-sm font-semibold rounded-md transition-all ${
                  statusFilter === key
                    ? 'bg-surface shadow-sm text-ink-primary'
                    : 'text-ink-muted hover:text-ink-secondary'
                }`}>
                {label}
                <span className="ml-1.5 text-xs bg-surface-high text-ink-muted px-1.5 py-0.5 rounded-full">
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Assignment cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-surface-high rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-high rounded w-1/2 mb-4" />
                <div className="h-8 bg-surface-high rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 text-ink-muted/30 mb-4" />
            <p className="text-ink-secondary font-medium">No assignments found</p>
            <p className="text-label-sm text-ink-muted mt-1">
              {search ? `No results for "${search}"` : 'No assignments match the selected filter'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => {
              const dl = a.deadlineInfo;
              const isOverdue = a.effectiveStatus === 'overdue';
              const isPending = a.effectiveStatus === 'pending';
              const isGraded  = a.effectiveStatus === 'graded';
              const score     = a.submission?.ai_reports?.[0]?.final_score;

              return (
                <div key={a.id} className="card flex flex-col gap-3 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <StatusBadge status={a.effectiveStatus} />
                  </div>

                  {/* Title + subject */}
                  <div>
                    <h3 className="font-semibold text-ink-primary leading-snug">{a.title}</h3>
                    <p className="text-label-sm text-ink-muted mt-0.5">
                      {a.subjects?.name || 'No subject'} · {a.subjects?.code || ''}
                    </p>
                  </div>

                  {/* Deadline */}
                  <div className={`flex items-center gap-1.5 text-label-sm font-medium ${isOverdue ? 'text-danger' : dl?.urgent ? 'text-warning' : 'text-ink-muted'}`}>
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{typeof dl === 'string' ? dl : dl?.text}</span>
                    {dl?.label && <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isOverdue ? 'bg-danger/10 text-danger' : dl?.urgent ? 'bg-warning/10 text-warning' : 'bg-surface-high text-ink-muted'
                    }`}>{dl.label}</span>}
                  </div>

                  {/* Grade (if graded) */}
                  {isGraded && score != null && (
                    <div className="flex items-center gap-2 p-2 bg-success/5 border border-success/20 rounded-lg">
                      <Star className="w-4 h-4 text-success" />
                      <span className="text-label-sm font-semibold text-success">Score: {score}</span>
                    </div>
                  )}

                  {/* Question PDF link */}
                  {a.question_pdf_url && (
                    <button type="button" onClick={() => handleViewPdf(a.question_pdf_url)}
                      className="flex items-center gap-1.5 text-label-sm text-primary hover:underline font-medium text-left">
                      <FileText className="w-3.5 h-3.5" /> View Question Paper
                    </button>
                  )}

                  {/* Action button */}
                  <div className="mt-auto pt-2">
                    {isPending ? (
                      <button
                        className="btn-primary btn-sm w-full flex items-center justify-center gap-2"
                        onClick={() => navigate(`/student/submit/${a.id}`)}
                      >
                        <Upload className="w-4 h-4" /> Submit Assignment
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-2"
                        onClick={() => navigate(`/student/submit/${a.id}`)}
                      >
                        View Submission <ChevronRight className="w-4 h-4" />
                      </button>
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
