import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import { GraduationCap, Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getInstitutes
} from '../../services/adminService';

const EMPTY_FORM = { institute_id: '', name: '', code: '' };

export default function DepartmentsPage() {
  const toast = useToast();
  const [departments, setDepartments] = useState([]);
  const [institutes, setInstitutes]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [deps, insts] = await Promise.all([getDepartments(), getInstitutes()]);
      setDepartments(deps);
      setInstitutes(insts);
    } catch {
      toast({ type: 'error', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, institute_id: institutes[0]?.id || '' });
    setSelected(null); setModal('create');
  };
  const openEdit = (dep) => {
    setForm({ institute_id: dep.institute_id, name: dep.name, code: dep.code });
    setSelected(dep); setModal('edit');
  };
  const openDelete = (dep) => { setSelected(dep); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.institute_id) {
      return toast({ type: 'warning', title: 'All fields are required' });
    }
    setSaving(true);
    try {
      if (modal === 'create') {
        const created = await createDepartment(form);
        setDepartments(prev => [created, ...prev]);
        toast({ type: 'success', title: 'Department created!' });
      } else {
        const updated = await updateDepartment(selected.id, form);
        setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
        toast({ type: 'success', title: 'Department updated!' });
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
      await deleteDepartment(selected.id);
      setDepartments(prev => prev.filter(d => d.id !== selected.id));
      toast({ type: 'success', title: 'Department deleted' });
      closeModal();
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Delete failed' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    d.institutes?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Departments"
        subtitle="Manage academic departments across institutes"
        actions={
          <button className="btn-primary btn-sm flex items-center gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Department
          </button>
        }
      />

      <main className="p-6 flex flex-col gap-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            className="input pl-9"
            placeholder="Search departments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-low border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Department</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Code</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden md:table-cell">Institute</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-high rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-ink-muted">
                    <GraduationCap className="w-10 h-10 mx-auto mb-3 text-ink-muted/40" />
                    <p>No departments found.</p>
                  </td>
                </tr>
              ) : filtered.map(dep => (
                <tr key={dep.id} className="hover:bg-surface-low/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 text-warning" />
                      </div>
                      <span className="font-semibold text-ink-primary">{dep.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-surface-high px-2 py-1 rounded font-semibold text-ink-secondary">{dep.code}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-label-sm text-ink-secondary">{dep.institutes?.name || '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dep)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" onClick={() => openDelete(dep)} title="Delete">
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
        title={modal === 'create' ? 'New Department' : 'Edit Department'}
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
            <label className="label">Institute <span className="text-danger">*</span></label>
            <select className="input" value={form.institute_id} onChange={e => setForm(f => ({ ...f, institute_id: e.target.value }))}>
              <option value="">Select an institute…</option>
              {institutes.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Department Name <span className="text-danger">*</span></label>
            <input className="input" placeholder="e.g. Computer Science" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Code <span className="text-danger">*</span></label>
            <input className="input font-mono" placeholder="e.g. CS" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={modal === 'delete'}
        onClose={closeModal}
        title="Delete Department"
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
          Delete <strong className="text-ink-primary">{selected?.name}</strong>? All subjects under this department will also be removed.
        </p>
      </Modal>
    </>
  );
}
