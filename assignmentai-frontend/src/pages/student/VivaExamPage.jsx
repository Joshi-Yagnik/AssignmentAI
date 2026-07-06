import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../components/shared/Toast';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Camera as CameraIcon, CameraOff, Shield, AlertTriangle, ChevronRight, ChevronLeft, Lightbulb, Bot } from 'lucide-react';
import { VIVA_QUESTIONS } from '../../data/mockData';
import { submitVivaAnswer, endVivaSession } from '../../services/vivaService';

function SecurityRow({ label, ok, warning }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-label-md text-ink-secondary">{label}</span>
      {warning
        ? <span className="flex items-center gap-1.5 text-label-sm text-warning-text font-semibold"><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />{warning}</span>
        : <span className="flex items-center gap-1.5 text-label-sm text-success font-semibold">
            <span className="w-2 h-2 rounded-full bg-success" />Verified
          </span>
      }
    </div>
  );
}

function Timer({ seconds }) {
  const h = String(Math.floor(seconds / 3600)).padStart(2,'0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2,'0');
  const s = String(seconds % 60).padStart(2,'0');
  return <span className="font-mono text-xl md:text-2xl font-bold tracking-widest text-white" aria-label={`Time remaining: ${h} hours, ${m} minutes, ${s} seconds`}>{h}:{m}:{s}</span>;
}

export default function VivaExamPage() {
  const toast  = useToast();
  const navigate = useNavigate();
  const [qIdx, setQIdx]       = useState(0);
  const [answer, setAnswer]   = useState('');
  const [micOn, setMicOn]     = useState(true);
  const [camOn, setCamOn]     = useState(true);
  const [hints,  setHints]    = useState(2);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 mins
  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);

  // Security / Violations
  const [warnings, setWarnings] = useState(() => {
    return parseInt(sessionStorage.getItem('viva_warnings') || '0', 10);
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  // Initialize WebRTC Camera & Mic
  useEffect(() => {
    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStreamError(false);
      } catch (err) {
        console.error("Media access denied:", err);
        setStreamError(true);
        toast({ type: 'error', title: 'Camera/Mic Denied', message: 'Please allow camera and microphone access to proceed.', duration: 6000 });
      }
    }
    startMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  // Handle toggles
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = micOn);
      streamRef.current.getVideoTracks().forEach(t => t.enabled = camOn);
    }
  }, [micOn, camOn]);

  // Violation tracker (Tab switch / Blur)
  const addWarning = useCallback(() => {
    setWarnings(prev => {
      const nw = prev + 1;
      sessionStorage.setItem('viva_warnings', nw.toString());
      if (nw >= 3) {
        toast({ type: 'error', title: 'Exam Terminated', message: 'Maximum security violations reached. Auto-submitting.' });
        // Normally endVivaSession would be called here
        setTimeout(() => navigate('/student'), 2000);
      } else {
        toast({ type: 'warning', title: 'Security Warning', message: `Tab switch detected. Warning ${nw}/3.` });
      }
      return nw;
    });
  }, [toast, navigate]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') addWarning();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [addWarning]);


  const handleNext = async () => {
    setLoading(true);
    // Simulate API call
    try {
      await new Promise(r => setTimeout(r, 600)); // fake delay
      toast({ type: 'success', title: 'Answer saved' });
      setQIdx(i => i + 1);
      setAnswer('');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = () => {
    toast({ type: 'info', title: 'Exam ended', message: 'Your answers have been saved.' });
    navigate('/student');
  };

  const q = VIVA_QUESTIONS[qIdx];
  const DIFFICULTY_COLOR = { easy: 'text-success', medium: 'text-warning', hard: 'text-danger' };
  const DIFFICULTY_BG    = { easy: 'bg-success-bg', medium: 'bg-warning-bg', hard: 'bg-danger-bg' };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* ── Exam Top Bar ─────────────────────────────────────────────────── */}
      <header className="h-14 px-4 md:px-6 flex items-center justify-between bg-primary-950 shrink-0">
        <div className="hidden sm:flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary-300" aria-hidden="true" />
          <span className="text-white font-bold text-sm">AssignmentAI</span>
          <span className="text-primary-300 text-sm">·</span>
          <span className="text-primary-200 text-sm">AI Ethics — Live Viva</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-center">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse-dot" />
            <span className="text-white/70 text-xs uppercase tracking-wide font-semibold">LIVE</span>
          </span>
          <Timer seconds={timeLeft} />
          <button
            className="sm:hidden btn btn-sm bg-danger/20 text-danger border border-danger/40"
            onClick={handleEnd}
          >
            End
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-primary-200 text-sm">Student Session</span>
          <button
            className="btn btn-sm bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
            onClick={handleEnd}
          >
            End Exam
          </button>
        </div>
      </header>

      {/* ── Responsive Body (Stacks on mobile) ─────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-5 p-4 md:p-5 overflow-y-auto lg:overflow-hidden">

        {/* COL 1 — Camera & Audio (Moves to top on mobile) */}
        <div className="flex flex-col gap-4 order-1 lg:order-2">
          {/* Camera feed */}
          <div className="card p-0 overflow-hidden bg-primary-950 flex-1 relative min-h-[250px] lg:min-h-[320px] rounded-2xl border-4 border-primary-900">
            {camOn && !streamError ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Simulated camera HUD overlays */}
                <div className="absolute inset-4 border-2 border-dashed border-white/20 rounded-xl pointer-events-none" />
                
                {/* Face tracking rect simulation */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-32 h-40 border border-primary-400/50 bg-primary-900/10 rounded-xl" />
                </div>
                
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 z-10">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-white text-xs font-medium">Face ID: Verified ✓</span>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 z-10">
                  <span className="text-white/80 text-xs">AI Analyzing</span>
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CameraOff className="w-12 h-12 text-white/20" />
                <p className="text-white/40 text-sm mt-2">{streamError ? 'Camera access denied' : 'Camera disabled'}</p>
              </div>
            )}
          </div>

          {/* Waveform & Controls */}
          <div className="card py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-end gap-[2px] h-6 w-16">
                  {micOn && !streamError
                    ? Array.from({ length: 12 }, (_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-pulse-dot"
                          style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 100}ms` }}
                        />
                      ))
                    : <span className="text-ink-muted text-xs">Mic off</span>
                  }
                </div>
                <span className="text-label-sm text-ink-secondary hidden sm:inline">Microphone Active</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMicOn(m => !m)} 
                  className={`btn btn-sm ${micOn ? 'bg-primary-50 text-primary-700' : 'bg-surface-high text-ink-muted'}`}
                  aria-pressed={micOn}
                  aria-label="Toggle Microphone"
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setCamOn(c => !c)} 
                  className={`btn btn-sm ${camOn ? 'bg-primary-50 text-primary-700' : 'bg-surface-high text-ink-muted'}`}
                  aria-pressed={camOn}
                  aria-label="Toggle Camera"
                >
                  {camOn ? <CameraIcon className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-ink-muted italic truncate px-2 bg-surface-low rounded py-1">
              Live Transcript: "…the concept of fairness refers to…"
            </p>
          </div>
        </div>

        {/* COL 2 — Q&A (Main focus) */}
        <div className="card flex flex-col gap-5 h-fit order-2 lg:order-2">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-ink-primary">Question Progress</h3>
              <span className="text-label-sm text-ink-muted">{qIdx + 1}/{VIVA_QUESTIONS.length}</span>
            </div>
            <div className="h-2 bg-surface-high rounded-full overflow-hidden" role="progressbar" aria-valuenow={qIdx+1} aria-valuemin={1} aria-valuemax={VIVA_QUESTIONS.length}>
              <div className="h-full bg-indigo-gradient rounded-full transition-all duration-500"
                   style={{ width: `${((qIdx + 1) / VIVA_QUESTIONS.length) * 100}%` }} />
            </div>
          </div>

          {/* Current question */}
          <div className="p-4 rounded-xl border-l-4 border-primary bg-primary-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-sm bg-primary text-white rounded-full px-2.5 py-0.5 font-semibold">
                Question {qIdx + 1}
              </span>
              <span className={`text-label-sm rounded-full px-2.5 py-0.5 font-semibold
                ${DIFFICULTY_BG[q.difficulty]} ${DIFFICULTY_COLOR[q.difficulty]}`}>
                {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
              </span>
            </div>
            <p className="text-ink-primary font-semibold text-sm leading-relaxed" aria-live="polite">{q.text}</p>
          </div>

          {/* Answer */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="answer-box" className="label mb-0">Your Answer</label>
              <span className="text-xs text-primary-700 font-medium bg-primary-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Mic className="w-3 h-3" /> Voice-to-Text active
              </span>
            </div>
            <div className="relative">
              <textarea
                id="answer-box"
                className="input resize-none pr-8 focus:ring-2 focus:ring-primary/40"
                rows={6}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Speak clearly, or type your answer here…"
              />
            </div>
            <div className="flex justify-between text-label-sm text-ink-muted">
              <span>{answer.length} characters</span>
              <span>Min 50 / Max 1000</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-auto pt-2">
            <button
              className="btn btn-ghost btn-sm flex-1 justify-center"
              disabled={qIdx === 0 || loading}
              onClick={() => { setQIdx(i => i - 1); setAnswer(''); }}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              className="btn-primary btn-sm flex-1 justify-center"
              disabled={qIdx === VIVA_QUESTIONS.length - 1 || loading}
              onClick={handleNext}
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
        
        {/* COL 3 — Security (Moves to bottom on mobile) */}
        <div className="flex flex-col gap-5 order-3 lg:order-3">
          <div className="card flex flex-col gap-4 h-fit">
            <h3 className="font-semibold text-ink-primary flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" aria-hidden="true" /> Exam Security
            </h3>
            <SecurityRow label="Face Detected"  ok={!streamError} warning={streamError ? 'Lost' : null} />
            <SecurityRow label="Single Person"  ok />
            <SecurityRow label="Audio Normal"   ok />
            
            <div className="pt-2 border-t border-border mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-label-sm text-warning-text font-semibold">Violations: {warnings}/3</span>
              </div>
              <div className="h-2 bg-surface-high rounded-full overflow-hidden">
                <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${(warnings/3)*100}%` }} />
              </div>
              <p className="text-xs text-ink-muted mt-2">Tab switching or looking away increments warnings. 3 warnings = auto termination.</p>
            </div>
          </div>

          {/* Hint Card */}
          <div className="card bg-surface-low border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-label-sm font-semibold text-ink-primary flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-warning" /> AI Assist
              </h3>
              <span className="text-xs text-ink-muted bg-white px-2 py-0.5 rounded-full shadow-sm border border-border">
                {hints} remaining
              </span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed mb-3">
              Stuck? Use a hint to get a conceptual push in the right direction. Points may be deducted.
            </p>
            <button
              className="btn btn-sm w-full btn-ghost"
              disabled={hints === 0}
              onClick={() => {
                setHints(h => h - 1);
                toast({ type: 'info', title: 'Hint', message: 'Consider the ethical implications on privacy.', duration: 5000 });
              }}
            >
              Reveal Hint
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
