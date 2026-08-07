import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { Video, Clock, Calendar, ChevronRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

function parseSessionMeta(session) {
  try {
    const meta = JSON.parse(session.transcript || '{}');
    return {
      title: meta.title || 'Live Viva Session',
      duration: session.duration_minutes || meta.duration_minutes || 45,
      questionsCount: session.total_questions || meta.questions?.length || 5,
    };
  } catch {
    return { title: 'Live Viva Session', duration: 45, questionsCount: 5 };
  }
}

function StatusBadge({ status }) {
  if (status === 'live') return (
    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-bold">
      <span className="w-2 h-2 rounded-full bg-danger animate-pulse" /> LIVE
    </span>
  );
  if (status === 'completed' || status === 'terminated') return (
    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-high text-ink-muted text-xs font-bold">
      <CheckCircle2 className="w-3.5 h-3.5" /> Ended
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
      <Clock className="w-3 h-3" /> Scheduled
    </span>
  );
}

export default function VivaLobbyPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/viva/sessions');
      setSessions(data || []);
    } catch {
      toast({ type: 'error', title: 'Failed to load viva sessions' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (session) => {
    const meta = parseSessionMeta(session);
    setJoiningId(session.id);
    try {
      // Call join endpoint — creates a personal participation row for this student
      const { data } = await api.post(`/viva/sessions/${session.id}/join`);
      if (data.completed) {
        navigate(`/student/viva/report/${data.sessionId}`);
      } else {
        // Navigate to exam with the student's own session id
        navigate(`/student/viva/${data.sessionId}`, {
          state: { meta, templateSessionId: session.id, examSessionId: data.examSessionId }
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to join session';
      toast({ type: 'error', title: 'Cannot Join', message: msg });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <>
      <TopBar
        title="Live Viva"
        subtitle="Join your scheduled live viva exam sessions."
      />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-5xl mx-auto w-full">

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-surface-high rounded w-2/3 mb-3" />
                <div className="h-4 bg-surface-high rounded w-1/2 mb-4" />
                <div className="h-10 bg-surface-high rounded" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <Video className="w-12 h-12 text-ink-muted/30 mb-4" />
            <p className="text-ink-secondary font-semibold">No Viva Sessions Yet</p>
            <p className="text-label-sm text-ink-muted mt-1 max-w-sm">
              Your teacher hasn't scheduled any viva sessions for you. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map(session => {
              const meta = parseSessionMeta(session);
              const isLive = session.status === 'live';
              const isScheduled = session.status === 'scheduled';
              const isDone = session.status === 'completed' || session.status === 'terminated';
              const scheduledAt = session.scheduled_time ? new Date(session.scheduled_time) : null;
              const isJoining = joiningId === session.id;
              const canJoin = isLive || isScheduled;

              return (
                <div key={session.id} className={`card flex flex-col gap-4 hover:shadow-md transition-shadow ${isLive ? 'border-danger/40 border-2' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Video className={`w-5 h-5 ${isLive ? 'text-danger' : 'text-primary'}`} />
                    </div>
                    <StatusBadge status={session.status} />
                  </div>

                  <div>
                    <h3 className="font-bold text-ink-primary leading-snug">{meta.title}</h3>
                    {scheduledAt && (
                      <p className="text-label-sm text-ink-muted mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {scheduledAt.toLocaleDateString()} at {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <p className="text-label-sm text-ink-muted mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {meta.duration} minutes · {meta.questionsCount} questions
                    </p>
                  </div>

                  {isLive && (
                    <div className="p-3 rounded-lg bg-danger/5 border border-danger/20 flex items-center gap-2 text-sm text-danger font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Session is LIVE — join now!
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-border">
                    <button
                      disabled={isDone || isJoining}
                      className={`btn btn-sm w-full flex items-center justify-center gap-2 ${
                        isLive ? 'btn-primary bg-danger hover:bg-danger/90' :
                        isDone ? 'btn-secondary opacity-50 cursor-not-allowed' :
                        'btn-secondary'
                      }`}
                      onClick={() => canJoin && !isJoining && handleJoin(session)}
                    >
                      {isJoining ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                      ) : isDone ? (
                        'Viva Completed'
                      ) : isLive ? (
                        <>Join Now <ChevronRight className="w-4 h-4" /></>
                      ) : (
                        <>Enter Exam Room <ChevronRight className="w-4 h-4" /></>
                      )}
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
