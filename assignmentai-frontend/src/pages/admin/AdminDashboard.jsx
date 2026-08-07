import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import {
  Users, BookOpen, Bot, Video, Activity,
  Server, AlertTriangle, Info, CheckCircle,
  TrendingUp, Shield
} from 'lucide-react';
import { getDashboardStats } from '../../services/adminService';
function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-label-md text-ink-muted">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
      </div>
      <p className="text-[28px] font-bold text-ink-primary leading-none">
        {typeof value === 'number' && value > 100 ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-label-sm text-ink-muted">{sub}</p>}
    </div>
  );
}

const ALERT_ICONS = { warning: AlertTriangle, info: Info, success: CheckCircle };
const ALERT_STYLES = {
  warning: 'bg-warning-bg border-warning/30 text-warning-text',
  info:    'bg-info-bg    border-info/30    text-info-text',
  success: 'bg-success-bg border-success/30 text-success-text',
};

const SYSTEM_ALERTS = [
  { id: 'al1', type: 'warning', msg: 'Storage at 78% — consider cleanup' },
  { id: 'al2', type: 'info',    msg: 'AI model update available: v2.4'   },
  { id: 'al3', type: 'success', msg: 'Backup completed successfully'     },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [vivaModal, setVivaModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => {
        toast({ type: 'error', title: 'Failed to load dashboard stats' });
        setLoading(false);
      });
  }, []);

  const activityColumns = [
    { key: 'user',   label: 'User',   sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold text-xs flex items-center justify-center">
            {v.split(' ').map(w => w[0]).join('').slice(0,2)}
          </span>
          <span className="font-medium text-ink-primary">{v}</span>
        </div>
      )
    },
    { key: 'role',   label: 'Role',   width: '90px',  render: v => <StatusBadge status={v} /> },
    { key: 'action', label: 'Action', sortable: false },
    { key: 'time',   label: 'Time',   width: '100px', render: v => <span className="text-ink-muted">{v}</span> },
    { key: 'status', label: 'Status', width: '90px',  render: v => <StatusBadge status={v === 'success' ? 'graded' : v === 'warning' ? 'pending' : 'submitted'} label={v} /> },
  ];

  return (
    <>
      <TopBar
        title="Admin Dashboard"
        subtitle="System Overview — July 2026"
        showSearch
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-label-sm text-success font-medium">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
              All Systems Operational
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => toast({ type: 'info', title: 'Generating report…' })}>
              Generate Report
            </button>
          </div>
        }
      />

      <main className="p-6 flex flex-col gap-6">
        {loading || !stats ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* 6 metric cards */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              <MetricCard icon={Users}    label="Total Students"      value={stats.overview.totalStudents}     sub="Enrolled"           color="bg-info"     />
              <MetricCard icon={BookOpen} label="Active Teachers"     value={stats.overview.totalTeachers}    sub="Staff members"      color="bg-primary"  />
              <MetricCard icon={Activity} label="Total Assignments"   value={stats.overview.totalAssignments}  sub="System-wide"        color="bg-primary-500" />
              <MetricCard icon={Bot}      label="AI Grading Accuracy" value={`${stats.overview.aiAccuracy}%`}  sub="Model v2.3.1"       color="bg-success"  />
              <MetricCard icon={Video}    label="Viva Sessions"       value={stats.overview.vivaSessionsMonth} sub="Active sessions"    color="bg-warning"  />
              <MetricCard icon={Server}   label="System Uptime"       value={`${stats.overview.systemUptime}%`} sub="Last 30 days"      color="bg-success"  />
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          {/* Department overview */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-headline-sm">Department Overview</h2>
            <div className="flex flex-col gap-3">
              {stats.departments.map(d => (
                <div key={d.id} className="card-hover flex items-center gap-5 py-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-ink-primary">{d.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-label-sm text-ink-muted">{d.courses} courses</span>
                      <span className="text-label-sm text-ink-muted">{d.students} students</span>
                      {d.pendingReviews > 0
                        ? <span className="text-label-sm text-warning-text font-semibold">{d.pendingReviews} pending</span>
                        : <span className="text-label-sm text-success font-semibold">All reviewed</span>
                      }
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/departments')}>
                    View
                  </button>
                </div>
              ))}
            </div>

            {/* Activity table */}
            <h2 className="text-headline-sm mt-2">Recent Activity</h2>
            <div className="card p-0 overflow-hidden">
              <div className="p-4">
                <DataTable columns={activityColumns} data={stats.recentActivity} pageSize={5} />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* AI engine status */}
            <div className="card flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> AI Engine
                </h3>
                <StatusBadge status="active" label="v2.3.1 ACTIVE" />
              </div>
              {[
                ['Graded Today',   '847 submissions'],
                ['Queue',          '23 pending'],
                ['Avg. Time',      '2.3 sec / sub'],
                ['Accuracy',       '94.7%'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-label-md border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-ink-muted">{k}</span>
                  <span className="font-semibold text-ink-primary">{v}</span>
                </div>
              ))}
              {/* Mini accuracy bar */}
              <div>
                <div className="flex justify-between text-label-sm text-ink-muted mb-1">
                  <span>Accuracy Trend</span><span>94.7%</span>
                </div>
                <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-gradient rounded-full" style={{ width: '94.7%' }} />
                </div>
              </div>
            </div>

            {/* Live viva monitor */}
            <div className="card flex flex-col gap-3 border-l-4 border-l-danger">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink-primary flex items-center gap-2">
                  <Video className="w-4 h-4 text-danger" /> Live Viva Monitor
                </h3>
                <StatusBadge status="live" dot />
              </div>
              <div className="p-3 bg-danger-bg rounded-lg border border-danger/20">
                {stats.vivaSessions.length > 0 ? (
                  <>
                    <p className="font-semibold text-ink-primary text-sm">{stats.vivaSessions[0].title}</p>
                    <p className="text-label-sm text-ink-secondary mt-0.5">{stats.vivaSessions[0].teacher}</p>
                  </>
                ) : (
                  <p className="text-label-sm text-ink-secondary">No active sessions</p>
                )}
              </div>
              <button
                className="btn-primary btn-sm w-full justify-center"
                onClick={() => { setVivaModal(true); }}
              >
                Monitor Live
              </button>
            </div>

            {/* System alerts */}
            <div className="card flex flex-col gap-3">
              <h3 className="font-semibold text-ink-primary">System Alerts</h3>
              {SYSTEM_ALERTS.map(a => {
                const Icon = ALERT_ICONS[a.type];
                return (
                  <div key={a.id} className={`flex items-start gap-2.5 p-3 rounded-lg border text-label-md ${ALERT_STYLES[a.type]}`}>
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{a.msg}</span>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </>
        )}
      </main>

      <Modal
        open={vivaModal}
        onClose={() => setVivaModal(false)}
        title="Live Monitor: AI Ethics Viva"
        footer={<button className="btn-primary" onClick={() => setVivaModal(false)}>Close Monitor</button>}
      >
        <div className="flex flex-col gap-4">
          <div className="aspect-video bg-primary-950 rounded-xl flex items-center justify-center">
            <p className="text-white/50 text-sm">Camera feed preview</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Face Detected ✓', 'Single Person ✓', 'Audio Normal ✓', 'No Violations ✓'].map(s => (
              <div key={s} className="flex items-center gap-2 text-label-md text-success font-medium">
                <span className="w-2 h-2 rounded-full bg-success" />{s}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
