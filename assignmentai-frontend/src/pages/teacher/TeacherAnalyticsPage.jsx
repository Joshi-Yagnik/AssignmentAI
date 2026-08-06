import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { getAssignments } from '../../services/assignmentService';
import api from '../../services/api';
import { Users, BookOpen, Target, TrendingUp, LineChart, FileText, BarChart2, CheckCircle2 } from 'lucide-react';

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

export default function TeacherAnalyticsPage() {
  const toast = useToast();
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentStats, setAssignmentStats] = useState({});
  const [accuracyTrend, setAccuracyTrend] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentsData, studentsRes] = await Promise.all([
        getAssignments(),
        api.get('/submissions/teacher/students'),
      ]);

      setAssignments(assignmentsData || []);
      setStudents(studentsRes.data || []);

      // For each assignment, fetch submission stats + compute AI accuracy
      const statsMap = {};
      const accuracyPoints = [];

      await Promise.all(
        (assignmentsData || []).map(async (a) => {
          try {
            const { data: subs } = await api.get(`/submissions/assignment/${a.id}`);
            const list = subs || [];
            const graded = list.filter(s => s.ai_reports && !!s.ai_reports && s.ai_reports.final_score !== null);
            const avgScore = graded.length > 0
              ? Math.round(graded.reduce((acc, s) => acc + s.ai_reports.final_score, 0) / graded.length)
              : null;

            // AI Accuracy: how close was AI score vs teacher-overridden final_score?
            // If ai_score and final_score differ, teacher corrected it.
            const maxMarks = a.max_marks || 100;
            const withAiScore = graded.filter(s => s.ai_reports.ai_score !== null && s.ai_reports.ai_score !== undefined);
            let avgAccuracy = null;
            if (withAiScore.length > 0) {
              const totalAccuracy = withAiScore.reduce((acc, s) => {
                const diff = Math.abs((s.ai_reports.ai_score || 0) - (s.ai_reports.final_score || 0));
                const accuracy = Math.max(0, 100 - (diff / maxMarks) * 100);
                return acc + accuracy;
              }, 0);
              avgAccuracy = Math.round(totalAccuracy / withAiScore.length);
            }

            statsMap[a.id] = { submissionCount: list.length, gradedCount: graded.length, avgScore };
            if (avgAccuracy !== null) {
              accuracyPoints.push({ title: a.title?.slice(0, 20) || 'Assignment', accuracy: avgAccuracy });
            }
          } catch {
            statsMap[a.id] = { submissionCount: 0, gradedCount: 0, avgScore: null };
          }
        })
      );

      setAssignmentStats(statsMap);
      setAccuracyTrend(accuracyPoints);
    } catch {
      toast({ type: 'error', title: 'Failed to load analytics' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Aggregate metrics
  const totalSubmissions = Object.values(assignmentStats).reduce((acc, s) => acc + s.submissionCount, 0);
  const gradedAssignments = Object.values(assignmentStats).filter(s => s.avgScore !== null);
  const classAvg = gradedAssignments.length > 0
    ? Math.round(gradedAssignments.reduce((acc, s) => acc + s.avgScore, 0) / gradedAssignments.length)
    : 0;
  const studentsWithGrades = students.filter(s => s.avg_score !== null);
  const atRiskCount = studentsWithGrades.filter(s => s.avg_score < 60).length;
  const overallAccuracy = accuracyTrend.length > 0
    ? Math.round(accuracyTrend.reduce((acc, p) => acc + p.accuracy, 0) / accuracyTrend.length)
    : null;

  // Score distribution buckets from real student average scores
  const buckets = [
    { label: '< 50',   min: 0,  max: 50  },
    { label: '50–60',  min: 50, max: 60  },
    { label: '60–70',  min: 60, max: 70  },
    { label: '70–80',  min: 70, max: 80  },
    { label: '80–90',  min: 80, max: 90  },
    { label: '90–100', min: 90, max: 101 },
  ];
  const maxBucketCount = Math.max(1, ...buckets.map(b =>
    studentsWithGrades.filter(s => s.avg_score >= b.min && s.avg_score < b.max).length
  ));

  return (
    <>
      <TopBar title="Class Analytics" subtitle="Real performance data from your assignments and students." />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Hero card */}
          <div className="card bg-primary-900 text-white md:col-span-2 relative overflow-hidden flex flex-col justify-center min-h-[140px]">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-500 rounded-full blur-3xl opacity-30" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-primary-200 font-medium mb-1">Class Average Score</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl font-bold">{loading ? '…' : `${classAvg}%`}</h3>
                  {!loading && gradedAssignments.length > 0 && (
                    <span className="flex items-center gap-1 text-sm text-success bg-success/20 px-2 py-0.5 rounded-full mb-1">
                      <TrendingUp className="w-3 h-3" /> Live data
                    </span>
                  )}
                </div>
                <p className="text-primary-300 text-xs mt-2">Across {assignments.length} active assignment{assignments.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <StatCard icon={BookOpen}    label="Assignments"       value={loading ? '…' : assignments.length}     sub="Published"                 iconClass="text-ink-secondary" bgClass="bg-surface-high" />
          <StatCard icon={Users}       label="Students Enrolled" value={loading ? '…' : students.length}        sub="Submitted at least once"   iconClass="text-primary"       bgClass="bg-primary/10" />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText}    label="Total Submissions" value={loading ? '…' : totalSubmissions}       sub="All assignments"           iconClass="text-primary"       bgClass="bg-primary/10" />
          <StatCard icon={CheckCircle2} label="AI Graded"        value={loading ? '…' : Object.values(assignmentStats).reduce((a,s)=>a+s.gradedCount,0)} sub="With AI report"       iconClass="text-success"       bgClass="bg-success/10" />
          <StatCard icon={BarChart2}   label="At Risk Students"  value={loading ? '…' : atRiskCount}            sub="Avg score below 60%"       iconClass="text-danger"        bgClass="bg-danger/10" />
          <StatCard icon={TrendingUp}  label="Good Standing"     value={loading ? '…' : studentsWithGrades.filter(s=>s.avg_score>=70).length} sub="Avg score ≥ 70%"   iconClass="text-success"       bgClass="bg-success/10" />
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Assignment Breakdown Table — REAL DATA */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-headline-sm text-ink-primary">Assignment Breakdown</h2>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-low border-b border-border text-label-sm text-ink-muted">
                    <th className="py-3 px-4 font-medium">Assignment</th>
                    <th className="py-3 px-4 font-medium text-center">Submissions</th>
                    <th className="py-3 px-4 font-medium text-center">Graded</th>
                    <th className="py-3 px-4 font-medium text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border animate-pulse">
                        <td className="py-3 px-4"><div className="h-4 bg-surface-high rounded w-40"/></td>
                        <td className="py-3 px-4"><div className="h-4 bg-surface-high rounded w-10 mx-auto"/></td>
                        <td className="py-3 px-4"><div className="h-4 bg-surface-high rounded w-10 mx-auto"/></td>
                        <td className="py-3 px-4"><div className="h-4 bg-surface-high rounded w-16 ml-auto"/></td>
                      </tr>
                    ))
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-ink-muted">
                        No assignments published yet.
                      </td>
                    </tr>
                  ) : (
                    assignments.slice(0, 8).map(a => {
                      const stats = assignmentStats[a.id] || { submissionCount: 0, gradedCount: 0, avgScore: null };
                      const pct = stats.submissionCount > 0
                        ? Math.round((stats.submissionCount / Math.max(students.length, 1)) * 100)
                        : 0;
                      return (
                        <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-low/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <div>
                                <p className="font-semibold text-ink-primary text-sm line-clamp-1">{a.title}</p>
                                {a.subjects && (
                                  <p className="text-xs text-ink-muted">{a.subjects.code} — {a.subjects.name}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-12 h-1.5 bg-surface-high rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-ink-secondary text-sm font-medium">{stats.submissionCount}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-sm font-medium ${stats.gradedCount > 0 ? 'text-success' : 'text-ink-muted'}`}>
                              {stats.gradedCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {stats.avgScore !== null ? (
                              <>
                                <span className={`font-bold ${stats.avgScore >= 70 ? 'text-success' : stats.avgScore >= 50 ? 'text-warning-text' : 'text-danger'}`}>
                                  {stats.avgScore}
                                </span>
                                <span className="text-ink-muted text-xs">/100</span>
                              </>
                            ) : (
                              <span className="text-ink-muted text-xs italic">No grades</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Distribution — REAL DATA from student averages */}
          <div className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-ink-primary">Score Distribution</h2>
            <div className="card flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6 text-label-sm text-ink-muted">
                <span>{studentsWithGrades.length} graded students</span>
                <LineChart className="w-4 h-4" />
              </div>

              <div className="flex items-end justify-between gap-2 h-40 mb-3 px-2">
                {buckets.map((b, i) => {
                  const count = studentsWithGrades.filter(s => s.avg_score >= b.min && s.avg_score < b.max).length;
                  const heightPct = maxBucketCount > 0 ? Math.round((count / maxBucketCount) * 100) : 0;
                  const color = b.max <= 50 ? 'bg-danger' : b.max <= 70 ? 'bg-warning' : 'bg-success';
                  return (
                    <div key={i} className="relative flex-1 flex flex-col items-center justify-end group h-full">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-ink-primary bg-surface border border-border rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                        {count} student{count !== 1 ? 's' : ''}
                      </div>
                      <div
                        className={`w-full max-w-[32px] ${heightPct > 0 ? color : 'bg-surface-high'} rounded-t-sm shadow-sm transition-all`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      <span className="text-[10px] font-medium text-ink-muted mt-2">{b.label}</span>
                    </div>
                  );
                })}
              </div>

              {studentsWithGrades.length === 0 && !loading && (
                <p className="text-center text-xs text-ink-muted italic">Grade students to see distribution</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Accuracy Trend + Student Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* AI Grading Accuracy Trend */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm text-ink-primary">AI Grading Accuracy Trend</h2>
              {overallAccuracy !== null && (
                <span className="text-label-sm font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">
                  Overall: {overallAccuracy}% accurate
                </span>
              )}
            </div>
            <div className="card flex flex-col">
              {loading ? (
                <div className="h-40 animate-pulse bg-surface-high rounded" />
              ) : accuracyTrend.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center">
                  <LineChart className="w-10 h-10 text-ink-muted/20 mb-2" />
                  <p className="text-ink-muted text-sm">No graded data yet.</p>
                  <p className="text-ink-muted text-xs mt-1">Accuracy appears here after AI grades submissions and teachers review them.</p>
                </div>
              ) : (
                <>
                  <p className="text-label-sm text-ink-muted mb-4">
                    Measures how close the AI score was to the teacher's final score, per assignment.
                  </p>
                  <div className="flex items-end justify-between gap-3 h-40 mb-3">
                    {accuracyTrend.map((point, i) => (
                      <div key={i} className="relative flex-1 flex flex-col items-center justify-end group h-full">
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-ink-primary bg-surface border border-border rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                          {point.accuracy}%
                        </div>
                        <div
                          className={`w-full max-w-[32px] rounded-t-sm shadow-sm transition-all ${
                            point.accuracy >= 90 ? 'bg-success' : point.accuracy >= 70 ? 'bg-primary' : 'bg-warning'
                          }`}
                          style={{ height: `${Math.max(point.accuracy, 4)}%` }}
                        />
                        <span className="text-[10px] font-medium text-ink-muted mt-2 text-center line-clamp-1 w-full">
                          {point.title}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-success inline-block"/>≥ 90% excellent</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block"/>70–89% good</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-warning inline-block"/>{'< 70%'} needs review</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Student Leaderboard */}
          <div className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-ink-primary">Top Students</h2>
            <div className="card flex-1 flex flex-col">
              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse bg-surface-high rounded" />
                  ))}
                </div>
              ) : studentsWithGrades.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <Users className="w-10 h-10 text-ink-muted/20 mb-2" />
                  <p className="text-ink-muted text-sm">No ranked students yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...studentsWithGrades]
                    .sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0))
                    .slice(0, 5)
                    .map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-surface-high text-ink-secondary' :
                          i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-surface-low text-ink-muted'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink-primary truncate">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-xs text-ink-muted">{s.submission_count} submission{s.submission_count !== 1 ? 's' : ''}</p>
                        </div>
                        <span className={`text-sm font-bold ${
                          s.avg_score >= 80 ? 'text-success' : s.avg_score >= 60 ? 'text-warning-text' : 'text-danger'
                        }`}>{s.avg_score}%</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
