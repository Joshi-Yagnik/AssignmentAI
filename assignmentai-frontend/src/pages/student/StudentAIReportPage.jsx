import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { getAIReport, getReportStatus } from '../../services/reportService';
import {
  Bot, AlertTriangle, Clock, ChevronLeft,
  BookOpen, Target, TrendingUp, Shield, MessageSquare,
  RefreshCw, Zap,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (Reused from ReviewWorkPage styling)
// ─────────────────────────────────────────────────────────────────────────────

function ScoreDonut({ score, max, size = 120 }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (pct / 100) * circumference;
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold text-ink-primary" style={{ fontSize: size * 0.22 }}>{score}</span>
        <span className="text-ink-muted" style={{ fontSize: size * 0.12 }}>/ {max}</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }) {
  const pct = Math.round((confidence ?? 0) * 100);
  const level = pct >= 80 ? { label: 'High', cls: 'text-success bg-success/10 border-success/30' }
    : pct >= 55 ? { label: 'Medium', cls: 'text-warning bg-warning/10 border-warning/30' }
      : { label: 'Low', cls: 'text-danger bg-danger/10 border-danger/30' };
  return (
    <span className={`text-label-sm font-semibold px-2.5 py-0.5 rounded-full border ${level.cls}`}>
      AI Confidence: {level.label} ({pct}%)
    </span>
  );
}

function BreakdownRow({ item, max: totalMax }) {
  const pct = Math.round((item.score / item.max) * 100);
  const color = pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="grid grid-cols-[2rem_1fr_160px_70px] gap-3 items-start py-3 border-b border-border last:border-0">
      <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
        {item.question}
      </span>
      <div>
        <p className="text-label-md font-medium text-ink-primary">{item.label || `Question ${item.question}`}</p>
        {item.comment && <p className="text-label-sm text-ink-muted mt-0.5">{item.comment}</p>}
      </div>
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
        </div>
        <span className="text-label-sm text-ink-muted">{pct}%</span>
      </div>
      <span className="font-semibold text-ink-primary text-sm text-right pt-1">
        {item.score}<span className="font-normal text-ink-muted">/{item.max}</span>
      </span>
    </div>
  );
}

function ProcessingState({ progress, submissionId }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center">
          <Bot className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
        </span>
      </div>
      <div className="text-center">
        <p className="text-headline-sm text-ink-primary mb-1">AI Grading in Progress</p>
        <p className="text-label-md text-ink-secondary">Analysing your submission and scoring answers…</p>
      </div>
      <div className="w-72">
        <div className="flex justify-between text-label-sm text-ink-muted mb-2">
          <span>Processing</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-surface-high rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-gradient rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="text-label-sm text-ink-muted animate-pulse">This usually takes 10–30 seconds</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StudentAIReportPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [report, setReport] = useState(null);
  const [jobState, setJobState] = useState({ status: 'loading', progress: 0 });

  const pollRef = useRef(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await getReportStatus(submissionId);
      setJobState(status);

      if (status.status === 'completed') {
        clearInterval(pollRef.current);
        const fullReport = await getAIReport(submissionId);
        setReport(fullReport);
      } else if (status.status === 'failed') {
        clearInterval(pollRef.current);
      }
    } catch (err) {
      // Keep polling if not found/error
      setJobState(prev => ({ ...prev, status: 'processing', progress: Math.min((prev.progress || 0) + 5, 90) }));
    }
  }, [submissionId]);

  useEffect(() => {
    checkStatus();
    pollRef.current = setInterval(checkStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, [checkStatus]);

  const submission = report?.submissions;
  const assignment = submission?.assignments;
  const analysis = report?.detailed_analysis || {};
  const breakdown = analysis.breakdown || [];
  const maxScore = analysis.max_score || assignment?.max_marks || 100;

  // The teacher's confirmed grade overwrites the initial AI score if modified
  // Final score in the report object is updated upon teacher confirmation.
  const finalScore = report?.final_score ?? 0;

  return (
    <>
      <TopBar
        title="AI Report"
        subtitle={assignment?.title || 'Loading...'}
        breadcrumb={['Dashboard', 'AI Grading', 'Report']}
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/ai-grading')}>
            <ChevronLeft className="w-4 h-4" /> Back to List
          </button>
        }
      />

      <main className="p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">

        {jobState.status !== 'completed' && !report && (
          <div className="card">
            {jobState.status === 'failed' ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <AlertTriangle className="w-12 h-12 text-danger" />
                <p className="text-headline-sm text-ink-primary">Grading Failed</p>
                <p className="text-label-md text-ink-secondary max-w-md">
                  The AI grading job encountered an error. Please contact your instructor.
                </p>
              </div>
            ) : (
              <ProcessingState progress={jobState.progress || 0} submissionId={submissionId} />
            )}
          </div>
        )}

        {report && (
          <>
            {/* ─ Score Hero ─────────────────────────────────── */}
            <div className="card flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-headline-sm text-ink-primary">Grading Report</h1>
                <p className="text-label-md text-ink-secondary mt-1">Here's how your assignment was evaluated.</p>
                
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <span className="flex items-center gap-1 text-label-sm text-ink-muted">
                    <Clock className="w-3.5 h-3.5" />
                    Submitted: {new Date(submission?.submitted_at).toLocaleString()}
                  </span>
                  {analysis.questions_answered != null && (
                    <span className="flex items-center gap-1 text-label-sm text-ink-muted">
                      <BookOpen className="w-3.5 h-3.5" />
                      {analysis.questions_answered}/{analysis.total_questions} questions answered
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 shrink-0">
                <ScoreDonut score={finalScore} max={maxScore} size={120} />
                <ConfidenceBadge confidence={analysis.confidence} />
              </div>
            </div>

            {/* ─ Teacher Remarks ──────────────────────────────────────── */}
            {report.feedback_summary && submission.status === 'graded' && (
              <div className="card border border-success/30 bg-success/5">
                <h2 className="text-label-md font-bold text-success mb-2">Teacher Remarks</h2>
                <p className="text-body-md text-ink-primary">{report.feedback_summary}</p>
              </div>
            )}

            {/* ─ Per-Question Breakdown ───────────────────────────────── */}
            {breakdown.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-headline-sm">Detailed Breakdown</h2>
                </div>
                <div>
                  {breakdown.map((item) => (
                    <BreakdownRow key={item.question} item={item} max={maxScore} />
                  ))}
                </div>
              </div>
            )}

            {/* ─ AI Feedback Summary (Raw) ────────────────────────────── */}
            {/* Show AI Feedback if the teacher hasn't overridden it, or if you want to show both */}
            {report.feedback_summary && submission.status !== 'graded' && (
               <div className="card bg-primary-50/60 border border-primary-100">
                 <div className="flex items-center gap-2 mb-3">
                   <MessageSquare className="w-5 h-5 text-primary" />
                   <h2 className="text-headline-sm text-primary-900">AI Feedback Summary</h2>
                 </div>
                 <p className="text-label-md text-primary-800 leading-relaxed">{report.feedback_summary}</p>
                 {report.generated_at && (
                   <p className="text-label-sm text-primary-500 mt-3">
                     Generated {new Date(report.generated_at).toLocaleString()}
                   </p>
                 )}
               </div>
            )}
            
          </>
        )}
      </main>
    </>
  );
}
