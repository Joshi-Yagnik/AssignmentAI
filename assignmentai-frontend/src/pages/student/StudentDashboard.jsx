import { useState, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import { useAuth } from '../../context/AuthContext';
import { getStudentAssignments } from '../../services/assignmentService';
import { getMaterials } from '../../services/materialService';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
  BookOpen, CheckCircle, Clock, Star, Video,
  Upload, ChevronRight, Zap, File as FileIcon, X
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[26px] font-bold text-ink-primary leading-none">{value}</p>
        <p className="text-label-md text-ink-secondary mt-0.5">{label}</p>
        {sub && <p className="text-label-sm text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function getEffectiveStatus(assignment) {
  if (assignment.submission?.status === 'graded')    return 'graded';
  if (assignment.submission?.status === 'submitted') return 'submitted';
  const now = new Date();
  if (new Date(assignment.deadline) < now)           return 'overdue';
  return 'pending';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingViva, setUpcomingViva] = useState(null);
  
  const [recentMaterials, setRecentMaterials] = useState([]);
  const [viewedMaterials, setViewedMaterials] = useState([]);

  useEffect(() => {
    // Load viewed materials state
    setViewedMaterials(JSON.parse(localStorage.getItem('viewed_materials') || '[]'));
  }, []);

  useEffect(() => {
    // Socket setup
    const socket = io(SOCKET_URL);
    socket.on('new_study_material', (material) => {
      setRecentMaterials(prev => [material, ...prev].slice(0, 5)); // keep last 5
      toast({ type: 'info', title: 'New Study Material uploaded!' });
    });

    return () => socket.disconnect();
  }, [toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assignments and viva sessions in parallel
        const results = await Promise.allSettled([
          getStudentAssignments(),
          api.get('/viva/sessions'),
          getMaterials(),
        ]);

        // Handle assignments
        if (results[0].status === 'fulfilled') {
          const data = results[0].value;
          const enriched = data.map(a => ({
            ...a,
            effectiveStatus: getEffectiveStatus(a),
            courseLabel: a.subjects?.name || 'Unknown Course',
          }));
          setAssignments(enriched);
        } else {
          toast({ type: 'error', title: 'Failed to load assignments' });
        }

        // Handle viva sessions — find the most relevant active session
        if (results[1].status === 'fulfilled') {
          const vivaSessions = results[1].value?.data || [];
          // Prioritize live sessions, then scheduled ones
          const activeSession = vivaSessions.find(s => s.status === 'live')
            || vivaSessions.find(s => s.status === 'scheduled');
          
          if (activeSession) {
            let meta = {};
            try { meta = JSON.parse(activeSession.transcript || '{}'); } catch {}
            const scheduledAt = activeSession.scheduled_time ? new Date(activeSession.scheduled_time) : null;
            setUpcomingViva({
              id: activeSession.id,
              title: meta.title || 'Live Viva Session',
              status: activeSession.status,
              date: scheduledAt ? scheduledAt.toLocaleDateString() : '—',
              time: scheduledAt ? scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
              questionsCount: activeSession.total_questions || meta.questions?.length || 0,
            });
          }
        }
        
        // Handle materials
        if (results[2].status === 'fulfilled') {
          // just show top 3 recent on dashboard
          setRecentMaterials(results[2].value.slice(0, 3));
        }
      } catch (err) {
        toast({ type: 'error', title: 'Failed to load dashboard data' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const stats = {
    total:     assignments.length,
    submitted: assignments.filter(a => a.effectiveStatus === 'submitted').length,
    pending:   assignments.filter(a => a.effectiveStatus === 'pending').length,
    graded:    assignments.filter(a => a.effectiveStatus === 'graded').length,
    avgGrade:  Math.round(assignments.filter(a => a.submission?.ai_reports?.[0]?.final_score).reduce((s, a) => s + (a.submission?.ai_reports?.[0]?.final_score || 0), 0)
               / (assignments.filter(a => a.submission?.ai_reports?.[0]?.final_score).length || 1)) || 0,
  };

  const columns = [
    { key: 'title',    label: 'Assignment',  sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-semibold text-ink-primary">{v}</p>
          <p className="text-label-sm text-ink-muted mt-0.5">{row.courseLabel}</p>
        </div>
      )
    },
    { key: 'courseLabel',   label: 'Course',    sortable: true, width: '130px' },
    { key: 'deadline', label: 'Deadline',  sortable: true, width: '110px',
      render: (v) => {
        if (!v) return '—';
        return <span className="text-ink-secondary">{new Date(v).toLocaleDateString()}</span>;
      }
    },
    { key: 'effectiveStatus',   label: 'Status',   width: '120px',
      render: v => <StatusBadge status={v} />
    },
    { key: 'aiGrade',  label: 'AI Grade', width: '100px',
      render: (v, row) => {
        const score = row.submission?.ai_reports?.[0]?.final_score;
        return score != null
          ? <span className="font-semibold text-primary-700">{score}/100</span>
          : <span className="text-ink-muted">—</span>
      }
    },
    { key: 'id',       label: 'Action',   width: '130px',
      render: (v, row) => (
        row.effectiveStatus === 'pending' || row.effectiveStatus === 'overdue'
          ? <button
              className="btn btn-primary btn-sm gap-1 w-full"
              onClick={() => navigate(`/student/submit/${row.id}`)}
            >
              <Upload className="w-3 h-3" aria-hidden="true" /> Submit
            </button>
          : <button
              className="btn btn-secondary btn-sm gap-1 w-full"
              onClick={() => navigate(`/student/submit/${row.id}`)}
            >
              View <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
      )
    },
  ];

  return (
    <>
      <TopBar
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Student'}! 👋`}
        subtitle="Here's your assignment overview"
        showSearch
      />

      <main className="p-4 md:p-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}    label="Total Assignments" value={stats.total}    color="bg-info"    />
          <StatCard icon={CheckCircle} label="Submitted"         value={stats.submitted} sub="On time" color="bg-success" />
          <StatCard icon={Clock}       label="Pending"           value={stats.pending}  sub="Due soon" color="bg-warning" />
          <StatCard icon={Star}        label="Average Grade"     value={`${stats.avgGrade}%`} color="bg-primary" />
        </div>

        {/* Upcoming Viva alert — shows only when there's a real live/scheduled session */}
        {upcomingViva && (
          <div className={`card border-l-4 ${upcomingViva.status === 'live' ? 'border-l-danger' : 'border-l-primary'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${upcomingViva.status === 'live' ? 'bg-danger-bg' : 'bg-primary-50'}`}>
                <Video className={`w-5 h-5 ${upcomingViva.status === 'live' ? 'text-danger' : 'text-primary'}`} aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-primary">{upcomingViva.title}</p>
                  <StatusBadge status={upcomingViva.status === 'live' ? 'live' : 'upcoming'} dot />
                </div>
                <p className="text-label-md text-ink-secondary">
                  {upcomingViva.status === 'live' ? 'Session is LIVE now!' : `Scheduled: ${upcomingViva.date} at ${upcomingViva.time}`}
                  {upcomingViva.questionsCount > 0 && ` · ${upcomingViva.questionsCount} questions`}
                </p>
              </div>
            </div>
            <button
              className={`btn-primary btn-sm shrink-0 w-full sm:w-auto justify-center ${upcomingViva.status === 'live' ? 'bg-danger hover:bg-danger/90' : ''}`}
              onClick={() => navigate('/student/viva')}
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              {upcomingViva.status === 'live' ? 'Join Now' : 'View Viva'}
            </button>
          </div>
        )}

        {/* Recent Study Materials */}
        {recentMaterials.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
              <h2 className="text-headline-sm flex items-center gap-2">
                <FileIcon className="w-5 h-5 text-primary" /> Recent Study Materials
              </h2>
              <button 
                onClick={() => navigate('/student/materials')}
                className="text-label-sm text-primary hover:underline font-semibold"
              >
                View All
              </button>
            </div>
            <div className="p-4 flex gap-4 overflow-x-auto snap-x hide-scrollbar">
              {recentMaterials.map(mat => {
                const isNew = !viewedMaterials.includes(mat.id);
                return (
                  <div key={mat.id} className="min-w-[280px] sm:min-w-[320px] snap-start card bg-surface p-4 flex flex-col hover:shadow-hover transition-shadow relative border border-border">
                    {isNew && (
                      <span className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full animate-pulse-soft">
                        New
                      </span>
                    )}
                    <h3 className="font-bold text-ink-primary text-md truncate pr-10">{mat.title}</h3>
                    <p className="text-sm text-ink-muted mt-1 truncate">{mat.subjects?.name || 'General'}</p>
                    <button 
                      onClick={() => {
                        navigate('/student/materials');
                      }}
                      className="btn-secondary btn-sm mt-4 self-start"
                    >
                      Open
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assignment list */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <h2 className="text-headline-sm">My Assignments</h2>
            <span className="text-label-sm text-ink-muted">{assignments.length} total</span>
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={assignments}
              searchable
              searchKeys={['title', 'courseLabel']}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </>
  );
}
