import { useState } from 'react';
import TopBar from '../../components/shared/TopBar';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import {
  BookOpen, CheckCircle, Clock, Star, Video,
  Upload, ChevronRight, Zap, File as FileIcon, X
} from 'lucide-react';
import {
  ASSIGNMENTS, VIVA_SESSIONS, CURRENT_USER
} from '../../data/mockData';

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

export default function StudentDashboard() {
  const user = CURRENT_USER.student;
  const toast = useToast();
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stats = {
    total:     ASSIGNMENTS.length,
    submitted: ASSIGNMENTS.filter(a => a.status === 'submitted').length,
    pending:   ASSIGNMENTS.filter(a => a.status === 'pending').length,
    graded:    ASSIGNMENTS.filter(a => a.aiGrade).length,
    avgGrade:  Math.round(ASSIGNMENTS.filter(a => a.aiGrade).reduce((s, a) => s + a.aiGrade, 0)
               / ASSIGNMENTS.filter(a => a.aiGrade).length) || 0,
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
    { key: 'course',   label: 'Course',    sortable: true, width: '90px' },
    { key: 'deadline', label: 'Deadline',  sortable: true, width: '110px',
      render: v => <span className="text-ink-secondary">{v}</span>
    },
    { key: 'status',   label: 'Status',   width: '120px',
      render: v => <StatusBadge status={v} />
    },
    { key: 'aiGrade',  label: 'AI Grade', width: '100px',
      render: (v) => v
        ? <span className="font-semibold text-primary-700">{v}/100</span>
        : <span className="text-ink-muted">—</span>
    },
    { key: 'id',       label: 'Action',   width: '110px',
      render: (v, row) => (
        row.status === 'pending'
          ? <button
              className="btn btn-primary btn-sm gap-1 w-full"
              onClick={() => { setSelectedAssignment(row); setFile(null); setNotes(''); }}
            >
              <Upload className="w-3 h-3" aria-hidden="true" /> Submit
            </button>
          : <button
              className="btn btn-secondary btn-sm gap-1 w-full"
              onClick={() => toast({ type: 'info', title: 'Opening submission…' })}
            >
              View <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
      )
    },
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file) {
      toast({ type: 'error', title: 'File required', message: 'Please select a file to upload.' });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSelectedAssignment(null);
      toast({ type: 'success', title: 'Submitted!', message: 'Your assignment is being processed by AI.' });
    }, 1500);
  };

  return (
    <>
      <TopBar
        title={`Welcome back, ${user.name.split(' ')[0]}! 👋`}
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

        {/* Upcoming Viva alert */}
        {VIVA_SESSIONS[0] && (
          <div className="card border-l-4 border-l-danger flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-danger-bg flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-danger" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-primary">{VIVA_SESSIONS[0].title}</p>
                  <StatusBadge status="live" dot />
                </div>
                <p className="text-label-md text-ink-secondary">
                  Scheduled: {VIVA_SESSIONS[0].date} at {VIVA_SESSIONS[0].time} · Countdown: 2h 15m
                </p>
              </div>
            </div>
            <button
              className="btn-primary btn-sm shrink-0 w-full sm:w-auto justify-center"
              onClick={() => toast({ type: 'success', title: 'Joining Viva…', message: 'Your camera will be requested.' })}
            >
              <Zap className="w-4 h-4" aria-hidden="true" /> Join Viva
            </button>
          </div>
        )}

        {/* Assignment list */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <h2 className="text-headline-sm">My Assignments</h2>
            <span className="text-label-sm text-ink-muted">{ASSIGNMENTS.length} total</span>
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={ASSIGNMENTS}
              searchable
              searchKeys={['title', 'courseLabel']}
            />
          </div>
        </div>
      </main>

      {/* Submit modal */}
      <Modal
        open={!!selectedAssignment}
        onClose={() => !submitting && setSelectedAssignment(null)}
        title={`Submit: ${selectedAssignment?.title}`}
        footer={
          <>
            <button className="btn btn-ghost" disabled={submitting} onClick={() => setSelectedAssignment(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={submitting || !file}
              onClick={handleSubmit}
            >
              {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Submission'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-surface-low rounded-xl border border-border">
            <p className="text-label-md text-ink-secondary">Course: <span className="font-medium text-ink-primary">{selectedAssignment?.courseLabel}</span></p>
            <p className="text-label-md text-ink-secondary mt-1">Deadline: <span className="font-medium text-ink-primary">{selectedAssignment?.deadline}</span></p>
          </div>
          
          <div>
            <label className="label">Upload File <span className="text-danger">*</span></label>
            {!file ? (
              <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary-50/20 transition-all cursor-pointer focus-within:ring-4 focus-within:ring-primary/10">
                <Upload className="w-8 h-8 text-ink-muted mx-auto mb-2" aria-hidden="true" />
                <p className="text-label-md text-ink-secondary">Drag & drop or <span className="text-primary font-medium">browse</span></p>
                <p className="text-label-sm text-ink-muted mt-1">PDF, DOCX, ZIP — max 50MB</p>
                <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.zip" />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl border border-primary-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileIcon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink-primary text-sm truncate max-w-[200px]">{file.name}</span>
                    <span className="text-label-sm text-ink-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                <button 
                  className="btn-icon text-danger hover:text-danger hover:bg-danger-bg" 
                  onClick={() => setFile(null)}
                  title="Remove file"
                  aria-label="Remove uploaded file"
                  disabled={submitting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="student-notes" className="label">Additional Notes</label>
            <textarea 
              id="student-notes"
              className="input resize-none" 
              rows={3} 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes for your teacher…" 
              disabled={submitting}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
