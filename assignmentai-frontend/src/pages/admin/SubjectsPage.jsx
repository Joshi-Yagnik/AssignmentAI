import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import { BookOpen, Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  getSubjects, createSubject, updateSubject, deleteSubject,
  getDepartments
} from '../../services/adminService';

const EMPTY_FORM = { department_id: '', name: '', code: '', credits: 3, description: '' };

export default function SubjectsPage() {
  const toast = useToast();
  const [subjects, setSubjects]       = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [subs, deps] = await Promise.all([getSubjects(), getDepartments()]);
      setSubjects(subs);
      setDepartments(deps);
    } catch {
      toast({ type: 'error', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, department_id: departments[0]?.id || '' });
    setSelected(null); setModal('create');
  };
  const openEdit = (sub) => {
    setForm({ department_id: sub.department_id, name: sub.name, code: sub.code, credits: sub.credits, description: sub.description || '' });
    setSelected(sub); setModal('edit');
  };
  const openDelete = (sub) => { setSelected(sub); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.department_id) {
      return toast({ type: 'warning', title: 'Name, Code, and Department are required' });
    }
    setSaving(true);
    try {
      if (modal === 'create') {
        const created = await createSubject(form);
        setSubjects(prev => [created, ...prev]);
        toast({ type: 'success', title: 'Subject created!' });
      } else {
        const updated = await updateSubject(selected.id, form);
        setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s));
        toast({ type: 'success', title: 'Subject updated!' });
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
      await deleteSubject(selected.id);
      setSubjects(prev => prev.filter(s => s.id !== selected.id));
      toast({ type: 'success', title: 'Subject deleted' });
      closeModal();
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Delete failed' });
    } finally {
      setSaving(false);
    }
  };

  const CREDIT_COLOR = { 1: 'bg-info/10 text-info', 2: 'bg-info/10 text-info', 3: 'bg-primary-50 text-primary', 4: 'bg-warning/10 text-warning', 5: 'bg-danger/10 text-danger' };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.departments?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Subjects"
        subtitle="Manage courses and subjects offered by departments"
        actions={
          <button className="btn-primary btn-sm flex items-center gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Subject
          </button>
        }
      />

      <main className="p-6 flex flex-col gap-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            className="input pl-9"
            placeholder="Search subjects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-low border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Subject</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Code</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Credits</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden md:table-cell">Department</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden lg:table-cell">Institute</th>
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
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-ink-muted/40" />
                    <p>No subjects found.</p>
                  </td>
                </tr>
              ) : filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-surface-low/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-primary">{sub.name}</p>
                        {sub.description && <p className="text-label-sm text-ink-muted truncate max-w-[200px]">{sub.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-surface-high px-2 py-1 rounded font-semibold text-ink-secondary">{sub.code}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-label-sm font-semibold px-2.5 py-0.5 rounded-full ${CREDIT_COLOR[sub.credits] || 'bg-surface-high text-ink-muted'}`}>
                      {sub.credits} cr
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-label-sm text-ink-secondary">{sub.departments?.name || '—'}</span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-label-sm text-ink-muted">{sub.departments?.institutes?.name || '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(sub)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" onClick={() => openDelete(sub)} title="Delete">
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

      {/* Create / Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'New Subject' : 'Edit Subject'}
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
            <label className="label">Department <span className="text-danger">*</span></label>
            <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">Select a department…</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} — {d.institutes?.name || ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Subject Name <span className="text-danger">*</span></label>
              <input className="input" placeholder="e.g. Artificial Intelligence" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Code <span className="text-danger">*</span></label>
              <input className="input font-mono" placeholder="e.g. CS701" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div>
            <label className="label">Credits</label>
            <input type="number" min={1} max={6} className="input w-24" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Brief description of the subject…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={modal === 'delete'}
        onClose={closeModal}
        title="Delete Subject"
        size="sm"
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
          Delete subject <strong className="text-ink-primary">{selected?.name} ({selected?.code})</strong>? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
