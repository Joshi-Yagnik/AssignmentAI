import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { getAIReport, getReportStatus, confirmGrade } from '../../services/reportService';
import {
  Bot, CheckCircle, AlertTriangle, Clock, ChevronLeft,
  BookOpen, Target, TrendingUp, Shield, MessageSquare, User,
  RefreshCw, Zap,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
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

// Processing skeleton while job runs
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
        <p className="text-label-md text-ink-secondary">Analysing submission and scoring answers…</p>
        <p className="text-label-sm text-ink-muted mt-1">ID: {submissionId?.slice(0, 8)}…</p>
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

export default function ReviewWorkPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [report, setReport] = useState(null);
  const [jobState, setJobState] = useState({ status: 'loading', progress: 0 });
  const [overrideGrade, setOverrideGrade] = useState('');
  const [remarks, setRemarks] = useState('');
  const [notify, setNotify] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const pollRef = useRef(null);

  // ── Poll job status, then load full report when done ───────────────────────
  const checkStatus = useCallback(async () => {
    try {
      const status = await getReportStatus(submissionId);
      setJobState(status);

      if (status.status === 'completed') {
        clearInterval(pollRef.current);
        const fullReport = await getAIReport(submissionId);
        setReport(fullReport);
        setOverrideGrade(String(fullReport.final_score ?? ''));
      } else if (status.status === 'failed') {
        clearInterval(pollRef.current);
      }
    } catch (err) {
      // Report not yet available — keep polling
      setJobState(prev => ({ ...prev, status: 'processing', progress: Math.min((prev.progress || 0) + 5, 90) }));
    }
  }, [submissionId]);

  useEffect(() => {
    checkStatus(); // immediate check
    pollRef.current = setInterval(checkStatus, 3000); // poll every 3s
    return () => clearInterval(pollRef.current);
  }, [checkStatus]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const submission = report?.submissions;
  const assignment = submission?.assignments;
  const student = submission?.users;
  const analysis = report?.detailed_analysis || {};
  const breakdown = analysis.breakdown || [];
  const maxScore = analysis.max_score || assignment?.max_marks || 100;

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : 'Unknown Student';

  // ── Confirm handler ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    const grade = Number(overrideGrade);
    if (isNaN(grade) || grade < 0 || grade > maxScore) {
      toast({ type: 'warning', title: 'Invalid grade', message: `Grade must be 0–${maxScore}` });
      return;
    }
    setConfirming(true);
    try {
      await confirmGrade(submissionId, { finalGrade: grade, remarks, notify });
      toast({ type: 'success', title: 'Grade published!', message: `${studentName}'s grade has been confirmed.` });
      navigate('/teacher');
    } catch {
      toast({ type: 'error', title: 'Failed to publish grade' });
    } finally {
      setConfirming(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar
        title="Review Work"
        subtitle={assignment?.title || 'AI Grading Report'}
        breadcrumb={['Dashboard', 'Review Work']}
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teacher')}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      <main className="p-6 pb-32 flex flex-col gap-6 max-w-4xl mx-auto">

        {/* ── Processing State ─────────────────────────────────────────── */}
        {jobState.status !== 'completed' && !report && (
          <div className="card">
            {jobState.status === 'failed' ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <AlertTriangle className="w-12 h-12 text-danger" />
                <p className="text-headline-sm text-ink-primary">Grading Failed</p>
                <p className="text-label-md text-ink-secondary max-w-md">
                  The AI grading job encountered an error. Please try re-submitting or contact support.
                </p>
                <button className="btn-primary btn-sm" onClick={checkStatus}>
                  <RefreshCw className="w-4 h-4" /> Retry Check
                </button>
              </div>
            ) : (
              <ProcessingState progress={jobState.progress || 0} submissionId={submissionId} />
            )}
          </div>
        )}

        {/* ── Full Report ──────────────────────────────────────────────── */}
        {report && (
          <>
            {/* ─ Student + Score Hero ─────────────────────────────────── */}
            <div className="card flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-700 font-bold text-lg flex items-center justify-center shrink-0">
                  {studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-ink-primary text-base">{studentName}</p>
                  <p className="text-label-md text-ink-secondary">{student?.email}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-label-sm text-ink-muted">
                      <Clock className="w-3.5 h-3.5" />
                      {submission?.submitted_at
                        ? new Date(submission.submitted_at).toLocaleString()
                        : 'N/A'}
                    </span>
                    {analysis.questions_answered != null && (
                      <span className="flex items-center gap-1 text-label-sm text-ink-muted">
                        <BookOpen className="w-3.5 h-3.5" />
                        {analysis.questions_answered}/{analysis.total_questions} questions answered
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 shrink-0">
                <ScoreDonut score={report.final_score} max={maxScore} size={120} />
                <ConfidenceBadge confidence={analysis.confidence} />
              </div>
            </div>

            {/* ─ Quick Stats ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Target, label: 'Final Score', value: `${report.final_score}/${maxScore}`, color: 'bg-primary' },
                { icon: TrendingUp, label: 'Percentage', value: `${Math.round((report.final_score / maxScore) * 100)}%`, color: 'bg-success' },
                { icon: BookOpen, label: 'Questions', value: `${analysis.questions_answered ?? '?'}/${analysis.total_questions ?? '?'}`, color: 'bg-warning' },
                { icon: Shield, label: 'Confidence', value: `${Math.round((analysis.confidence ?? 0) * 100)}%`, color: 'bg-indigo-500' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="card flex items-center gap-3 py-4">
                  <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-ink-primary text-base leading-none">{value}</p>
                    <p className="text-label-sm text-ink-muted mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ─ Per-Question Breakdown ───────────────────────────────── */}
            {breakdown.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-headline-sm">Question-by-Question Breakdown</h2>
                </div>
                <div>
                  {breakdown.map((item) => (
                    <BreakdownRow key={item.question} item={item} max={maxScore} />
                  ))}
                </div>
              </div>
            )}

            {/* ─ Viva Integrity ──────────────────────────────────────────── */}
            {analysis.viva_integrity && (
              <div className="card border border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-warning" />
                  <h2 className="text-headline-sm text-warning-text">Viva Integrity Report</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex flex-col items-center">
                    <ScoreDonut score={analysis.viva_integrity.integrity_score} max={100} size={90} />
                    <span className="text-label-sm font-semibold mt-2">Integrity Score</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-label-md text-ink-primary mb-2 font-semibold">AI Rationale</p>
                    <p className="text-label-sm text-ink-secondary leading-relaxed mb-3">
                      {analysis.viva_integrity.rationale}
                    </p>
                    {analysis.viva_integrity.warnings > 0 && (
                      <p className="text-label-sm text-danger font-semibold bg-danger/10 px-2 py-1 rounded w-fit">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                        {analysis.viva_integrity.warnings} Security Violations Detected
                      </p>
                    )}
                  </div>
                </div>
                <details className="mt-4 border-t border-border/50 pt-3">
                  <summary className="text-label-sm font-semibold text-ink-primary cursor-pointer select-none">View Full Transcript</summary>
                  <div className="mt-2 p-3 bg-white rounded border border-border text-xs text-ink-secondary max-h-48 overflow-y-auto">
                    {analysis.viva_integrity.transcript || "No transcript recorded."}
                  </div>
                </details>
              </div>
            )}

            {/* ─ AI Feedback ──────────────────────────────────────────── */}
            {report.feedback_summary && (
              <div className="card bg-primary-50/60 border border-primary-100">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-headline-sm text-primary-900">AI Feedback Summary</h2>
                </div>
                <p className="text-label-md text-primary-800 leading-relaxed">{report.feedback_summary}</p>
                {report.generated_at && (
                  <p className="text-label-sm text-primary-500 mt-3">
                    Generated {new Date(report.generated_at).toLocaleString()} · Powered by Grok
                  </p>
                )}
              </div>
            )}

            {/* ─ Teacher Override ─────────────────────────────────────── */}
            <div className="card flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-headline-sm">Teacher Review</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    Final Grade (override AI)
                    <span className="text-ink-muted font-normal ml-1">/ {maxScore}</span>
                  </label>
                  <input
                    type="number"
                    className="input w-36"
                    value={overrideGrade}
                    onChange={e => setOverrideGrade(e.target.value)}
                    min={0}
                    max={maxScore}
                    placeholder={String(report.final_score)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Teacher Remarks (visible to student)</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Add remarks, strengths, or improvement suggestions for the student…"
                />
              </div>

              <label className="flex items-center gap-2.5 text-label-md text-ink-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={e => setNotify(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                Notify student after publishing
              </label>
            </div>
          </>
        )}
      </main>

      {/* ── Sticky Confirm Bar ─────────────────────────────────────────────── */}
      {report && (
        <div className="fixed bottom-0 left-0 md:left-60 right-0 bg-white/95 backdrop-blur-sm
                        border-t border-border px-6 py-3 flex items-center justify-end gap-3
                        shadow-[0_-4px_20px_rgba(0,0,0,0.07)] z-20">
          <span className="text-label-sm text-ink-muted mr-auto hidden sm:block">
            AI grade: <strong className="text-ink-primary">{report.final_score}/{maxScore}</strong>
            {overrideGrade && Number(overrideGrade) !== report.final_score && (
              <span className="text-warning ml-2">→ Override: {overrideGrade}</span>
            )}
          </span>
          <button className="btn btn-ghost" onClick={() => navigate('/teacher')}>
            Cancel
          </button>
          <button
            className="btn btn-ghost border-warning/40 text-warning-text"
            onClick={() => setOverrideGrade(String(report.final_score))}
          >
            Reset to AI Grade
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckCircle className="w-4 h-4" />}
            Confirm & Publish
          </button>
        </div>
      )}
    </>
  );
}
