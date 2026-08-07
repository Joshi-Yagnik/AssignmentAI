import { useState, useRef, useCallback, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../components/shared/Toast';
import {
  Upload, Lock, Info, Bot, Video, Shield, Save, Send,
  FileText, X, CheckCircle2, Loader2, ExternalLink,
  BookOpen, Calendar, Trash2, Plus, Eye, Pencil
} from 'lucide-react';
import {
  getUploadUrl, uploadFileToStorage, createAssignment, getDownloadUrl, getAssignments, deleteAssignment
} from '../../services/assignmentService';
import { getSubjects } from '../../services/adminService';

// ── Sub-components ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, id, ariaLabel }) {
  return (
    <button
      role="switch" aria-checked={checked} aria-label={ariaLabel} id={id}
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0
        ${checked ? 'bg-primary' : 'bg-surface-high'} focus:outline-none focus:ring-2 focus:ring-primary/40`}
    >
      <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
        ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-label-sm font-semibold text-primary uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

// ── PDF Upload Box ─────────────────────────────────────────────────────────────
function PdfUploadBox({ label, badge, badgeColor, hint, accept, file, uploading, progress, uploaded, uploadedUrl, onFileSelect, onClear, restricted }) {
  const inputRef = useRef(null);
  const toast = useToast();

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  };

  const handleView = async (pathUrl, bucket) => {
    try {
      const { signedUrl } = await getDownloadUrl({ bucket, path: pathUrl });
      window.open(signedUrl, '_blank');
    } catch {
      toast({ type: 'error', title: 'Failed to generate view link' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">{label}</label>
        {badge && (
          <span className={`flex items-center gap-1.5 text-label-sm font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
            <Lock className="w-3 h-3" /> {badge}
          </span>
        )}
      </div>

      {/* Uploaded state */}
      {uploaded && uploadedUrl ? (
        <div className={`flex items-center justify-between p-4 rounded-xl border ${restricted ? 'bg-primary-50/40 border-primary/30' : 'bg-success/5 border-success/30'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
              <FileText className={`w-5 h-5 ${restricted ? 'text-primary' : 'text-success'}`} />
            </div>
            <div>
              <p className="font-semibold text-ink-primary text-sm truncate max-w-[200px]">{file?.name}</p>
              <p className="text-label-sm text-ink-muted">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''} · Uploaded ✓</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleView(uploadedUrl, restricted ? 'answer-keys' : 'question-papers')} className="btn btn-ghost btn-sm" title="Preview">
              <ExternalLink className="w-4 h-4" />
            </button>
            <button type="button" className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" onClick={onClear} title="Remove">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : uploading ? (
        /* Uploading progress */
        <div className={`p-6 rounded-xl border ${restricted ? 'bg-primary-50/30 border-primary/20' : 'bg-surface-low border-border'}`}>
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-label-md font-medium text-ink-primary">Uploading {file?.name}…</p>
          </div>
          <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-label-sm text-ink-muted mt-1.5 text-right">{progress}%</p>
        </div>
      ) : (
        /* Drop zone */
        <div
          className={`w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${restricted
              ? 'border-primary/30 bg-primary-50/30 hover:border-primary/60 hover:bg-primary-50/60'
              : 'border-border hover:border-primary/50 hover:bg-primary-50/20'
            }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input ref={inputRef} type="file" accept={accept || '.pdf'} className="hidden"
            onChange={e => e.target.files[0] && onFileSelect(e.target.files[0])} />
          {restricted
            ? <Lock className="w-8 h-8 text-primary/40 mx-auto mb-2" />
            : <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
          }
          <p className="font-medium text-ink-primary text-sm">
            Drop PDF here or <span className="text-primary">Browse Files</span>
          </p>
          <p className="text-label-sm text-ink-muted mt-1.5">{hint}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DeployAssignmentPage() {
  const toast = useToast();
  
  // Dual View State: 'list' or 'deploy'
  const [view, setView] = useState('list');

  // List View State
  const [assignments, setAssignments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);

  const loadAssignments = useCallback(async () => {
    try {
      setLoadingList(true);
      const data = await getAssignments();
      setAssignments(data);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load assignments' });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    if (view === 'list') {
      loadAssignments();
    }
  }, [view, loadAssignments]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteAssignment(deleteModal.id);
      setAssignments(prev => prev.filter(a => a.id !== deleteModal.id));
      toast({ type: 'success', title: 'Assignment deleted' });
      setDeleteModal(null);
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Failed to delete assignment' });
    }
  };

  // Form state
  const [form, setForm] = useState({
    title: '', subject_id: '', deadline: '', time: '23:59',
    instructions: '', total_questions: 10, grading_mode: 'ai_teacher',
    max_marks: 100,
  });

  const ALL_FORMATS = [
    { label: 'PDF',   value: '.pdf' },
    { label: 'DOCX',  value: '.docx' },
    { label: 'DOC',   value: '.doc' },
    { label: 'PNG',   value: '.png' },
    { label: 'JPG',   value: '.jpg' },
    { label: 'JPEG',  value: '.jpeg' },
  ];
  const [allowedFormats, setAllowedFormats] = useState(['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg']);
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [errors, setErrors] = useState({});

  // Subjects for dropdown
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {});
  }, []);

  // PDF state — Question PDF (student-visible)
  const [qFile, setQFile]           = useState(null);
  const [qUploading, setQUploading] = useState(false);
  const [qProgress, setQProgress]   = useState(0);
  const [qUrl, setQUrl]             = useState('');

  // PDF state — Answer Key PDF (AI-only, restricted)
  const [aFile, setAFile]           = useState(null);
  const [aUploading, setAUploading] = useState(false);
  const [aProgress, setAProgress]   = useState(0);
  const [aUrl, setAUrl]             = useState('');

  // AI Config
  const [aiGrading, setAiGrading] = useState(true);
  const [vivaReq, setVivaReq]     = useState(false);
  const [plagCheck, setPlagCheck] = useState(true);
  const [strictness, setStrictness] = useState(50);

  const [deploying, setDeploying] = useState(false);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: '' }));
  };

  // ── Upload a PDF to Supabase Storage ───────────────────────────────────────
  const handleUpload = useCallback(async (file, bucket, setUploading, setProgress, setUrl) => {
    setUploading(true);
    setProgress(0);
    try {
      const { signedUrl, path } = await getUploadUrl({
        bucket,
        filename: `${Date.now()}_${file.name}`,
        contentType: file.type || 'application/pdf',
      });
      await uploadFileToStorage(signedUrl, file, setProgress);
      setUrl(path);
      toast({ type: 'success', title: 'PDF uploaded successfully!' });
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }, [toast]);

  // ── Deploy Assignment ──────────────────────────────────────────────────────
  const handleDeploy = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim())    errs.title    = 'Title is required';
    if (!form.subject_id)      errs.subject_id = 'Subject is required';
    if (!form.deadline)        errs.deadline = 'Deadline is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return toast({ type: 'warning', title: 'Fix required fields' });
    }

    setDeploying(true);
    try {
      const deadline = new Date(`${form.deadline}T${form.time || '23:59'}`).toISOString();
      await createAssignment({
        title:              form.title,
        instructions:       form.instructions,
        deadline,
        total_questions:    Number(form.total_questions),
        subject_id:         form.subject_id,
        question_pdf_url:   qUrl || null,
        answer_key_pdf_url: aUrl || null,
        grading_mode:       form.grading_mode,
        ai_strictness:      strictness,
        require_viva:       vivaReq,
        plagiarism_check:   plagCheck,
        max_marks:          Number(form.max_marks) || 100,
        allowed_formats:    allowedFormats,
        allow_resubmission: allowResubmission,
      });
      toast({ type: 'success', title: 'Assignment Deployed!', message: `"${form.title}" is now live for students.` });
      // Reset
      setForm({ title: '', subject_id: '', deadline: '', time: '23:59', instructions: '', total_questions: 10, grading_mode: 'ai_teacher', max_marks: 100 });
      setAllowedFormats(['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg']);
      setAllowResubmission(true);
      setQFile(null); setQUrl(''); setAFile(null); setAUrl('');
      // Return to list view
      setView('list');
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Deploy failed' });
    } finally {
      setDeploying(false);
    }
  };

  const listColumns = [
    { key: 'title', label: 'Assignment', sortable: true, render: (v, row) => (
      <div>
        <p className="font-semibold text-ink-primary">{v}</p>
        <p className="text-label-sm text-ink-muted">{row.subjects?.name || 'Unknown Subject'}</p>
      </div>
    )},
    { key: 'deadline', label: 'Deadline', width: '180px', sortable: true, render: v => (
      <span className={new Date(v) < new Date() ? 'text-danger font-medium' : 'text-ink-secondary'}>
        {new Date(v).toLocaleDateString()} {new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    )},
    { key: 'max_marks', label: 'Marks', width: '80px', render: v => <span className="font-semibold">{v}</span> },
    { key: 'actions', label: 'Actions', width: '90px', render: (_, row) => (
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" onClick={() => setDeleteModal(row)} title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  ];

  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Assignments"
          subtitle="Manage and track your active assignments"
          actions={
            <button className="btn-primary btn-sm flex items-center gap-2" onClick={() => setView('deploy')}>
              <Plus className="w-4 h-4" /> New Assignment
            </button>
          }
        />
        <main className="p-4 md:p-6 flex-1">
          {loadingList ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : assignments.length === 0 ? (
            <div className="card text-center p-12">
              <FileText className="w-12 h-12 text-ink-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-ink-primary mb-2">No assignments yet</h3>
              <p className="text-ink-secondary mb-6 max-w-md mx-auto">You haven't created any assignments yet. Deploy your first assignment to get started.</p>
              <button className="btn-primary" onClick={() => setView('deploy')}>Create Assignment</button>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <DataTable columns={listColumns} data={assignments} />
            </div>
          )}
        </main>

        <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Assignment">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4 p-4 bg-danger/10 text-danger rounded-xl border border-danger/20">
              <Trash2 className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Delete "{deleteModal?.title}"?</p>
                <p className="text-sm opacity-90">This action cannot be undone. All associated submissions, grades, and AI reports will be permanently deleted.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="btn-primary bg-danger border-danger hover:bg-danger-hover" onClick={handleDelete}>Delete Assignment</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <form onSubmit={handleDeploy} className="flex flex-col min-h-screen">
      <TopBar
        title="Deploy Assignment"
        subtitle="Create and publish a new assignment with PDF question papers"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('list')}>Back to List</button>
            <button type="submit" className="btn-primary btn-sm flex items-center gap-2" disabled={deploying}>
              {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Deploy Assignment</span>
            </button>
          </div>
        }
      />

      <main className="p-4 md:p-6 pb-24">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* ── Section 1: Details ─────────────────────────────────────── */}
          <div className="card flex flex-col gap-5">
            <SectionLabel>Assignment Details</SectionLabel>

            <div>
              <label className="label">Title <span className="text-danger">*</span></label>
              <input
                className={`input ${errors.title ? 'border-danger' : ''}`}
                placeholder="e.g. Unit 2 — Data Structures Mid-term"
                value={form.title} onChange={set('title')}
              />
              {errors.title && <p className="text-label-sm text-danger mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Subject <span className="text-danger">*</span></label>
                <select className={`input ${errors.subject_id ? 'border-danger' : ''}`} value={form.subject_id} onChange={set('subject_id')}>
                  <option value="">Select subject…</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
                {errors.subject_id && <p className="text-label-sm text-danger mt-1">{errors.subject_id}</p>}
              </div>
              <div>
                <label className="label">Total Questions</label>
                <input type="number" min={1} max={200} className="input"
                  value={form.total_questions} onChange={set('total_questions')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Deadline Date <span className="text-danger">*</span></label>
                <input type="date" className={`input ${errors.deadline ? 'border-danger' : ''}`}
                  value={form.deadline} onChange={set('deadline')} />
                {errors.deadline && <p className="text-label-sm text-danger mt-1">{errors.deadline}</p>}
              </div>
              <div>
                <label className="label">Deadline Time</label>
                <input type="time" className="input" value={form.time} onChange={set('time')} />
              </div>
            </div>

            <div>
              <label className="label">Instructions</label>
              <textarea className="input resize-none" rows={4}
                placeholder="Write detailed instructions for students…"
                value={form.instructions} onChange={set('instructions')} />
            </div>

            <div>
              <label className="label">Grading Mode</label>
              <select className="input" value={form.grading_mode} onChange={set('grading_mode')}>
                <option value="ai_teacher">AI + Teacher Review</option>
                <option value="ai_only">AI Only</option>
                <option value="teacher_only">Teacher Only</option>
              </select>
            </div>
          </div>

          {/* ── Section 2: Submission Settings ─────────────────────────── */}
          <div className="card flex flex-col gap-5">
            <SectionLabel>Submission Settings</SectionLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Total Marks</label>
                <input
                  type="number" min={1} max={1000} className="input"
                  value={form.max_marks}
                  onChange={set('max_marks')}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <label htmlFor="allow-resub" className="flex items-center gap-2 text-label-md text-ink-primary cursor-pointer">
                  <BookOpen className="w-4 h-4 text-primary" /> Allow Resubmission Before Deadline
                </label>
                <ToggleSwitch
                  checked={allowResubmission}
                  onChange={setAllowResubmission}
                  id="allow-resub"
                  ariaLabel="Allow resubmission"
                />
              </div>
            </div>

            <div>
              <label className="label">Accepted File Formats</label>
              <div className="flex flex-wrap gap-3 mt-1">
                {ALL_FORMATS.map(fmt => {
                  const checked = allowedFormats.includes(fmt.value);
                  return (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => setAllowedFormats(prev =>
                        checked ? prev.filter(f => f !== fmt.value) : [...prev, fmt.value]
                      )}
                      className={`px-4 py-1.5 rounded-full text-label-sm font-semibold border transition-all ${
                        checked
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-surface border-border text-ink-secondary hover:border-primary/50'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-label-sm text-ink-muted mt-2">
                Students can only upload files matching the selected formats.
              </p>
            </div>
          </div>

          {/* ── Section 2: PDF Uploads ─────────────────────────────────── */}
          <div className="card flex flex-col gap-6">
            <SectionLabel>PDF Attachments</SectionLabel>

            {/* Question Paper PDF — Student-visible */}
            <PdfUploadBox
              label="Question Paper PDF"
              hint="Visible to students after deployment · PDF only · Max 20MB"
              file={qFile}
              uploading={qUploading}
              progress={qProgress}
              uploaded={!!qUrl}
              uploadedUrl={qUrl}
              restricted={false}
              onFileSelect={(f) => {
                setQFile(f);
                handleUpload(f, 'question-papers', setQUploading, setQProgress, setQUrl);
              }}
              onClear={() => { setQFile(null); setQUrl(''); }}
            />

            {/* Answer Key PDF — AI-Only, restricted */}
            <PdfUploadBox
              label="Answer Key PDF"
              badge="AI-Only · Hidden from Students"
              badgeColor="text-primary-700 bg-primary-50 border-primary-200"
              hint="Used only by the AI grading engine · Never shown to students · PDF only"
              file={aFile}
              uploading={aUploading}
              progress={aProgress}
              uploaded={!!aUrl}
              uploadedUrl={aUrl}
              restricted={true}
              onFileSelect={(f) => {
                setAFile(f);
                handleUpload(f, 'answer-keys', setAUploading, setAProgress, setAUrl);
              }}
              onClear={() => { setAFile(null); setAUrl(''); }}
            />

            {/* Info callout */}
            <div className="flex items-start gap-3 p-4 bg-surface-low border border-border rounded-xl">
              <Info className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
              <p className="text-label-sm text-ink-secondary">
                PDFs are uploaded directly to Supabase Storage. The Answer Key is stored in a <strong>private bucket</strong> — only the AI grading engine can access it using a service-role key. Students will never see the URL.
              </p>
            </div>
          </div>

          {/* ── Section 3: AI Config ───────────────────────────────────── */}
          <div className="card flex flex-col gap-4">
            <SectionLabel>AI Grading Configuration</SectionLabel>

            {[
              { icon: Bot,    label: 'Enable AI Auto-Grading',  val: aiGrading, set: setAiGrading, id: 'ai-grading' },
              { icon: Video,  label: 'Require Viva Examination', val: vivaReq,   set: setVivaReq,   id: 'viva-req'  },
              { icon: Shield, label: 'Plagiarism Detection',     val: plagCheck,  set: setPlagCheck,  id: 'plag'      },
            ].map(({ icon: Icon, label, val, set: setVal, id }) => (
              <div key={id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <label htmlFor={id} className="flex items-center gap-2.5 text-label-md text-ink-primary cursor-pointer">
                  <Icon className="w-4 h-4 text-primary" /> {label}
                </label>
                <ToggleSwitch checked={val} onChange={setVal} id={id} ariaLabel={label} />
              </div>
            ))}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">AI Strictness Level</label>
                <span className="text-label-sm text-primary font-semibold">{strictness}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-label-sm text-ink-muted w-14">Lenient</span>
                <input type="range" min={0} max={100} value={strictness}
                  onChange={e => setStrictness(Number(e.target.value))}
                  className="flex-1 accent-primary" />
                <span className="text-label-sm text-ink-muted w-10">Strict</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 md:left-60 right-0 bg-white border-t border-border px-4 md:px-6 py-3
                      flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] z-20">
        <div className="flex items-center gap-2 text-label-sm text-ink-muted">
          {qUrl && <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-4 h-4" /> Q-Paper</span>}
          {aUrl && <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-4 h-4" /> Answer Key</span>}
          {(qUploading || aUploading) && <span className="flex items-center gap-1 text-primary"><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</span>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('list')}>Cancel</button>
          <button type="button" className="btn btn-secondary btn-sm flex items-center gap-2"
            onClick={() => toast({ type: 'info', title: 'Saved as draft.' })}>
            <Save className="w-4 h-4" /> <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button type="submit" className="btn-primary btn-sm flex items-center gap-2" disabled={deploying || qUploading || aUploading}>
            {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Deploy Assignment</span>
          </button>
        </div>
      </div>
    </form>
  );
}
