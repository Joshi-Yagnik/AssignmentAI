import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { getMySubmissions } from '../../services/assignmentService';
import { Bot, ChevronRight, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';

function formatDeadline(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentAIGradingPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMySubmissions();
      // Only show submissions that are either completely graded, or have an AI report processing/ready
      // Typically, status = 'graded' or 'submitted'. Let's show all submissions so the student sees processing status too.
      setSubmissions(data || []);
    } catch {
      toast({ type: 'error', title: 'Failed to load AI grading history' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <TopBar
        title="AI Grading Reports"
        subtitle="View detailed AI feedback and scores for your submissions"
      />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-surface-high rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-high rounded w-1/2 mb-4" />
                <div className="h-8 bg-surface-high rounded" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <Bot className="w-12 h-12 text-ink-muted/30 mb-4" />
            <p className="text-ink-secondary font-medium">No submissions yet</p>
            <p className="text-label-sm text-ink-muted mt-1">
              Once you submit an assignment, your AI grading reports will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map(sub => {
              const a = sub.assignments;
              const isGraded = sub.status === 'graded';
              
              return (
                <div key={sub.id} className="card flex flex-col gap-3 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    {isGraded ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-success/10 text-success rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Graded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-warning/10 text-warning rounded-full">
                        <Clock className="w-3.5 h-3.5" /> Processing
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-semibold text-ink-primary leading-snug truncate" title={a?.title}>{a?.title || 'Unknown Assignment'}</h3>
                    <p className="text-label-sm text-ink-muted mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Submitted {formatDeadline(sub.submitted_at)}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="mt-auto pt-2 border-t border-border mt-3">
                    <button
                      className={`btn btn-sm w-full flex items-center justify-center gap-2 ${isGraded ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => navigate(`/student/ai-grading/${sub.id}`)}
                    >
                      View Report <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
