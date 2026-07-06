import { useState } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { Upload, Lock, Info, Bot, Video, Shield, Save, Send } from 'lucide-react';

function ToggleSwitch({ checked, onChange, id, ariaLabel }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      id={id}
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

export default function DeployAssignmentPage() {
  const toast = useToast();
  const [aiGrading, setAiGrading]     = useState(true);
  const [vivaReq,   setVivaReq]       = useState(false);
  const [plagCheck, setPlagCheck]     = useState(true);
  const [strictness, setStrictness]   = useState(50);
  const [assignTo, setAssignTo]       = useState('class');
  const [loading, setLoading]         = useState(false);
  
  const [form, setForm] = useState({
    title: '', course: 'CS301', deadline: '', time: '23:59',
    instructions: '', maxMarks: 100, gradingMode: 'AI + Teacher Review',
  });

  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const handleDeploy = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.deadline) newErrors.deadline = 'Deadline is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({ type: 'warning', title: 'Missing fields', message: 'Please complete all required fields.' });
      return;
    }

    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      toast({ type: 'success', title: 'Assignment Deployed!', message: `"${form.title}" is now live for students.` });
    }, 1500);
  };

  return (
    <form onSubmit={handleDeploy}>
      <TopBar
        title="Deploy Assignment"
        subtitle="Create and publish a new assignment for your class"
        breadcrumb={['Assignments', 'Deploy New Assignment']}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => toast({ type: 'info', title: 'Cancelled.' })}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Deploy Assignment</span>
            </button>
          </div>
        }
      />

      <main className="p-4 md:p-6 pb-24">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* Section 1: Assignment Details */}
          <div className="card flex flex-col gap-5">
            <SectionLabel>Assignment Details</SectionLabel>

            <div>
              <label htmlFor="title" className="label">Assignment Title <span className="text-danger">*</span></label>
              <input 
                id="title"
                className={`input ${errors.title ? 'border-danger focus:border-danger ring-danger/20' : ''}`} 
                value={form.title} onChange={set('title')} 
                placeholder="e.g. Machine Learning Midterm Report" 
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-label-sm text-danger mt-1.5">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="course" className="label">Course</label>
                <select id="course" className="input" value={form.course} onChange={set('course')}>
                  <option value="CS301">CS301 — Machine Learning</option>
                  <option value="CS201">CS201 — Data Structures</option>
                  <option value="CS401">CS401 — Databases</option>
                  <option value="CS501">CS501 — Web Development</option>
                </select>
              </div>
              <div>
                <label htmlFor="gradingMode" className="label">Grading Mode</label>
                <select id="gradingMode" className="input" value={form.gradingMode} onChange={set('gradingMode')}>
                  <option>AI + Teacher Review</option>
                  <option>AI Only</option>
                  <option>Teacher Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="deadline" className="label">Deadline Date <span className="text-danger">*</span></label>
                <div className="relative">
                  <input 
                    id="deadline"
                    type="date" 
                    className={`input ${errors.deadline ? 'border-danger focus:border-danger ring-danger/20' : ''}`} 
                    value={form.deadline} onChange={set('deadline')} 
                    aria-invalid={!!errors.deadline}
                  />
                  {errors.deadline && <p className="text-label-sm text-danger mt-1.5">{errors.deadline}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="time" className="label">Deadline Time</label>
                <input id="time" type="time" className="input" value={form.time} onChange={set('time')} />
              </div>
            </div>

            <div>
              <label htmlFor="instructions" className="label">Instructions / Description</label>
              <textarea 
                id="instructions"
                className="input resize-none" rows={5} value={form.instructions} onChange={set('instructions')}
                placeholder="Write detailed instructions for students…" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxMarks" className="label">Max Marks</label>
                <input id="maxMarks" type="number" className="input" value={form.maxMarks} onChange={set('maxMarks')} min={1} max={200} />
              </div>
            </div>
          </div>

          {/* Section 2: Upload Boxes */}
          <div className="card flex flex-col gap-5">
            <SectionLabel>Submission Settings</SectionLabel>

            {/* Box 1 — Student template */}
            <div>
              <label className="label">Student Submission Template</label>
              <button type="button" className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center
                             hover:border-primary/50 hover:bg-primary-50/50 transition-all focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" aria-hidden="true" />
                <p className="font-medium text-ink-primary text-sm">Drop file here or <span className="text-primary">Browse Files</span></p>
                <p className="text-label-sm text-ink-muted mt-1.5">Accepted: PDF, DOCX, ZIP · Visible to students</p>
              </button>
            </div>

            {/* Box 2 — AI-only (restricted) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">AI Reference Material</label>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary-700" aria-hidden="true" />
                  <span className="text-label-sm font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200">
                    AI-Only
                  </span>
                  <button type="button" className="ml-1 text-ink-muted hover:text-ink-primary focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full" title="This file is never shown to students" aria-label="Information about AI Reference Material">
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button type="button" className="w-full border-2 border-dashed border-primary/30 bg-primary-50/40 rounded-xl p-8 text-center
                             hover:border-primary/60 hover:bg-primary-50/80 transition-all focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
                <Lock className="w-8 h-8 text-primary-400 mx-auto mb-2" aria-hidden="true" />
                <p className="font-medium text-ink-primary text-sm">
                  Drop AI reference file or <span className="text-primary">Browse Files (Restricted)</span>
                </p>
                <p className="text-label-sm text-ink-muted mt-1.5">
                  Hidden from students — used only by the AI grading engine for context & answer key
                </p>
                <p className="text-label-sm text-ink-muted mt-1">Accepted: PDF, DOCX</p>
              </button>
            </div>
          </div>

          {/* Section 3: Target */}
          <div className="card flex flex-col gap-4">
            <SectionLabel>Target Students</SectionLabel>
            <div className="flex items-center gap-2" role="group" aria-label="Select target students">
              {['class', 'select'].map(v => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setAssignTo(v)}
                  className={`btn btn-sm ${assignTo === v ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={assignTo === v}
                >
                  {v === 'class' ? 'Entire Class' : 'Select Students'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-label-sm px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 font-medium border border-primary-100">
                CS301 — 32 students enrolled
              </span>
            </div>
          </div>

          {/* Section 4: AI Config */}
          <div className="card flex flex-col gap-4">
            <SectionLabel>AI Grading Configuration</SectionLabel>

            {[
              { icon: Bot,    label: 'Enable AI Auto-Grading', val: aiGrading, set: setAiGrading, id: 'ai-grading' },
              { icon: Video,  label: 'Require Viva Examination', val: vivaReq,  set: setVivaReq,   id: 'viva-req'  },
              { icon: Shield, label: 'Plagiarism Detection',    val: plagCheck, set: setPlagCheck,  id: 'plag'      },
            ].map(({ icon: Icon, label, val, set: setVal, id }) => (
              <div key={id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <label htmlFor={id} className="flex items-center gap-2.5 text-label-md text-ink-primary cursor-pointer">
                  <Icon className="w-4 h-4 text-primary" aria-hidden="true" />{label}
                </label>
                <ToggleSwitch checked={val} onChange={setVal} id={id} ariaLabel={label} />
              </div>
            ))}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="strictness" className="label mb-0">AI Strictness Level</label>
                <span className="text-label-sm text-primary font-semibold">{strictness}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-label-sm text-ink-muted w-14">Lenient</span>
                <input
                  id="strictness"
                  type="range" min={0} max={100}
                  value={strictness}
                  onChange={e => setStrictness(Number(e.target.value))}
                  className="flex-1 accent-primary focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                  aria-label="AI Strictness Level"
                />
                <span className="text-label-sm text-ink-muted w-10">Strict</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 md:left-60 right-0 bg-white border-t border-border px-4 md:px-6 py-3
                      flex items-center justify-end gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] z-20">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => toast({ type: 'info', title: 'Cancelled.' })}>
          Cancel
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toast({ type: 'info', title: 'Saved as draft.' })}>
          <Save className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">Save as Draft</span>
        </button>
        <button type="submit" className="btn-primary btn-sm" disabled={loading}>
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" aria-hidden="true" />}
          <span className="hidden sm:inline">Deploy Assignment</span>
        </button>
      </div>
    </form>
  );
}
