import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import { Building2, Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  getInstitutes, createInstitute, updateInstitute, deleteInstitute
} from '../../services/adminService';

const EMPTY_FORM = { name: '', code: '', address: '', logo_url: '' };

export default function InstitutesPage() {
  const toast = useToast();
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInstitutes();
      setInstitutes(data);
    } catch {
      toast({ type: 'error', title: 'Failed to load institutes' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setModal('create'); };
  const openEdit   = (inst) => { setForm({ name: inst.name, code: inst.code, address: inst.address || '', logo_url: inst.logo_url || '' }); setSelected(inst); setModal('edit'); };
  const openDelete = (inst) => { setSelected(inst); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      return toast({ type: 'warning', title: 'Name and Code are required' });
    }
    setSaving(true);
    try {
      if (modal === 'create') {
        const created = await createInstitute(form);
        setInstitutes(prev => [created, ...prev]);
        toast({ type: 'success', title: 'Institute created!' });
      } else {
        const updated = await updateInstitute(selected.id, form);
        setInstitutes(prev => prev.map(i => i.id === updated.id ? updated : i));
        toast({ type: 'success', title: 'Institute updated!' });
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
      await deleteInstitute(selected.id);
      setInstitutes(prev => prev.filter(i => i.id !== selected.id));
      toast({ type: 'success', title: 'Institute deleted' });
      closeModal();
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Delete failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (inst) => {
    try {
      const updated = await updateInstitute(inst.id, { ...inst, is_active: !inst.is_active });
      setInstitutes(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch {
      toast({ type: 'error', title: 'Failed to update status' });
    }
  };

  const filtered = institutes.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Institutes"
        subtitle="Manage all registered institutions"
        actions={
          <button className="btn-primary btn-sm flex items-center gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Institute
          </button>
        }
      />

      <main className="p-6 flex flex-col gap-6">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            className="input pl-9"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-low border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Name</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Code</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden md:table-cell">Address</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Status</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-high rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-ink-muted">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-ink-muted/40" />
                    <p>No institutes found.</p>
                  </td>
                </tr>
              ) : filtered.map(inst => (
                <tr key={inst.id} className="hover:bg-surface-low/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold text-ink-primary">{inst.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-surface-high px-2 py-1 rounded font-semibold text-ink-secondary">{inst.code}</span>
                  </td>
                  <td className="px-5 py-4 text-ink-secondary hidden md:table-cell">{inst.address || '—'}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleToggleActive(inst)} className="flex items-center gap-1.5 text-label-sm font-semibold">
                      {inst.is_active
                        ? <><ToggleRight className="w-5 h-5 text-success" /><span className="text-success">Active</span></>
                        : <><ToggleLeft className="w-5 h-5 text-ink-muted" /><span className="text-ink-muted">Inactive</span></>
                      }
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(inst)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
                        onClick={() => openDelete(inst)}
                        title="Delete"
                      >
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
        title={modal === 'create' ? 'New Institute' : 'Edit Institute'}
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
            <label className="label">Name <span className="text-danger">*</span></label>
            <input className="input" placeholder="e.g. Mumbai University" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Code <span className="text-danger">*</span></label>
            <input className="input font-mono" placeholder="e.g. MU-2025" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" placeholder="e.g. Fort, Mumbai 400001" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input className="input" placeholder="https://…" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={modal === 'delete'}
        onClose={closeModal}
        title="Delete Institute"
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
          Are you sure you want to delete <strong className="text-ink-primary">{selected?.name}</strong>?
          This will cascade and delete all departments under it.
        </p>
      </Modal>
    </>
  );
}
