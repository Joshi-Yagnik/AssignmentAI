import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { getMySubmissions } from '../../services/assignmentService';
import { BarChart3, TrendingUp, Award, Target, ChevronRight } from 'lucide-react';

export default function StudentGradesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [gradesList, setGradesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      const [subsData, vivasData] = await Promise.all([
        getMySubmissions().catch(() => []),
        api.get('/viva/sessions/me').then(r => r.data).catch(() => [])
      ]);

      // Normalize Assignments
      const assignmentsGraded = (subsData || [])
        .filter(sub => sub.status === 'graded' || !!sub.ai_reports)
        .map(sub => ({
          id: sub.id,
          type: 'assignment',
          title: sub.assignments?.title || 'Assignment',
          date: new Date(sub.submitted_at),
          score: sub.ai_reports.final_score || 0,
          max: sub.assignments?.max_marks || 100,
        }));

      // Normalize Vivas
      const vivasGraded = (vivasData || [])
        .filter(v => v.ai_report && v.ai_report.overall_score)
        .map(v => ({
          id: v.id,
          type: 'viva',
          title: `Viva: ${v.subject || 'Session'}`,
          date: new Date(v.scheduled_time),
          score: v.ai_report.overall_score || 0,
          max: 100,
        }));

      const combined = [...assignmentsGraded, ...vivasGraded].sort((a, b) => b.date - a.date);
      setGradesList(combined);

    } catch (err) {
      console.error(err);
      toast({ type: 'error', title: 'Failed to load grades' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const totalGraded = gradesList.length;
  // Compute average scaled to 100
  let avgScore = 0;
  if (totalGraded > 0) {
    const totalPercentage = gradesList.reduce((acc, item) => acc + (item.score / item.max) * 100, 0);
    avgScore = Math.round(totalPercentage / totalGraded);
  }

  // Get highest percentage score
  const highestScore = totalGraded > 0 
    ? Math.round(Math.max(...gradesList.map(item => (item.score / item.max) * 100))) 
    : 0;

  // Build trend array (oldest to newest, max 8 items)
  const trendList = [...gradesList].sort((a, b) => a.date - b.date).slice(-8);
  const trendData = trendList.length > 0 ? trendList.map(item => Math.round((item.score / item.max) * 100)) : [0];

  return (
    <>
      <TopBar
        title="Grades & Performance"
        subtitle="Track your academic progress and AI grading analytics."
      />

      <main className="p-4 md:p-6 flex flex-col gap-4 md:gap-6 max-w-6xl mx-auto w-full">
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-primary text-white border-none relative overflow-hidden flex flex-col justify-center min-h-[140px]">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-primary-100 font-medium mb-1">Average Score</p>
                <h3 className="text-4xl font-bold">{avgScore}<span className="text-xl text-primary-200">%</span></h3>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="card flex items-center justify-between">
            <div>
              <p className="text-ink-muted text-label-sm font-medium mb-1">Highest Score</p>
              <h3 className="text-3xl font-bold text-ink-primary">{highestScore}%</h3>
              <p className="text-success text-xs font-semibold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> Top performance
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-success" />
            </div>
          </div>

          <div className="card flex items-center justify-between">
            <div>
              <p className="text-ink-muted text-label-sm font-medium mb-1">Total Graded</p>
              <h3 className="text-3xl font-bold text-ink-primary">{totalGraded}</h3>
              <p className="text-ink-muted text-xs font-medium mt-1">
                Assignments & Vivas
              </p>
            </div>
            <div className="w-12 h-12 bg-surface-high rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-ink-secondary" />
            </div>
          </div>
        </div>

        {/* Charts & List Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main List */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-headline-sm text-ink-primary">Recent Grades</h2>
            {loading ? (
              <div className="card h-40 animate-pulse flex items-center justify-center text-ink-muted">Loading grades...</div>
            ) : gradesList.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-12 text-center border-dashed">
                <Award className="w-12 h-12 text-ink-muted/30 mb-3" />
                <p className="text-ink-secondary font-medium">No graded items yet</p>
                <p className="text-label-sm text-ink-muted mt-1">Your scores will appear here once teachers publish them.</p>
              </div>
            ) : (
              <>
              <div className="md:hidden flex flex-col gap-3">

                {gradesList.map((item) => {
                  const percentage = Math.round((item.score / item.max) * 100);
                  const isHigh = percentage >= 80;
                  return (
                    <div key={`m-${item.type}-${item.id}`} className="mobile-card-row">
                      <div className="mobile-card-row-header">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink-primary text-sm leading-snug truncate">{item.title}</p>
                          <p className="text-xs text-ink-muted uppercase tracking-wide mt-0.5">{item.type}</p>
                        </div>
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          isHigh ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-text'
                        }`}>
                          {item.score}/{item.max}
                        </span>
                      </div>
                      <div className="mobile-card-row-field">
                        <span className="mobile-card-row-label">Date</span>
                        <span className="mobile-card-row-value">{item.date.toLocaleDateString()}</span>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm w-full justify-center mt-1"
                        onClick={() => {
                          if (item.type === 'assignment') navigate(`/student/ai-grading/${item.id}`);
                          else navigate(`/student/viva/report/${item.id}`);
                        }}
                      >
                        View Report <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block card p-0 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-low border-b border-border text-label-sm text-ink-muted">
                      <th className="py-3 px-4 font-medium">Title</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium text-right">Score</th>
                      <th className="py-3 px-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradesList.map((item) => {
                      const percentage = Math.round((item.score / item.max) * 100);
                      const isHigh = percentage >= 80;
                      return (
                        <tr key={`${item.type}-${item.id}`} className="border-b border-border last:border-0 hover:bg-surface-low/50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-ink-primary text-sm line-clamp-1">{item.title}</p>
                            <p className="text-xs text-ink-muted uppercase tracking-wide mt-0.5">{item.type}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-ink-secondary">{item.date.toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isHigh ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-text'
                            }`}>
                              {item.score}/{item.max}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              className="btn btn-ghost btn-sm text-primary"
                              onClick={() => {
                                if (item.type === 'assignment') navigate(`/student/ai-grading/${item.id}`);
                                else navigate(`/student/viva/report/${item.id}`);
                              }}
                            >
                              Report <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* Performance Trend (Mock Chart) */}
          <div className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-ink-primary">Performance Trend</h2>
            <div className="card flex-1 flex flex-col justify-between">
              <p className="text-label-sm text-ink-muted mb-6">Your score trajectory over the last 8 assignments.</p>
              
              <div className="flex items-end justify-between gap-1 h-32 mb-2">
                {trendData.map((val, i) => (
                  <div key={i} className="relative flex-1 flex items-end justify-center group h-full">
                    <div 
                      className="w-full max-w-[24px] bg-primary-100 rounded-t-sm transition-all group-hover:bg-primary-300 relative" 
                      style={{ height: `${val}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-ink-primary text-white text-[10px] font-bold py-1 px-2 rounded transition-opacity">
                        {val}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-ink-muted font-semibold uppercase">
                <span>Oldest</span>
                <span>Newest</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
