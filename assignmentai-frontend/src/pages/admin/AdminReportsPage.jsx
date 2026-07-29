import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { 
  ShieldAlert, ShieldCheck, Activity, Users, AlertTriangle, 
  Printer, FileText, Smartphone, MonitorOff, UserX
} from 'lucide-react';
import { getSecurityLogs, getSecurityTrends } from '../../services/adminService';
import { useToast } from '../../components/shared/Toast';

export default function AdminReportsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [trends, setTrends] = useState({
    byType: {},
    byCourse: {},
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    totalViolations: 0
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, trendsData] = await Promise.all([
        getSecurityLogs(),
        getSecurityTrends()
      ]);
      setLogs(logsData);
      setTrends(trendsData);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load security reports' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  const SEVERITY_COLORS = {
    low: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-danger/10 text-danger',
    critical: 'bg-danger text-white'
  };

  const TYPE_ICONS = {
    tab_switch: <MonitorOff className="w-4 h-4" />,
    face_lost: <UserX className="w-4 h-4" />,
    multiple_faces: <Users className="w-4 h-4" />,
    mobile_detected: <Smartphone className="w-4 h-4" />,
    audio_anomaly: <Activity className="w-4 h-4" />,
  };

  const formatType = (type) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <>
      {/* Hidden in print view */}
      <div className="print:hidden">
        <TopBar
          title="Security & Anti-Cheating Logs"
          subtitle="Global proctoring violations and cheating trends"
          actions={
            <button className="btn-primary btn-sm flex items-center gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Print Summary Report
            </button>
          }
        />
      </div>

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
            <ShieldAlert className="w-8 h-8 animate-pulse mb-4 text-warning" />
            <p>Compiling proctoring data...</p>
          </div>
        ) : (
          <>
            {/* ── PRINT HEADER (Only visible when printing) ──────────────── */}
            <div className="hidden print:block mb-8 text-center border-b border-ink-primary pb-4">
              <h1 className="text-2xl font-bold text-ink-primary">Security & Proctoring Summary Report</h1>
              <p className="text-sm text-ink-secondary mt-1">Generated on {new Date().toLocaleString()}</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 print:grid-cols-4">
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">Total Violations</p>
                  <h3 className="text-3xl font-bold text-ink-primary">{trends.totalViolations}</h3>
                </div>
                <div className="w-12 h-12 bg-danger/10 rounded-xl flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-danger" />
                </div>
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">Critical Alerts</p>
                  <h3 className="text-3xl font-bold text-danger">{trends.bySeverity.critical || 0}</h3>
                </div>
                <div className="w-12 h-12 bg-danger/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-danger" />
                </div>
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">High Severity</p>
                  <h3 className="text-3xl font-bold text-warning">{trends.bySeverity.high || 0}</h3>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-warning" />
                </div>
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-ink-muted text-label-sm font-medium mb-1">Most Flagged Course</p>
                  <h3 className="text-lg font-bold text-ink-primary truncate max-w-[120px]">
                    {Object.entries(trends.byCourse).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A'}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Trends by Course */}
              <div className="xl:col-span-1 card flex flex-col gap-4">
                <h2 className="text-headline-sm text-ink-primary">Violations by Course</h2>
                <div className="flex-1 space-y-4">
                  {Object.entries(trends.byCourse)
                    .sort((a,b) => b[1] - a[1])
                    .slice(0, 5) // top 5
                    .map(([course, count], idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm font-medium text-ink-primary">
                        <span className="truncate">{course}</span>
                        <span>{count}</span>
                      </div>
                      <div className="w-full bg-surface-high rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(count / Math.max(1, trends.totalViolations)) * 100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                  {Object.keys(trends.byCourse).length === 0 && (
                    <p className="text-ink-muted text-sm italic">No data available.</p>
                  )}
                </div>
              </div>

              {/* Trends by Type */}
              <div className="xl:col-span-2 card flex flex-col gap-4">
                <h2 className="text-headline-sm text-ink-primary">Violation Breakdown</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(trends.byType).map(([type, count], idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-surface-low flex flex-col justify-center text-center">
                      <div className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-2">
                        {TYPE_ICONS[type] || <ShieldAlert className="w-4 h-4" />}
                      </div>
                      <p className="text-xl font-bold text-ink-primary">{count}</p>
                      <p className="text-label-sm text-ink-muted">{formatType(type)}</p>
                    </div>
                  ))}
                  {Object.keys(trends.byType).length === 0 && (
                    <p className="text-ink-muted text-sm italic col-span-full">No data available.</p>
                  )}
                </div>
              </div>

              {/* Recent Logs Table */}
              <div className="xl:col-span-3 card p-0 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border">
                  <h2 className="text-headline-sm text-ink-primary">Recent Logs</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-low border-b border-border">
                      <tr>
                        <th className="text-left px-6 py-3 text-label-sm text-ink-muted font-semibold">Time</th>
                        <th className="text-left px-6 py-3 text-label-sm text-ink-muted font-semibold">Student</th>
                        <th className="text-left px-6 py-3 text-label-sm text-ink-muted font-semibold">Course</th>
                        <th className="text-left px-6 py-3 text-label-sm text-ink-muted font-semibold">Source</th>
                        <th className="text-left px-6 py-3 text-label-sm text-ink-muted font-semibold">Violation Type</th>
                        <th className="text-left px-6 py-3 text-label-sm text-ink-muted font-semibold">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-ink-muted">
                            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-success/50" />
                            <p>No security violations recorded.</p>
                          </td>
                        </tr>
                      ) : (
                        logs.map(log => (
                          <tr key={log.id} className="hover:bg-surface-low/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-ink-secondary">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 font-medium text-ink-primary">
                              {log.users?.name || 'Unknown User'}
                            </td>
                            <td className="px-6 py-4 text-ink-secondary truncate max-w-[150px]">
                              {log.subjects?.name || 'Unknown Course'}
                            </td>
                            <td className="px-6 py-4 capitalize text-ink-muted">
                              {log.source}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-ink-secondary">{TYPE_ICONS[log.violation_type] || <ShieldAlert className="w-3 h-3" />}</span>
                                <span>{formatType(log.violation_type)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${SEVERITY_COLORS[log.severity]}`}>
                                {log.severity}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </>
        )}
      </main>

      {/* Embedded Print Styles */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .card { border: 1px solid #e5e7eb; box-shadow: none !important; margin-bottom: 20px; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </>
  );
}
