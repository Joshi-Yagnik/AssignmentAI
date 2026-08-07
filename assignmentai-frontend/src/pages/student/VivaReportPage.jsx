import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { Award, BrainCircuit, MessageSquare, Volume2, ShieldCheck, CheckCircle, XCircle, ArrowRight, Download } from 'lucide-react';

function ScoreRing({ score, label, colorClass, icon: Icon }) {
  const percentage = Math.min(100, Math.max(0, score || 0));
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" className="stroke-surface-high" strokeWidth="8" />
          <circle 
            cx="40" cy="40" r="36" fill="none" 
            className={`stroke-current transition-all duration-1000 ease-out ${colorClass}`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-ink-primary">{percentage}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-secondary">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </div>
    </div>
  );
}

export default function VivaReportPage() {
  const { sessionId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/viva/sessions/${sessionId}`);
        setSession(data);
      } catch (err) {
        toast({ type: 'error', title: 'Failed to load report' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, toast]);

  if (loading) return <div className="p-10 text-center text-ink-muted">Loading Report...</div>;
  if (!session) return <div className="p-10 text-center text-ink-muted">Session not found.</div>;

  const report = session.ai_report || {};
  let messages = [];
  try { messages = JSON.parse(session.transcript || '[]'); } catch { }

  return (
    <>
      <div className="print:hidden">
        <TopBar title="AI Viva Report" subtitle={`${session.subject} — ${session.topic}`} />
      </div>
      
      <main className="p-4 md:p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 print:p-0 print:gap-4 print:max-w-none">
        
        <div className="print:hidden flex justify-end">
          <button 
            onClick={() => window.print()} 
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        </div>

        {/* Header Summary */}
        <div className="card bg-gradient-to-br from-primary-950 to-primary-900 text-white border-none shadow-xl flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 print:shadow-none print:break-inside-avoid">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Award className="w-8 h-8 text-primary-300" /> 
              {report.final_rating || 'Completed'} Performance
            </h1>
            <p className="text-primary-100 text-sm md:text-base leading-relaxed max-w-xl">
              {report.ai_feedback || "The AI examiner has concluded the session. Review your detailed scoring below."}
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-center justify-center bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20">
            <span className="text-5xl font-black text-white mb-1">{report.overall_score || 0}<span className="text-2xl text-primary-200">/100</span></span>
            <span className="text-sm font-semibold tracking-wide text-primary-200 uppercase">Overall Score</span>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="card">
          <h2 className="text-lg font-bold text-ink-primary mb-6 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" /> Evaluation Metrics
          </h2>
          <div className="flex flex-wrap justify-around gap-8">
            <ScoreRing score={report.subject_knowledge_score} label="Knowledge" colorClass="text-primary-600" icon={BrainCircuit} />
            <ScoreRing score={report.communication_score} label="Communication" colorClass="text-success" icon={MessageSquare} />
            <ScoreRing score={report.confidence_score} label="Confidence" colorClass="text-warning-text" icon={ShieldCheck} />
            <ScoreRing score={report.pronunciation_score} label="Pronunciation" colorClass="text-indigo-500" icon={Volume2} />
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-success-bg border-success/20">
            <h3 className="font-bold text-success-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Key Strengths
            </h3>
            <ul className="flex flex-col gap-3">
              {(report.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-success-900">
                  <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 text-success" /> {s}
                </li>
              ))}
              {(!report.strengths || report.strengths.length === 0) && <li className="text-sm text-success/60">No specific strengths recorded.</li>}
            </ul>
          </div>

          <div className="card bg-danger-bg border-danger/20">
            <h3 className="font-bold text-danger-800 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Areas to Improve
            </h3>
            <ul className="flex flex-col gap-3">
              {(report.weaknesses || []).map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-danger-900">
                  <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 text-danger" /> {w}
                </li>
              ))}
              {(!report.weaknesses || report.weaknesses.length === 0) && <li className="text-sm text-danger/60">No specific weaknesses recorded.</li>}
            </ul>
          </div>
        </div>
        
        {/* Recommended Topics */}
        {report.topics_to_improve && report.topics_to_improve.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-ink-primary mb-3 text-sm uppercase tracking-wider text-ink-secondary">Recommended Topics to Study</h3>
            <div className="flex flex-wrap gap-2">
              {report.topics_to_improve.map((t, i) => (
                <span key={i} className="px-3 py-1.5 bg-surface-high text-ink-primary text-sm font-medium rounded-lg border border-border">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="card">
          <h2 className="text-lg font-bold text-ink-primary mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Full Transcript
          </h2>
          <div className="flex flex-col gap-4">
            {messages.length === 0 ? (
              <p className="text-ink-muted text-sm italic">No transcript available.</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'ai' ? 'items-start' : 'items-end'}`}>
                  <span className="text-xs font-bold text-ink-muted uppercase mb-1 ml-1 mr-1">{m.role === 'ai' ? 'AI Examiner' : 'Student'}</span>
                  <div className={`text-sm p-4 rounded-2xl max-w-[85%] ${m.role === 'ai' ? 'bg-surface-high text-ink-primary rounded-tl-sm print:bg-gray-100' : 'bg-primary-50 text-primary-900 rounded-tr-sm border border-primary/10 print:bg-blue-50'}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </>
  );
}
