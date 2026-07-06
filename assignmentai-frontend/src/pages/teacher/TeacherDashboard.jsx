import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable from '../../components/shared/DataTable';
import { useToast } from '../../components/shared/Toast';
import {
  ClipboardList, Clock, Video, Bot, Plus,
  TrendingUp, Users, Eye,
} from 'lucide-react';
import {
  TEACHER_COURSES, PENDING_SUBMISSIONS, VIVA_SESSIONS
} from '../../data/mockData';

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

  return (
    <>
      <TopBar
        title="Teacher Dashboard"
        subtitle="Monday, 7 July 2026"
        showSearch
        actions={
          <button className="btn-primary btn-sm" onClick={() => toast({ type: 'info', title: 'Opening assignment form…' })}>
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        }
      />

      <main className="p-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} label="Active Assignments"  value={8}    color="bg-primary"           />
          <StatCard icon={Clock}         label="Pending Reviews"     value={23}   sub="Needs attention" color="bg-warning" attention />
          <StatCard icon={Video}         label="Live Viva Today"     value={2}    color="bg-danger"            />
          <StatCard icon={Bot}           label="AI Graded Today"     value={47}   color="bg-success"           />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Courses */}
          <div className="col-span-2 flex flex-col gap-4">
            <h2 className="text-headline-sm">Course Summary</h2>
            <div className="grid grid-cols-1 gap-3">
              {TEACHER_COURSES.map(c => (
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
                    onClick={() => toast({ type: 'info', title: `Opening ${c.name}…` })}
                  >
                    {c.pendingReviews > 0 ? 'Review Now' : 'View'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Viva panel */}
          <div className="flex flex-col gap-3">
            <h2 className="text-headline-sm">Upcoming Vivas</h2>
            {VIVA_SESSIONS.map(v => (
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
                    <Users className="w-3.5 h-3.5" />{v.students} students
                  </p>
                </div>
                <button
                  className={`btn btn-sm w-full justify-center ${v.status === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toast({ type: v.status === 'upcoming' ? 'success' : 'info', title: v.status === 'upcoming' ? 'Starting session…' : 'Opening details…' })}
                >
                  {v.status === 'upcoming' ? 'Start Session' : 'View Details'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pending submissions table */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-headline-sm">Pending Submissions</h2>
            <span className="text-label-sm text-ink-muted">{PENDING_SUBMISSIONS.length} awaiting review</span>
          </div>
          <div className="p-4">
            <DataTable columns={submissionColumns} data={PENDING_SUBMISSIONS} searchable searchKeys={['student', 'assignment']} />
          </div>
        </div>
      </main>
    </>
  );
}
