import { useState, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import { useAuth } from '../../context/AuthContext';
import { getStudentAssignments } from '../../services/assignmentService';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CheckCircle, Clock, Star, Video,
  Upload, ChevronRight, Zap, File as FileIcon, X
} from 'lucide-react';
import {
  VIVA_SESSIONS
} from '../../data/mockData';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[26px] font-bold text-ink-primary leading-none">{value}</p>
        <p className="text-label-md text-ink-secondary mt-0.5">{label}</p>
        {sub && <p className="text-label-sm text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function getEffectiveStatus(assignment) {
  if (assignment.submission?.status === 'graded')    return 'graded';
  if (assignment.submission?.status === 'submitted') return 'submitted';
  const now = new Date();
  if (new Date(assignment.deadline) < now)           return 'overdue';
  return 'pending';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await getStudentAssignments();
        const enriched = data.map(a => ({
          ...a,
          effectiveStatus: getEffectiveStatus(a),
          courseLabel: a.subjects?.name || 'Unknown Course',
        }));
        setAssignments(enriched);
      } catch (err) {
        toast({ type: 'error', title: 'Failed to load assignments' });
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [toast]);

  const stats = {
    total:     assignments.length,
    submitted: assignments.filter(a => a.effectiveStatus === 'submitted').length,
    pending:   assignments.filter(a => a.effectiveStatus === 'pending').length,
    graded:    assignments.filter(a => a.effectiveStatus === 'graded').length,
    avgGrade:  Math.round(assignments.filter(a => a.submission?.ai_reports?.[0]?.final_score).reduce((s, a) => s + (a.submission?.ai_reports?.[0]?.final_score || 0), 0)
               / (assignments.filter(a => a.submission?.ai_reports?.[0]?.final_score).length || 1)) || 0,
  };

  const columns = [
    { key: 'title',    label: 'Assignment',  sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-semibold text-ink-primary">{v}</p>
          <p className="text-label-sm text-ink-muted mt-0.5">{row.courseLabel}</p>
        </div>
      )
    },
    { key: 'courseLabel',   label: 'Course',    sortable: true, width: '130px' },
    { key: 'deadline', label: 'Deadline',  sortable: true, width: '110px',
      render: (v) => {
        if (!v) return '—';
        return <span className="text-ink-secondary">{new Date(v).toLocaleDateString()}</span>;
      }
    },
    { key: 'effectiveStatus',   label: 'Status',   width: '120px',
      render: v => <StatusBadge status={v} />
    },
    { key: 'aiGrade',  label: 'AI Grade', width: '100px',
      render: (v, row) => {
        const score = row.submission?.ai_reports?.[0]?.final_score;
        return score != null
          ? <span className="font-semibold text-primary-700">{score}/100</span>
          : <span className="text-ink-muted">—</span>
      }
    },
    { key: 'id',       label: 'Action',   width: '130px',
      render: (v, row) => (
        row.effectiveStatus === 'pending' || row.effectiveStatus === 'overdue'
          ? <button
              className="btn btn-primary btn-sm gap-1 w-full"
              onClick={() => navigate(`/student/submit/${row.id}`)}
            >
              <Upload className="w-3 h-3" aria-hidden="true" /> Submit
            </button>
          : <button
              className="btn btn-secondary btn-sm gap-1 w-full"
              onClick={() => navigate(`/student/submit/${row.id}`)}
            >
              View <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
      )
    },
  ];

  return (
    <>
      <TopBar
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Student'}! 👋`}
        subtitle="Here's your assignment overview"
        showSearch
      />

      <main className="p-4 md:p-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}    label="Total Assignments" value={stats.total}    color="bg-info"    />
          <StatCard icon={CheckCircle} label="Submitted"         value={stats.submitted} sub="On time" color="bg-success" />
          <StatCard icon={Clock}       label="Pending"           value={stats.pending}  sub="Due soon" color="bg-warning" />
          <StatCard icon={Star}        label="Average Grade"     value={`${stats.avgGrade}%`} color="bg-primary" />
        </div>

        {/* Upcoming Viva alert */}
        {VIVA_SESSIONS[0] && (
          <div className="card border-l-4 border-l-danger flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-danger-bg flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-danger" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-primary">{VIVA_SESSIONS[0].title}</p>
                  <StatusBadge status="live" dot />
                </div>
                <p className="text-label-md text-ink-secondary">
                  Scheduled: {VIVA_SESSIONS[0].date} at {VIVA_SESSIONS[0].time} · Countdown: 2h 15m
                </p>
              </div>
            </div>
            <button
              className="btn-primary btn-sm shrink-0 w-full sm:w-auto justify-center"
              onClick={() => toast({ type: 'success', title: 'Joining Viva…', message: 'Your camera will be requested.' })}
            >
              <Zap className="w-4 h-4" aria-hidden="true" /> Join Viva
            </button>
          </div>
        )}

        {/* Assignment list */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <h2 className="text-headline-sm">My Assignments</h2>
            <span className="text-label-sm text-ink-muted">{assignments.length} total</span>
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={assignments}
              searchable
              searchKeys={['title', 'courseLabel']}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </>
  );
}
