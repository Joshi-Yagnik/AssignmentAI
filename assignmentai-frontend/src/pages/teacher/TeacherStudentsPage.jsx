import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterLabBatch, setFilterLabBatch] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

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
    if (filterClass !== 'all' && s.class_name !== filterClass) return false;
    if (filterLabBatch !== 'all' && s.lab_batch !== filterLabBatch) return false;
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      cmp = nameA.localeCompare(nameB);
    } else if (sortField === 'email') {
      cmp = (a.email || '').localeCompare(b.email || '');
    } else if (sortField === 'submissions') {
      cmp = (a.submission_count || 0) - (b.submission_count || 0);
    } else if (sortField === 'score') {
      cmp = (a.avg_score || 0) - (b.avg_score || 0);
    } else if (sortField === 'last_active') {
      const timeA = a.latest_submission ? new Date(a.latest_submission).getTime() : 0;
      const timeB = b.latest_submission ? new Date(b.latest_submission).getTime() : 0;
      cmp = timeA - timeB;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-all rotate-90 inline-block ml-1" />;
    }
    return <ChevronRight className={`w-3.5 h-3.5 transition-transform inline-block ml-1 text-primary ${sortOrder === 'asc' ? '-rotate-90' : 'rotate-90'}`} />;
  };

  const uniqueClasses = [...new Set(students.map(s => s.class_name).filter(Boolean))].sort();
  const uniqueLabBatches = [...new Set(students.map(s => s.lab_batch).filter(Boolean))].sort();

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
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <div className="relative w-full xl:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input pl-9 h-10 w-full bg-surface"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              className="input h-10 bg-surface min-w-[140px]" 
              value={filterClass} 
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              className="input h-10 bg-surface min-w-[140px]" 
              value={filterLabBatch} 
              onChange={e => setFilterLabBatch(e.target.value)}
            >
              <option value="all">All Lab Batches</option>
              {uniqueLabBatches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <div className="w-px h-6 bg-border mx-2" />

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
                  <th className="p-4 font-semibold cursor-pointer select-none group hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                    Student <SortIcon field="name" />
                  </th>
                  <th className="p-4 font-semibold cursor-pointer select-none group hover:text-primary transition-colors" onClick={() => handleSort('email')}>
                    Email <SortIcon field="email" />
                  </th>
                  <th className="p-4 font-semibold text-center cursor-pointer select-none group hover:text-primary transition-colors" onClick={() => handleSort('submissions')}>
                    Submissions <SortIcon field="submissions" />
                  </th>
                  <th className="p-4 font-semibold cursor-pointer select-none group hover:text-primary transition-colors" onClick={() => handleSort('score')}>
                    Avg Score <SortIcon field="score" />
                  </th>
                  <th className="p-4 font-semibold cursor-pointer select-none group hover:text-primary transition-colors" onClick={() => handleSort('last_active')}>
                    Last Active <SortIcon field="last_active" />
                  </th>
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
                            <p className="text-xs text-ink-muted flex flex-wrap items-center gap-x-3 mt-1">
                              <span className="flex items-center gap-1"><UserCircle className="w-3.5 h-3.5" /> ID: {s.enrollment_number || s.id.substring(0, 8)}</span>
                              {s.class_name && <span className="px-1.5 py-0.5 rounded bg-surface-high border border-border text-[10px] uppercase font-bold text-ink-secondary">{s.class_name}</span>}
                              {s.lab_batch && <span className="px-1.5 py-0.5 rounded bg-surface-high border border-border text-[10px] uppercase font-bold text-ink-secondary">{s.lab_batch}</span>}
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
                        <button 
                          className="btn-ghost btn-sm text-primary group-hover:bg-primary/5"
                          onClick={() => navigate(`/teacher/students/${s.id}`)}
                        >
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
