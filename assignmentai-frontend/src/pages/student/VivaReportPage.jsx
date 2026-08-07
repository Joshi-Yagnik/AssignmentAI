import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import io from 'socket.io-client';
import { MessageSquare, Bot, CheckCircle2, Clock, Award } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

export default function VivaReportPage() {
  const { sessionId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [declaredScore, setDeclaredScore] = useState(null); // null = not yet declared
  const socketRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/viva/sessions/${sessionId}`);
        setSession(data);
        // If already declared in DB
        if (data.result_declared && data.final_score != null) {
          setDeclaredScore(data.final_score);
        }
      } catch (err) {
        toast({ type: 'error', title: 'Failed to load report' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, toast]);

  // Listen for live result declaration via socket
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('result_declared', (data) => {
      if (data.sessionId === sessionId) {
        setDeclaredScore(data.finalScore);
        toast({ type: 'success', title: '🎉 Result Declared!', message: `Your final score is ${data.finalScore}` });
      }
    });
    return () => socketRef.current?.disconnect();
  }, [sessionId, toast]);

  if (loading) return <div className="p-10 text-center text-ink-muted">Loading Report...</div>;
  if (!session) return <div className="p-10 text-center text-ink-muted">Session not found.</div>;

  const report = session.ai_report || {};
  let messages = report.transcript || [];
  if (!messages.length) {
    try {
      const parsed = JSON.parse(session.transcript || '[]');
      if (Array.isArray(parsed)) messages = parsed;
    } catch { }
  }

  // Filter to only AI questions and student answers
  const qaMessages = messages.filter(m => m.role === 'ai' || m.role === 'student');

  return (
    <>
      <TopBar
        title="Viva Exam Report"
        subtitle={`${session.subject || 'Viva'} — Completed`}
      />

      <main className="p-4 md:p-6 max-w-3xl mx-auto w-full flex flex-col gap-6">

        {/* Thank You Banner */}
        <div className="card bg-gradient-to-br from-primary-950 to-primary-900 text-white border-none shadow-xl p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Viva Exam Completed!</h1>
            <p className="text-primary-200 text-sm leading-relaxed max-w-md">
              Thank you for completing your viva exam. Your responses have been recorded and are being reviewed by your professor.
            </p>
          </div>

          {/* Result area */}
          {declaredScore != null ? (
            <div className="mt-2 bg-white/15 rounded-2xl px-8 py-5 flex flex-col items-center gap-1 border border-white/20">
              <Award className="w-6 h-6 text-yellow-300 mb-1" />
              <span className="text-4xl font-black text-white">{declaredScore}<span className="text-xl text-primary-200">/100</span></span>
              <span className="text-sm font-semibold text-primary-200 uppercase tracking-wider">Final Score</span>
            </div>
          ) : (
            <div className="mt-2 bg-white/10 rounded-2xl px-8 py-4 flex items-center gap-3 border border-white/20">
              <Clock className="w-5 h-5 text-primary-300 animate-pulse" />
              <p className="text-primary-100 text-sm font-medium">
                Your result will be declared by your professor soon.
              </p>
            </div>
          )}
        </div>

        {/* Transcript — Questions & Answers only */}
        <div className="card">
          <h2 className="text-lg font-bold text-ink-primary mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Your Viva Transcript
          </h2>
          <div className="flex flex-col gap-5">
            {qaMessages.length === 0 ? (
              <p className="text-ink-muted text-sm italic">No transcript available.</p>
            ) : (
              qaMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'ai' ? 'items-start' : 'items-end'}`}>
                  <span className="text-xs font-bold text-ink-muted uppercase mb-1.5 flex items-center gap-1">
                    {m.role === 'ai' ? (
                      <><Bot className="w-3 h-3" /> AI Examiner</>
                    ) : (
                      'Your Answer'
                    )}
                  </span>
                  <div className={`text-sm p-4 rounded-2xl max-w-[88%] leading-relaxed ${
                    m.role === 'ai'
                      ? 'bg-surface-high text-ink-primary rounded-tl-sm'
                      : 'bg-primary-50 text-primary-900 rounded-tr-sm border border-primary/10'
                  }`}>
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
