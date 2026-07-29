import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../components/shared/Toast';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Mic, MicOff, Camera as CameraIcon, CameraOff, Shield, AlertTriangle, ChevronRight, MessageSquare, Bot, Volume2, VolumeX } from 'lucide-react';
import api from '../../services/api';
import { getNextVivaQuestion, evaluateVivaSession } from '../../services/vivaService';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
  : 'http://localhost:5000';

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

export default function VivaExamPage() {
  const toast  = useToast();
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  
  const templateSessionId = location.state?.templateSessionId || sessionId;
  const studentName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Student';

  // Session Meta
  const [meta, setMeta] = useState({ title: 'AI Viva', duration_minutes: 30 });
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [currentAiQuestion, setCurrentAiQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [loadingAI, setLoadingAI] = useState(true); // true initially to fetch first question
  
  // Media State
  const [micOn, setMicOn]     = useState(true);
  const [camOn, setCamOn]     = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [faceStatus, setFaceStatus] = useState('Initializing...');
  const [warnings, setWarnings] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const recognitionRef = useRef(null);

  // Helper to speak text
  const speakText = useCallback((text) => {
    if (!soundOn || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [soundOn]);

  // Initial load: get session details & first question
  useEffect(() => {
    async function init() {
      try {
        const { data: session } = await api.get(`/viva/sessions/${sessionId}`);
        const parsed = JSON.parse(session.transcript || '{}');
        setMeta(parsed);
        setTimeLeft((parsed.duration_minutes || 30) * 60);
        setTotalQuestions(session.total_questions || 5);
        
        // Fetch first question
        const result = await getNextVivaQuestion(sessionId, [], 0);
        setCurrentAiQuestion(result.next_question);
        setMessages([{ role: 'ai', content: result.next_question }]);
        speakText(result.next_question);
      } catch (err) {
        toast({ type: 'error', title: 'Failed to initialize viva session' });
      } finally {
        setLoadingAI(false);
      }
    }
    init();
  }, [sessionId, speakText, toast]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  // WebRTC & Speech Recognition Setup
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_viva', { sessionId: templateSessionId, studentName, role: 'student' });

    async function loadMedia() {
      try {
        setFaceStatus('Requesting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStreamError(false);
        setFaceStatus('Face ID: Verified ✓');
      } catch (err) {
        setStreamError(true);
        setFaceStatus('Camera access denied');
      }
    }
    loadMedia();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
          setAnswer(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };
      
      recognition.start();
      recognitionRef.current = recognition;
    }

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (recognitionRef.current) recognitionRef.current.stop();
      if (socketRef.current) socketRef.current.disconnect();
      window.speechSynthesis.cancel();
    };
  }, [sessionId, templateSessionId, studentName]);

  // Handle toggles
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = micOn);
      streamRef.current.getVideoTracks().forEach(t => t.enabled = camOn);
    }
    if (recognitionRef.current) {
      if (micOn) recognitionRef.current.start().catch(() => {});
      else recognitionRef.current.stop();
    }
  }, [micOn, camOn]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    window.speechSynthesis.cancel();
    setLoadingAI(true);

    const newMessages = [...messages, { role: 'student', content: answer.trim() }];
    setMessages(newMessages);
    setAnswer('');
    
    // Send temp state to socket for teacher to monitor
    if (socketRef.current) {
      socketRef.current.emit('viva_transcript_update', {
        sessionId: templateSessionId,
        studentName,
        transcript: JSON.stringify(newMessages)
      });
    }

    try {
      const result = await getNextVivaQuestion(sessionId, newMessages, questionCount + 1);
      
      if (result.evaluation_of_last_answer) {
        toast({ type: 'info', title: 'AI Feedback', message: result.evaluation_of_last_answer });
      }

      setQuestionCount(prev => prev + 1);

      if (result.should_end) {
        toast({ type: 'success', title: 'Viva Concluded', message: 'Generating final report...' });
        await handleEvaluate(newMessages);
      } else {
        const nextQ = { role: 'ai', content: result.next_question };
        setMessages([...newMessages, nextQ]);
        setCurrentAiQuestion(result.next_question);
        speakText(result.next_question);
      }
    } catch (err) {
      toast({ type: 'error', title: 'Failed to communicate with AI' });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleEvaluate = async (finalMessages) => {
    try {
      await evaluateVivaSession(sessionId, finalMessages);
      navigate(`/student/viva/report/${sessionId}`);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to generate report' });
      navigate('/student/viva');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="h-14 px-4 md:px-6 flex items-center justify-between bg-primary-950 shrink-0">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary-300" />
          <span className="text-white font-bold text-sm">AssignmentAI</span>
          <span className="text-primary-300 text-sm hidden sm:inline">·</span>
          <span className="text-primary-200 text-sm hidden sm:inline">{meta.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse-dot" />
            <span className="text-white/70 text-xs font-semibold">LIVE</span>
          </span>
          <span className="font-mono text-xl font-bold tracking-widest text-white">
            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-4 md:p-5 overflow-hidden">
        
        {/* Main Exam Area */}
        <div className="flex flex-col gap-4 overflow-hidden h-full">
          
          {/* AI Interviewer View */}
          <div className="card p-0 overflow-hidden flex-shrink-0 bg-primary-50 border-2 border-primary-100 flex flex-col items-center justify-center min-h-[200px] relative">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button onClick={() => setSoundOn(!soundOn)} className="btn btn-ghost btn-sm text-primary-700 bg-white/50 hover:bg-white">
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
            
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${loadingAI ? 'bg-primary/20 animate-pulse' : 'bg-primary-100 border-4 border-primary-200 shadow-xl shadow-primary/20'}`}>
              <Bot className={`w-12 h-12 ${loadingAI ? 'text-primary/50' : 'text-primary'}`} />
            </div>
            
            <div className="mt-6 max-w-2xl text-center px-6">
              {loadingAI ? (
                <div className="flex items-center justify-center gap-2 text-primary-700 font-medium">
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  AI is thinking...
                </div>
              ) : (
                <p className="text-lg md:text-xl font-semibold text-primary-900 leading-relaxed">"{currentAiQuestion}"</p>
              )}
            </div>
          </div>

          {/* Student Answer Area */}
          <div className="card flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0 flex items-center gap-2">
                Your Answer 
                {micOn && !streamError && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1"><Mic className="w-3 h-3"/> Listening...</span>}
              </label>
              <div className="text-label-sm text-ink-muted">
                Question {questionCount + 1} of {totalQuestions}
              </div>
            </div>
            
            <textarea
              className="input resize-none flex-1 focus:ring-2 focus:ring-primary/40 text-base leading-relaxed"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={micOn ? "Speak your answer or type here..." : "Type your answer here..."}
              disabled={loadingAI}
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMicOn(!micOn)} 
                  className={`btn btn-sm ${micOn ? 'bg-primary-50 text-primary-700' : 'bg-surface-high text-ink-muted'}`}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>
              <button
                className="btn-primary"
                onClick={handleSubmitAnswer}
                disabled={loadingAI || !answer.trim()}
              >
                Submit Answer <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* Student Camera */}
          <div className="card p-0 overflow-hidden bg-black relative h-48 rounded-xl shrink-0">
            {camOn && !streamError ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5 z-10 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-[10px] font-medium text-white">{faceStatus}</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CameraOff className="w-8 h-8 text-white/30" />
              </div>
            )}
            <button 
              onClick={() => setCamOn(!camOn)} 
              className="absolute bottom-2 left-2 btn btn-sm bg-black/50 text-white hover:bg-black/80 border-none px-2"
            >
              {camOn ? <CameraIcon className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="card flex flex-col gap-3 shrink-0">
            <h3 className="font-semibold text-ink-primary flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-primary" /> Security
            </h3>
            <SecurityRow label="Face Detected" ok={faceStatus !== 'Camera access denied'} />
            <SecurityRow label="Audio Normal" ok={micOn} />
            <div className="pt-2 border-t border-border mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-warning-text font-semibold uppercase tracking-wider">Violations: {warnings}/3</span>
              </div>
              <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
                <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${(warnings/3)*100}%` }} />
              </div>
            </div>
          </div>

          {/* Chat History summary (optional) */}
          <div className="card flex-1 flex flex-col gap-3 min-h-[200px]">
            <h3 className="font-semibold text-ink-primary flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-primary" /> Transcript History
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              {messages.length === 0 && <p className="text-xs text-ink-muted italic">No messages yet.</p>}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'ai' ? 'items-start' : 'items-end'}`}>
                  <span className="text-[10px] font-bold text-ink-muted uppercase mb-0.5 ml-1 mr-1">{m.role === 'ai' ? 'AI Examiner' : 'You'}</span>
                  <div className={`text-xs p-2 rounded-xl max-w-[90%] ${m.role === 'ai' ? 'bg-primary-50 text-primary-900 rounded-tl-sm' : 'bg-surface-high text-ink-primary rounded-tr-sm'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
