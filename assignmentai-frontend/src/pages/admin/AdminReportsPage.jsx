import { useState, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import { Activity, Users, Building, ShieldCheck, Database, Server, ChevronRight } from 'lucide-react';

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);

  // In a real scenario, this would fetch from /admin/reports endpoint.
  // For now, we simulate loading the complex analytics view.
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const stats = {
    totalUsers: 1245,
    activeInstitutes: 12,
    totalSubmissions: 8432,
    aiProcessingUptime: '99.9%',
  };

  const activityLog = [
    { id: 1, action: 'User Signup', detail: 'student@test.com joined CS101', time: '2 mins ago', type: 'user' },
    { id: 2, action: 'System Alert', detail: 'Redis queue reached 80% capacity', time: '15 mins ago', type: 'system' },
    { id: 3, action: 'Assignment Created', detail: 'Prof. Smith created "Midterm"', time: '1 hour ago', type: 'academic' },
    { id: 4, action: 'Batch Grading', detail: 'AI processed 45 submissions', time: '2 hours ago', type: 'ai' },
  ];

  return (
    <>
      <TopBar
        title="Reports & Analytics"
        subtitle="System-wide performance, usage statistics, and audit logs."
      />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
            <Activity className="w-8 h-8 animate-pulse mb-4" />
            <p>Compiling system analytics...</p>
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">Total Users</p>
                  <h3 className="text-3xl font-bold text-ink-primary">{stats.totalUsers}</h3>
                  <p className="text-success text-xs font-semibold flex items-center gap-1 mt-1">
                    +12% this month
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">Active Institutes</p>
                  <h3 className="text-3xl font-bold text-ink-primary">{stats.activeInstitutes}</h3>
                  <p className="text-ink-muted text-xs font-medium mt-1">Across 3 regions</p>
                </div>
                <div className="w-12 h-12 bg-indigo/10 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-indigo-500" />
                </div>
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">Total Submissions</p>
                  <h3 className="text-3xl font-bold text-ink-primary">{stats.totalSubmissions}</h3>
                  <p className="text-success text-xs font-semibold flex items-center gap-1 mt-1">
                    +854 this week
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-success" />
                </div>
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">AI Uptime</p>
                  <h3 className="text-3xl font-bold text-ink-primary">{stats.aiProcessingUptime}</h3>
                  <p className="text-ink-muted text-xs font-medium mt-1">Trailing 30 days</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Server className="w-6 h-6 text-warning" />
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Engagement Chart (Mock) */}
              <div className="lg:col-span-2 card flex flex-col">
                <h2 className="text-headline-sm text-ink-primary mb-6">Platform Engagement</h2>
                <div className="flex-1 flex items-end gap-2 h-64 border-b border-border/50 pb-2">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const height = 20 + Math.random() * 80; // random between 20 and 100
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end group h-full">
                        <div 
                          className="w-full bg-primary-100 rounded-t-sm transition-all group-hover:bg-primary-300 relative" 
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-ink-primary text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                            Day {i+1}: {Math.round(height * 12)} active
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-ink-muted mt-2 font-medium">
                  <span>30 Days Ago</span>
                  <span>Today</span>
                </div>
              </div>

              {/* Recent System Activity */}
              <div className="card flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-headline-sm text-ink-primary">Audit Log</h2>
                  <button className="text-primary text-xs font-semibold hover:underline">View All</button>
                </div>
                <div className="flex flex-col gap-3">
                  {activityLog.map((log) => (
                    <div key={log.id} className="flex gap-3 items-start border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        log.type === 'system' ? 'bg-danger/10 text-danger' : 
                        log.type === 'ai' ? 'bg-indigo/10 text-indigo-500' :
                        log.type === 'user' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                      }`}>
                        {log.type === 'system' ? <ShieldCheck className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-primary">{log.action}</p>
                        <p className="text-xs text-ink-secondary mt-0.5">{log.detail}</p>
                        <p className="text-[10px] text-ink-muted mt-1 uppercase tracking-wide">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </>
  );
}
