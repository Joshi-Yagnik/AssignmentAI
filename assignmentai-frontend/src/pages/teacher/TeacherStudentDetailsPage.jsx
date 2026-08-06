import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import {
  UserCircle, BookOpen, Clock, ShieldAlert,
  ChevronLeft, FileText, CheckCircle2, AlertTriangle, AlertCircle
} from 'lucide-react';

export default function TeacherStudentDetailsPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ profile: null, submissions: [], securityLogs: [] });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/submissions/teacher/students/${studentId}`);
      setData(res.data);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load student details', message: err?.response?.data?.error || '' });
    } finally {
      setLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => { load(); }, [load]);

  const { profile, submissions, securityLogs } = data;

  // Derive stats
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === 'graded' || !!s.ai_reports);
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((acc, s) => acc + (s.ai_reports?.final_score || 0), 0) / gradedSubmissions.length)
    : null;

  const isAtRisk = avgScore !== null && avgScore < 60;
  
  // Security Log counts
  const highSeverityLogs = securityLogs.filter(l => l.severity === 'high').length;
  const mediumSeverityLogs = securityLogs.filter(l => l.severity === 'medium').length;

  return (
    <>
      <TopBar
        title={profile ? `${profile.first_name} ${profile.last_name}` : 'Student Details'}
        subtitle="Detailed academic performance and security logs"
      />

      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header Actions */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-ink-muted hover:text-ink-primary">
            <ChevronLeft className="w-5 h-5" /> Back to Students
          </button>
        </div>

        {loading ? (
          <div className="card h-64 animate-pulse flex items-center justify-center text-ink-muted">Loading details...</div>
        ) : !profile ? (
          <div className="card h-64 flex items-center justify-center text-ink-muted">Student not found.</div>
        ) : (
          <>
            {/* Student Profile Card */}
            <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shrink-0 ${isAtRisk ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </div>
                <div>
                  <h2 className="text-headline-sm text-ink-primary">{profile.first_name} {profile.last_name}</h2>
                  <p className="text-label-md text-ink-secondary">{profile.email}</p>
                  <p className="text-xs text-ink-muted mt-1">ID: {profile.id}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 md:gap-8">
                <div>
                  <p className="text-xs text-ink-muted mb-1">Average Score</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-3xl font-bold ${avgScore === null ? 'text-ink-muted' : isAtRisk ? 'text-danger' : 'text-success'}`}>
                      {avgScore !== null ? `${avgScore}%` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-muted mb-1">Submissions</p>
                  <p className="text-3xl font-bold text-ink-primary">{totalSubmissions}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted mb-1">Security Flags</p>
                  <p className={`text-3xl font-bold ${highSeverityLogs > 0 ? 'text-danger' : mediumSeverityLogs > 0 ? 'text-warning' : 'text-ink-primary'}`}>
                    {securityLogs.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assignments & Reports */}
              <div className="flex flex-col gap-4">
                <h3 className="text-title-md font-semibold text-ink-primary flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Submitted Assignments
                </h3>
                
                <div className="card p-0 overflow-hidden flex flex-col">
                  {submissions.length === 0 ? (
                    <div className="p-8 text-center text-ink-muted">No submissions found for your assignments.</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-low border-b border-border text-label-sm text-ink-muted">
                          <th className="p-4">Assignment</th>
                          <th className="p-4">Date</th>
                          <th className="p-4 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map(sub => {
                          const isGraded = sub.status === 'graded' || !!sub.ai_reports;
                          const score = sub.ai_reports?.final_score;
                          
                          return (
                            <tr key={sub.id} className="border-b border-border hover:bg-surface-high/30 transition-colors cursor-pointer group" onClick={() => navigate(`/teacher/review/${sub.id}`)}>
                              <td className="p-4">
                                <p className="font-semibold text-primary group-hover:underline">{sub.assignments?.title}</p>
                                <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                                  <FileText className="w-3.5 h-3.5" /> ID: {sub.id.substring(0, 6)}…
                                </p>
                              </td>
                              <td className="p-4">
                                <p className="text-sm font-medium text-ink-secondary">{new Date(sub.submitted_at).toLocaleDateString()}</p>
                              </td>
                              <td className="p-4 text-right">
                                {isGraded ? (
                                  <span className={`font-bold ${score >= 70 ? 'text-success' : score >= 50 ? 'text-warning-text' : 'text-danger'}`}>
                                    {score}%
                                  </span>
                                ) : (
                                  <span className="text-xs bg-surface-high px-2 py-1 rounded text-ink-muted">Pending</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Security & Anti-Cheating Logs */}
              <div className="flex flex-col gap-4">
                <h3 className="text-title-md font-semibold text-ink-primary flex items-center gap-2">
                  <ShieldAlert className={`w-5 h-5 ${highSeverityLogs > 0 ? 'text-danger' : mediumSeverityLogs > 0 ? 'text-warning' : 'text-success'}`} /> 
                  Security & Anti-Cheating Logs
                </h3>

                <div className="card p-0 overflow-hidden flex flex-col h-full">
                  {securityLogs.length === 0 ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                      <CheckCircle2 className="w-10 h-10 text-success mb-2" />
                      <p className="font-semibold text-ink-primary">Clean Record</p>
                      <p className="text-sm text-ink-muted mt-1">No security violations or flags have been recorded for this student.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border h-[400px] overflow-y-auto">
                      {securityLogs.map(log => {
                        const isHigh = log.severity === 'high';
                        const isMedium = log.severity === 'medium';
                        
                        return (
                          <div key={log.id} className="p-4 hover:bg-surface-high/30 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 shrink-0 ${isHigh ? 'text-danger' : isMedium ? 'text-warning' : 'text-info'}`}>
                                  {isHigh ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-ink-primary capitalize">{log.violation_type?.replace(/_/g, ' ') || 'Unknown Violation'}</p>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${isHigh ? 'bg-danger/10 text-danger' : isMedium ? 'bg-warning/10 text-warning-text' : 'bg-info/10 text-info'}`}>
                                      {log.severity}
                                    </span>
                                  </div>
                                  <p className="text-sm text-ink-secondary mt-1">{log.details?.reason || log.source || 'Violation recorded by system.'}</p>
                                </div>
                              </div>
                              <p className="text-xs text-ink-muted whitespace-nowrap text-right">
                                {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
