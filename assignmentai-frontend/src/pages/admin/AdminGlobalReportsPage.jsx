import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { 
  Users, BookOpen, Target, FileText, BarChart2, TrendingUp, CheckCircle2 
} from 'lucide-react';
import { 
  getReportOverview, getReportAssignments, getReportStudents 
} from '../../services/adminService';
import DataTable from '../../components/shared/DataTable';

function StatCard({ icon: Icon, label, value, sub, iconClass = 'text-primary', bgClass = 'bg-primary/10' }) {
  return (
    <div className="card flex items-center gap-4 py-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
        <Icon className={`w-6 h-6 ${iconClass}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink-primary">{value}</p>
        <p className="text-label-sm text-ink-secondary">{label}</p>
        {sub && <p className="text-label-sm text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminGlobalReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [overview, setOverview] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewData, assignData, studentsData] = await Promise.all([
        getReportOverview(),
        getReportAssignments(),
        getReportStudents()
      ]);
      setOverview(overviewData);
      setAssignments(assignData || []);
      setStudents(studentsData || []);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load reports data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const assignmentColumns = [
    { key: 'title', label: 'Assignment', sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-semibold text-ink-primary">{v}</p>
          <p className="text-xs text-ink-muted">{row.subjectCode} — {row.subject}</p>
        </div>
      )
    },
    { key: 'teacher', label: 'Teacher', sortable: true },
    { key: 'totalSubmissions', label: 'Submissions', sortable: true },
    { key: 'gradedCount', label: 'Graded', sortable: true, 
      render: (v, row) => <span className={v > 0 ? 'text-success font-medium' : 'text-ink-muted'}>{v} / {row.totalSubmissions}</span> 
    },
    { key: 'avgScore', label: 'Avg Score', sortable: true,
      render: v => v !== null ? (
        <span className={`font-bold ${v >= 70 ? 'text-success' : v >= 50 ? 'text-warning-text' : 'text-danger'}`}>{v}%</span>
      ) : <span className="text-ink-muted italic">N/A</span>
    },
    { key: 'passRate', label: 'Pass Rate', sortable: true,
      render: v => v !== null ? <span className="font-medium text-ink-secondary">{v}%</span> : '—'
    }
  ];

  const studentColumns = [
    { key: 'name', label: 'Student', sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-xs">
            {v ? v.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-semibold text-ink-primary">{v}</p>
            <p className="text-xs text-ink-muted">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'submissionCount', label: 'Submissions', sortable: true },
    { key: 'avgScore', label: 'Avg Score', sortable: true,
      render: v => v !== null ? (
        <span className={`font-bold ${v >= 70 ? 'text-success' : v >= 50 ? 'text-warning-text' : 'text-danger'}`}>{v}%</span>
      ) : <span className="text-ink-muted italic">N/A</span>
    },
    { key: 'status', label: 'Status', sortable: true,
      render: v => {
        const styles = {
          good: 'bg-success/10 text-success',
          average: 'bg-warning/10 text-warning-text',
          at_risk: 'bg-danger/10 text-danger',
          pending: 'bg-surface-high text-ink-muted'
        };
        const labels = { good: 'Good', average: 'Average', at_risk: 'At Risk', pending: 'Pending' };
        return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[v]}`}>{labels[v]}</span>;
      }
    }
  ];

  return (
    <>
      <TopBar 
        title="Global Reports" 
        subtitle="Platform-wide performance and engagement metrics"
      />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* Tabs */}
        <div className="flex border-b border-border gap-6 text-label-md font-medium">
          <button 
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink-secondary'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'assignments' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink-secondary'}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments
          </button>
          <button 
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'students' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink-secondary'}`}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-32 bg-surface-high rounded-xl w-full" />
            <div className="h-64 bg-surface-high rounded-xl w-full" />
          </div>
        ) : (
          <>
            {/* ── Overview Tab ──────────────────────────────────────────────────────── */}
            {activeTab === 'overview' && overview && (
              <div className="flex flex-col gap-6">
                
                {/* Hero / Big numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card bg-primary-900 text-white relative overflow-hidden flex flex-col justify-center min-h-[140px] md:col-span-2">
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-500 rounded-full blur-3xl opacity-30" />
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <p className="text-primary-200 font-medium mb-1">Platform Average Score</p>
                        <h3 className="text-4xl font-bold">{overview.avgScore}%</h3>
                        <p className="text-primary-300 text-xs mt-2">Across {overview.gradedSubmissions} graded submissions</p>
                      </div>
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <StatCard icon={TrendingUp} label="Passing Grades" value={overview.passing} sub="Scores ≥ 60%" iconClass="text-success" bgClass="bg-success/10" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Users} label="Total Students" value={overview.totalStudents} iconClass="text-primary" bgClass="bg-primary/10" />
                  <StatCard icon={BookOpen} label="Total Teachers" value={overview.totalTeachers} iconClass="text-ink-secondary" bgClass="bg-surface-high" />
                  <StatCard icon={FileText} label="Assignments" value={overview.totalAssignments} iconClass="text-primary" bgClass="bg-primary/10" />
                  <StatCard icon={CheckCircle2} label="Total Submissions" value={overview.totalSubmissions} iconClass="text-success" bgClass="bg-success/10" />
                </div>
              </div>
            )}

            {/* ── Assignments Tab ────────────────────────────────────────────────────── */}
            {activeTab === 'assignments' && (
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-headline-sm text-ink-primary">Assignment Performance</h3>
                  <p className="text-label-sm text-ink-muted">Metrics aggregated across all courses and teachers</p>
                </div>
                <div className="p-4">
                  <DataTable 
                    columns={assignmentColumns} 
                    data={assignments} 
                    searchable 
                    searchKeys={['title', 'subject', 'teacher']} 
                  />
                </div>
              </div>
            )}

            {/* ── Students Tab ──────────────────────────────────────────────────────── */}
            {activeTab === 'students' && (
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <div>
                    <h3 className="text-headline-sm text-ink-primary">Student Leaderboard & Status</h3>
                    <p className="text-label-sm text-ink-muted">Global tracking of student engagement and grades</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-danger/10 text-danger px-2.5 py-1 rounded-full">{overview?.atRisk || 0} At Risk</span>
                  </div>
                </div>
                <div className="p-4">
                  <DataTable 
                    columns={studentColumns} 
                    data={students} 
                    searchable 
                    searchKeys={['name', 'email', 'department']} 
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
