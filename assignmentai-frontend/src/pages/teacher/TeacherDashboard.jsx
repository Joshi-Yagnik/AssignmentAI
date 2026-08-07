import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable from '../../components/shared/DataTable';
import { useToast } from '../../components/shared/Toast';
import {
  ClipboardList, Clock, Video, Bot, Plus,
  TrendingUp, Users, Eye, Loader2
} from 'lucide-react';
import { getAssignments, getPendingSubmissions } from '../../services/assignmentService';
import api from '../../services/api';

function StatCard({ icon: Icon, label, value, sub, color, attention }) {
  return (
    <div className={`card flex items-center gap-4 ${attention ? 'border-l-4 border-l-warning' : ''}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-[26px] font-bold text-ink-primary leading-none">{value}</p>
        <p className="text-label-md text-ink-secondary mt-0.5">{label}</p>
        {sub && <p className="text-label-sm text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 bg-surface-high rounded-full overflow-hidden">
        <div className="h-full bg-indigo-gradient rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-label-sm text-ink-muted w-8 text-right">{value}%</span>
    </div>
  );
}

export default function TeacherDashboard() {
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeAssignments: 0,
    pendingReviews: 0,
    liveVivas: 0,
    aiGraded: 0,
    totalStudents: 0,
  });
  const [courses, setCourses] = useState([]);
  const [vivas, setVivas] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Use Promise.allSettled so one failing endpoint doesn't crash the dashboard
        const results = await Promise.allSettled([
          getAssignments(),
          getPendingSubmissions(),
          api.get('/viva/sessions'),
          api.get('/submissions/teacher/students'),
        ]);

        const assignmentsData = results[0].status === 'fulfilled' ? results[0].value : [];
        const submissionsData = results[1].status === 'fulfilled' ? results[1].value : [];
        const vivasRes        = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
        const studentsRes     = results[3].status === 'fulfilled' ? results[3].value : { data: [] };

        // Ensure we always have arrays to prevent .length or .map from crashing if backend returns null
        const assignmentsList = Array.isArray(assignmentsData) ? assignmentsData : [];
        const submissionsList = Array.isArray(submissionsData) ? submissionsData : [];
        const vivaList        = Array.isArray(vivasRes?.data) ? vivasRes.data : [];
        const studentList     = Array.isArray(studentsRes?.data) ? studentsRes.data : [];

        // Log any individual failures for debugging
        const labels = ['assignments', 'submissions', 'vivas', 'students'];
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.warn(`[TeacherDashboard] Failed to load ${labels[i]}:`, r.reason?.message || r.reason);
          }
        });

        // Compute active assignments
        const activeAssignments = assignmentsList.length;
        
        // Vivas
        const liveVivas = vivaList.filter(v => v.status === 'live').length;
        setVivas(vivaList.map(v => {
          let meta = {};
          try { meta = JSON.parse(v.transcript || '{}'); } catch(e){}
          return {
            id: v.id,
            title: meta.title || 'Viva Session',
            status: v.status === 'scheduled' ? 'upcoming' : v.status,
            date: new Date(v.scheduled_time).toLocaleDateString(),
            time: new Date(v.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            students: v.total_questions || meta.questions?.length || 1, // Fallback placeholder
          };
        }).slice(0, 5));

        // Submissions
        const subs = submissionsList.map(s => {
          return {
            id: s.id,
            student: `${s.users?.first_name || ''} ${s.users?.last_name || ''}`.trim() || 'Unknown',
            avatar: (s.users?.first_name?.[0] || 'U').toUpperCase(),
            rollNo: s.users?.email || 'N/A',
            assignment: s.assignments?.title || 'Unknown Assignment',
            course: s.assignments?.class_id || 'N/A',
            submitted: new Date(s.submitted_at).toLocaleDateString(),
            aiGrade: s.ai_reports?.final_score || 0
          };
        });
        setPendingSubmissions(subs);

        // Resolve student data FIRST so it's available for subject enrolled counts
        const gradedCount = studentList.reduce((acc, s) => acc + (s.graded_count || 0), 0);
        
        // Courses summary (Grouping assignments by subject with real student counts)
        const subjectsMap = {};
        assignmentsList.forEach(a => {
          if (a.subjects) {
            const sid = a.subjects.id;
            if (!subjectsMap[sid]) {
              subjectsMap[sid] = {
                id: sid,
                code: a.subjects.code,
                name: a.subjects.name,
                enrolled: studentList.length, // real student count from this teacher's submissions
                submissions: 0, // will compute below
                pendingReviews: 0,
                assignmentIds: [],
              };
            }
            subjectsMap[sid].assignmentIds.push(a.id);
          }
        });

        // Count pending reviews per subject by matching assignment_id
        submissionsList.forEach(s => {
          const aId = s.assignment_id;
          for (const subj of Object.values(subjectsMap)) {
            if (subj.assignmentIds.includes(aId)) {
              subj.pendingReviews++;
              break;
            }
          }
        });

        // Compute submission % (pending / total students, capped at 100)
        Object.values(subjectsMap).forEach(subj => {
          subj.submissions = studentList.length > 0
            ? Math.min(100, Math.round((subj.pendingReviews / studentList.length) * 100))
            : 0;
        });

        setCourses(Object.values(subjectsMap).slice(0, 3));

        setStats({
          activeAssignments,
          pendingReviews: subs.length,
          liveVivas,
          aiGraded: gradedCount,
          totalStudents: studentList.length,
        });

        // Show a warning if some data couldn't be loaded
        const failedCount = results.filter(r => r.status === 'rejected').length;
        if (failedCount > 0) {
          toast({ type: 'warning', title: `${failedCount} data source(s) unavailable`, message: 'Some dashboard sections may show partial data.' });
        }

      } catch (err) {
        toast({ type: 'error', title: 'Failed to load dashboard data' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const submissionColumns = [
    { key: 'student',    label: 'Student',    sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold text-xs flex items-center justify-center">{row.avatar}</span>
          <div>
            <p className="font-semibold text-ink-primary text-sm">{v}</p>
            <p className="text-label-sm text-ink-muted">{row.rollNo}</p>
          </div>
        </div>
      )
    },
    { key: 'assignment', label: 'Assignment', sortable: true },
    { key: 'course',     label: 'Course',     width: '80px' },
    { key: 'submitted',  label: 'Submitted',  sortable: true, width: '90px' },
    { key: 'aiGrade',    label: 'AI Pre-Grade', width: '110px',
      render: v => (
        <span className={`font-semibold ${v >= 85 ? 'text-success' : v >= 70 ? 'text-warning' : 'text-danger'}`}>
          {v}% <span className="text-ink-muted font-normal text-xs">(AI)</span>
        </span>
      )
    },
    { key: 'id', label: 'Action', width: '100px',
      render: (_, row) => (
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/teacher/review/${row.id}`)}>
          <Eye className="w-3 h-3" /> Review
        </button>
      )
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Teacher Dashboard"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        showSearch
        actions={
          <button className="btn-primary btn-sm" onClick={() => navigate('/teacher/assignments')}>
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        }
      />

      <main className="p-4 md:p-6 flex flex-col gap-5 md:gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={ClipboardList} label="Active Assignments"  value={stats.activeAssignments}    color="bg-primary"           />
          <StatCard icon={Clock}         label="Pending Reviews"     value={stats.pendingReviews}   sub="Needs attention" color="bg-warning" attention={stats.pendingReviews > 0} />
          <StatCard icon={Video}         label="Live Viva Today"     value={stats.liveVivas}    color="bg-danger"            />
          <StatCard icon={Bot}           label="AI Graded Today"     value={stats.aiGraded}   color="bg-success"           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          {/* Courses */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-headline-sm">Course Summary</h2>
            <div className="grid grid-cols-1 gap-3">
              {courses.length === 0 ? (
                 <div className="card p-6 text-center text-ink-muted">No courses found. Deploy an assignment to get started.</div>
              ) : courses.map(c => (
                <div key={c.id} className="card-hover flex items-center gap-5 py-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-ink-primary text-sm">{c.code} — {c.name}</p>
                      {c.pendingReviews === 0
                        ? <StatusBadge status="graded" label="All Reviewed" />
                        : <span className="text-label-sm text-warning-text font-semibold">{c.pendingReviews} pending</span>
                      }
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center gap-1 text-label-sm text-ink-muted">
                        <Users className="w-3.5 h-3.5" />{c.enrolled} students
                      </span>
                    </div>
                    <ProgressBar value={c.submissions} />
                  </div>
                  <button
                    className={`btn btn-sm shrink-0 ${c.pendingReviews > 0 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => navigate('/teacher/assignments')}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Viva panel */}
          <div className="flex flex-col gap-3">
            <h2 className="text-headline-sm">Upcoming Vivas</h2>
            {vivas.length === 0 ? (
               <div className="card p-6 text-center text-ink-muted border-border/60">No upcoming vivas.</div>
            ) : vivas.map(v => (
              <div key={v.id} className="card border border-border/60 flex flex-col gap-3 py-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink-primary text-sm">{v.title}</p>
                  <StatusBadge status={v.status === 'upcoming' ? 'live' : 'upcoming'} dot={v.status === 'upcoming'} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-label-sm text-ink-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />{v.date} · {v.time}
                  </p>
                  <p className="text-label-sm text-ink-muted flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />{v.students} questions
                  </p>
                </div>
                <button
                  className={`btn btn-sm w-full justify-center ${v.status === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => navigate('/teacher/viva')}
                >
                  {v.status === 'upcoming' ? 'Start Session' : 'View Details'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pending submissions table */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <h2 className="text-headline-sm">Pending Submissions</h2>
            <span className="text-label-sm text-ink-muted">{pendingSubmissions.length} awaiting review</span>
          </div>
          <div className="p-4">
            <DataTable columns={submissionColumns} data={pendingSubmissions} searchable searchKeys={['student', 'assignment']} />
          </div>
        </div>
      </main>
    </>
  );
}
