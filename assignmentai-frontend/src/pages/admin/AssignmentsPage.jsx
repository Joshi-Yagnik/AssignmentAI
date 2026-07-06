import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import {
  ClipboardList, Plus, Pencil, Trash2, Search,
  Calendar, FileText, ExternalLink, BookOpen
} from 'lucide-react';
import {
  getAssignments, createAssignment, updateAssignment, deleteAssignment
} from '../../services/assignmentService';
import { getSubjects } from '../../services/adminService';

const EMPTY_FORM = {
  title: '',
  instructions: '',
  deadline: '',
  total_questions: 10,
  question_pdf_url: '',
  answer_key_pdf_url: '',
  subject_id: '',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AssignmentsPage() {
  const toast = useToast();
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [asgns, subs] = await Promise.all([getAssignments(), getSubjects()]);
      setAssignments(asgns);
      setSubjects(subs);
    } catch {
      toast({ type: 'error', title: 'Failed to load assignments' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, subject_id: subjects[0]?.id || '' });
    setSelected(null); setModal('create');
  };
  const openEdit = (a) => {
    setForm({
      title: a.title,
      instructions: a.instructions || '',
      deadline: a.deadline ? a.deadline.slice(0, 16) : '',
      total_questions: a.total_questions || 10,
      question_pdf_url: a.question_pdf_url || '',
      answer_key_pdf_url: a.answer_key_pdf_url || '',
      subject_id: a.subject_id || '',
    });
    setSelected(a); setModal('edit');
  };
  const openDelete = (a) => { setSelected(a); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return toast({ type: 'warning', title: 'Title is required' });
    if (!form.subject_id)   return toast({ type: 'warning', title: 'Subject is required' });
    if (!form.deadline)     return toast({ type: 'warning', title: 'Deadline is required' });
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_questions: Number(form.total_questions),
        deadline: new Date(form.deadline).toISOString(),
      };
      if (modal === 'create') {
        const created = await createAssignment(payload);
        setAssignments(prev => [created, ...prev]);
        toast({ type: 'success', title: 'Assignment created!' });
      } else {
        const updated = await updateAssignment(selected.id, payload);
        setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
        toast({ type: 'success', title: 'Assignment updated!' });
      }
      closeModal();
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteAssignment(selected.id);
      setAssignments(prev => prev.filter(a => a.id !== selected.id));
      toast({ type: 'success', title: 'Assignment deleted' });
      closeModal();
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Delete failed' });
    } finally {
      setSaving(false);
    }
  };

  const isOverdue = (deadline) => deadline && new Date(deadline) < new Date();

  const filtered = assignments.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.subjects?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Assignments"
        subtitle="Create and manage assignments with PDF question papers"
        actions={
          <button className="btn-primary btn-sm flex items-center gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        }
      />

      <main className="p-6 flex flex-col gap-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            className="input pl-9"
            placeholder="Search assignments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-low border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Title</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden md:table-cell">Subject</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Deadline</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden lg:table-cell">Questions</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden lg:table-cell">PDFs</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-high rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-ink-muted">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 text-ink-muted/40" />
                    <p>No assignments found.</p>
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-surface-low/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-primary">{a.title}</p>
                        {a.instructions && (
                          <p className="text-label-sm text-ink-muted truncate max-w-[200px]">{a.instructions}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="text-label-sm text-ink-secondary">{a.subjects?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className={`w-3.5 h-3.5 ${isOverdue(a.deadline) ? 'text-danger' : 'text-ink-muted'}`} />
                      <span className={`text-label-sm font-medium ${isOverdue(a.deadline) ? 'text-danger' : 'text-ink-secondary'}`}>
                        {formatDate(a.deadline)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-label-sm font-semibold px-2.5 py-0.5 rounded-full bg-surface-high text-ink-secondary">
                      {a.total_questions ?? '—'} Qs
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {a.question_pdf_url && (
                        <a href={a.question_pdf_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-label-sm text-primary hover:underline">
                          <FileText className="w-3.5 h-3.5" /> Q
                        </a>
                      )}
                      {a.answer_key_pdf_url && (
                        <a href={a.answer_key_pdf_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-label-sm text-success hover:underline">
                          <FileText className="w-3.5 h-3.5" /> Ans
                        </a>
                      )}
                      {!a.question_pdf_url && !a.answer_key_pdf_url && (
                        <span className="text-ink-muted text-label-sm">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" onClick={() => openDelete(a)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── Create / Edit Modal ─────────────────────────────────────── */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'New Assignment' : 'Edit Assignment'}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Title <span className="text-danger">*</span></label>
            <input className="input" placeholder="e.g. Unit 1 – Data Structures" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Instructions</label>
            <textarea className="input resize-none" rows={3} placeholder="Write assignment instructions here…"
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Subject <span className="text-danger">*</span></label>
              <select className="input" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
                <option value="">Select a subject…</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Total Questions</label>
              <input type="number" min={1} max={200} className="input" value={form.total_questions}
                onChange={e => setForm(f => ({ ...f, total_questions: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Deadline <span className="text-danger">*</span></label>
            <input type="datetime-local" className="input" value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div>
            <label className="label">Question Paper PDF URL</label>
            <div className="relative">
              <input className="input pr-10" placeholder="https://…/question-paper.pdf" value={form.question_pdf_url}
                onChange={e => setForm(f => ({ ...f, question_pdf_url: e.target.value }))} />
              {form.question_pdf_url && (
                <a href={form.question_pdf_url} target="_blank" rel="noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-primary">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
          <div>
            <label className="label">Answer Key PDF URL</label>
            <div className="relative">
              <input className="input pr-10" placeholder="https://…/answer-key.pdf" value={form.answer_key_pdf_url}
                onChange={e => setForm(f => ({ ...f, answer_key_pdf_url: e.target.value }))} />
              {form.answer_key_pdf_url && (
                <a href={form.answer_key_pdf_url} target="_blank" rel="noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-primary">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────────────────── */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete Assignment" size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn bg-danger text-white hover:bg-danger/90" onClick={handleDelete} disabled={saving}>
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-ink-secondary text-label-md">
          Delete assignment <strong className="text-ink-primary">{selected?.title}</strong>? All student submissions will also be removed.
        </p>
      </Modal>
    </>
  );
}
