import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import {
  Search, Mail, Filter, ShieldAlert, CheckCircle2,
  ChevronRight, UserCircle, BookOpen, BarChart2, Clock
} from 'lucide-react';

function GradeBar({ score }) {
  if (score === null || score === undefined) return <span className="text-ink-muted text-xs italic">No grades yet</span>;
  const color = score >= 85 ? 'bg-success' : score >= 70 ? 'bg-primary' : score >= 50 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold text-sm ${score >= 85 ? 'text-success' : score >= 70 ? 'text-primary' : score >= 50 ? 'text-warning-text' : 'text-danger'}`}>
        {score}%
      </span>
      <div className="w-16 h-1.5 bg-surface-high rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function TeacherStudentsPage() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch students who submitted to THIS teacher's assignments
      const { data } = await api.get('/submissions/teacher/students');
      setStudents(data || []);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load students', message: err?.response?.data?.error || '' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const email = (s.email || '').toLowerCase();
    const q = search.toLowerCase();
    if (q && !name.includes(q) && !email.includes(q)) return false;
    if (filterStatus === 'flagged' && (s.avg_score === null || s.avg_score >= 60)) return false;
    if (filterStatus === 'good' && (s.avg_score === null || s.avg_score < 60)) return false;
    return true;
  });

  return (
    <>
      <TopBar
        title="My Students"
        subtitle="Students who have submitted work to your assignments — with real performance data."
      />

      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">{students.length}</p>
              <p className="text-label-sm text-ink-muted">Total Students</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">
                {students.filter(s => s.avg_score !== null && s.avg_score >= 70).length}
              </p>
              <p className="text-label-sm text-ink-muted">Good Standing</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">
                {students.filter(s => s.avg_score !== null && s.avg_score < 60).length}
              </p>
              <p className="text-label-sm text-ink-muted">Needs Attention</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary">
                {students.length > 0
                  ? Math.round(students.filter(s => s.avg_score !== null).reduce((acc, s) => acc + s.avg_score, 0) / (students.filter(s => s.avg_score !== null).length || 1))
                  : 0}%
              </p>
              <p className="text-label-sm text-ink-muted">Class Average</p>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input pl-9 h-10 w-full bg-surface"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              className={`btn-sm px-4 rounded-full border transition-colors ${filterStatus === 'all' ? 'bg-primary text-white border-primary' : 'btn-secondary bg-surface'}`}
              onClick={() => setFilterStatus('all')}
            >All</button>
            <button
              className={`btn-sm px-4 rounded-full border transition-colors ${filterStatus === 'good' ? 'bg-success text-white border-success' : 'btn-secondary bg-surface'}`}
              onClick={() => setFilterStatus('good')}
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Good
            </button>
            <button
              className={`btn-sm px-4 rounded-full border transition-colors ${filterStatus === 'flagged' ? 'bg-danger text-white border-danger' : 'btn-secondary bg-surface'}`}
              onClick={() => setFilterStatus('flagged')}
            >
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />At Risk
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-low text-label-sm text-ink-muted border-b border-border">
                  <th className="p-4 font-semibold">Student</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold text-center">Submissions</th>
                  <th className="p-4 font-semibold">Avg Score</th>
                  <th className="p-4 font-semibold">Last Active</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border animate-pulse">
                      <td className="p-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-surface-high"/><div className="h-4 bg-surface-high rounded w-32"/></div></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-40"/></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-12 mx-auto"/></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-24"/></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-24"/></td>
                      <td className="p-4"><div className="h-4 bg-surface-high rounded w-20"/></td>
                      <td className="p-4"><div className="h-6 bg-surface-high rounded w-16 ml-auto"/></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-ink-muted">
                      {students.length === 0
                        ? 'No students have submitted to your assignments yet.'
                        : 'No students match your search or filter.'}
                    </td>
                  </tr>
                ) : filtered.map(s => {
                  const initials = `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`.toUpperCase() || '??';
                  const isAtRisk = s.avg_score !== null && s.avg_score < 60;
                  const hasNoGrade = s.avg_score === null;
                  const lastActive = s.latest_submission ? new Date(s.latest_submission) : null;

                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-surface-high/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isAtRisk ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-ink-primary">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                              <UserCircle className="w-3.5 h-3.5" /> ID: {s.id.substring(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-ink-secondary">{s.email}</p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-ink-muted" />
                          <span className="font-semibold text-ink-primary">{s.submission_count}</span>
                        </div>
                        {s.assignments_submitted.length > 0 && (
                          <p className="text-xs text-ink-muted mt-0.5 max-w-[120px] truncate mx-auto" title={s.assignments_submitted.join(', ')}>
                            {s.assignments_submitted[0]}
                            {s.assignments_submitted.length > 1 ? ` +${s.assignments_submitted.length - 1}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <GradeBar score={s.avg_score} />
                      </td>
                      <td className="p-4">
                        {lastActive ? (
                          <p className="text-sm text-ink-secondary flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-ink-muted" />
                            {lastActive.toLocaleDateString()}
                          </p>
                        ) : (
                          <span className="text-ink-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {hasNoGrade ? (
                          <span className="flex items-center gap-1.5 text-xs text-ink-muted font-medium bg-surface-high px-2 py-1 rounded w-fit">
                            Pending Grade
                          </span>
                        ) : isAtRisk ? (
                          <span className="flex items-center gap-1.5 text-xs text-danger font-bold bg-danger/10 px-2 py-1 rounded w-fit">
                            <ShieldAlert className="w-3.5 h-3.5" /> At Risk
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-success font-medium bg-success/10 px-2 py-1 rounded w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button className="btn-ghost btn-sm text-primary group-hover:bg-primary/5">
                          View <ChevronRight className="w-4 h-4 inline-block" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
