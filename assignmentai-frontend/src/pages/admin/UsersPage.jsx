import { useState, useEffect, useCallback, useRef } from 'react';
import TopBar from '../../components/shared/TopBar';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import {
  Users, Plus, Pencil, Trash2, Search, Upload,
  Download, X, AlertCircle, CheckCircle2, FileText
} from 'lucide-react';
import {
  getUsers, createUser, updateUser, deleteUser, bulkUploadUsers,
  getDepartments
} from '../../services/adminService';
import * as xlsx from 'xlsx';

const ROLE_COLORS = {
  teacher: 'bg-primary-50 text-primary',
  student: 'bg-success/10 text-success',
  admin:   'bg-danger/10 text-danger',
};

const EMPTY_FORM = {
  name: '', email: '', role: 'student', department_id: '', password: ''
};

const CSV_TEMPLATE_STUDENT =
  'name,email,password,department_code\nJane Smith,jane@example.com,Pass@123,CSE';
const CSV_TEMPLATE_TEACHER =
  'name,email,password,department_code\nJohn Doe,john@example.com,Pass@123,IT';

export default function UsersPage() {
  const toast = useToast();
  const fileRef = useRef(null);

  const [users, setUsers]             = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  // CSV Upload state
  const [uploadRole, setUploadRole]     = useState('student');
  const [csvRows, setCsvRows]           = useState([]);
  const [csvErrors, setCsvErrors]       = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading]       = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, depsData] = await Promise.all([getUsers(), getDepartments()]);
      setUsers(usersData);
      setDepartments(depsData);
    } catch {
      toast({ type: 'error', title: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setModal('create'); };
  const openEdit   = (u) => {
    setForm({ name: u.name, email: u.email, role: u.role, department_id: u.department_id || '', password: '' });
    setSelected(u); setModal('edit');
  };
  const openDelete = (u) => { setSelected(u); setModal('delete'); };
  const openUpload = () => {
    setCsvRows([]); setCsvErrors([]); setUploadResult(null);
    setUploadRole('student'); setModal('upload');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.role) {
      return toast({ type: 'warning', title: 'Name, Email, and Role are required' });
    }
    if (modal === 'create' && !form.password.trim()) {
      return toast({ type: 'warning', title: 'Password is required for new users' });
    }
    setSaving(true);
    try {
      if (modal === 'create') {
        const created = await createUser(form);
        setUsers(prev => [created, ...prev]);
        toast({ type: 'success', title: 'User created!' });
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        const updated = await updateUser(selected.id, payload);
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        toast({ type: 'success', title: 'User updated!' });
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
      await deleteUser(selected.id);
      setUsers(prev => prev.filter(u => u.id !== selected.id));
      toast({ type: 'success', title: 'User deleted' });
      closeModal();
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Delete failed' });
    } finally {
      setSaving(false);
    }
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      let rows = [];
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = xlsx.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = xlsx.utils.sheet_to_json(firstSheet);
      } catch (err) {
        toast({ type: 'error', title: 'Failed to parse file. Make sure it is a valid Excel or CSV file.' });
        return;
      }
      
      const errs = [];
      rows.forEach((row, i) => {
        // Validate required fields (using either our old format or the new Excel template format)
        const email = row.email || row.Email;
        const name = row.name || row.Name || row.firstName || row.first_name || row['First Name'];
        if (!name) errs.push(`Row ${i + 2}: missing name or firstName`);
        if (!email) errs.push(`Row ${i + 2}: missing email`);
      });
      setCsvRows(rows);
      setCsvErrors(errs);
      setUploadResult(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleBulkUpload = async () => {
    if (csvRows.length === 0) return toast({ type: 'warning', title: 'No CSV rows to upload' });
    if (csvErrors.length > 0) return toast({ type: 'warning', title: 'Fix CSV errors first' });
    setUploading(true);
    try {
      const result = await bulkUploadUsers({ role: uploadRole, users: csvRows });
      setUploadResult(result);
      if (result.success?.length > 0) {
        toast({ type: 'success', title: `${result.success.length} user(s) uploaded!` });
        load();
      }
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const content = uploadRole === 'teacher' ? CSV_TEMPLATE_TEACHER : CSV_TEMPLATE_STUDENT;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${uploadRole}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = users.filter(u => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    all:     users.length,
    teacher: users.filter(u => u.role === 'teacher').length,
    student: users.filter(u => u.role === 'student').length,
  };

  return (
    <>
      <TopBar
        title="Users"
        subtitle="Manage teachers and students across all institutes"
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm flex items-center gap-2" onClick={openUpload}>
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button className="btn-primary btn-sm flex items-center gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> New User
            </button>
          </div>
        }
      />

      <main className="p-6 flex flex-col gap-6">
        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              className="input pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-low border border-border rounded-lg p-1">
            {['all', 'teacher', 'student'].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-label-sm font-semibold rounded-md transition-all ${
                  roleFilter === r
                    ? 'bg-surface shadow-sm text-ink-primary'
                    : 'text-ink-muted hover:text-ink-secondary'
                }`}
              >
                {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
                <span className="ml-1.5 text-xs bg-surface-high text-ink-muted px-1.5 py-0.5 rounded-full">
                  {counts[r]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-low border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">User</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Role</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold hidden md:table-cell">Department</th>
                <th className="text-left px-5 py-3 text-label-sm text-ink-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                    <Users className="w-10 h-10 mx-auto mb-3 text-ink-muted/40" />
                    <p>No users found.</p>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-surface-low/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-ink-primary">{u.name}</p>
                        <p className="text-label-sm text-ink-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-label-sm font-semibold px-2.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role] || 'bg-surface-high text-ink-muted'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-label-sm text-ink-secondary">
                      {u.departments?.name || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" onClick={() => openDelete(u)} title="Delete">
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
        title={modal === 'create' ? 'New User' : 'Edit User'}
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
            <label className="label">Full Name <span className="text-danger">*</span></label>
            <input className="input" placeholder="e.g. John Doe" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email <span className="text-danger">*</span></label>
            <input className="input" type="email" placeholder="john@example.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role <span className="text-danger">*</span></label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">No Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">
              {modal === 'edit' ? 'New Password (leave blank to keep)' : <>Password <span className="text-danger">*</span></>}
            </label>
            <input className="input" type="password" placeholder="Min 8 characters" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────────────────── */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete User" size="sm"
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
          Delete <strong className="text-ink-primary">{selected?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>

      {/* ── Bulk Upload Modal ───────────────────────────────────────── */}
      <Modal
        open={modal === 'upload'}
        onClose={closeModal}
        title="Bulk Upload Users"
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeModal}>Close</button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleBulkUpload}
              disabled={uploading || csvRows.length === 0 || csvErrors.length > 0}
            >
              {uploading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
                : <><Upload className="w-4 h-4" /> Upload {csvRows.length > 0 ? `(${csvRows.length} rows)` : ''}</>
              }
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Role picker */}
          <div>
            <label className="label">Upload as Role</label>
            <div className="flex gap-2">
              {['student', 'teacher'].map(r => (
                <button key={r}
                  onClick={() => { setUploadRole(r); setCsvRows([]); setCsvErrors([]); setUploadResult(null); }}
                  className={`flex-1 py-2.5 rounded-lg border text-label-sm font-semibold transition-all ${
                    uploadRole === r
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-border text-ink-muted hover:border-ink-muted'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}s
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-surface-low border border-border rounded-lg p-4 text-label-sm text-ink-secondary space-y-1">
            <p className="font-semibold text-ink-primary mb-2">CSV Format Requirements</p>
            <p>Required columns: <code className="bg-surface-high px-1 rounded font-mono">name, email, password</code></p>
            <p>Optional: <code className="bg-surface-high px-1 rounded font-mono">department_id</code> (UUID)</p>
            <button onClick={downloadTemplate}
              className="mt-2 flex items-center gap-1.5 text-primary hover:underline font-semibold">
              <Download className="w-4 h-4" /> Download {uploadRole} template
            </button>
          </div>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary-50/20 transition-all cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <Upload className="w-8 h-8 text-primary/50 mb-3" />
            <p className="font-semibold text-ink-primary">Drop Excel or CSV file here or click to browse</p>
            <p className="text-label-sm text-ink-muted mt-1">Accepts .xlsx, .xls, .csv</p>
          </div>

          {/* Parsed rows preview */}
          {csvRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-label-sm font-semibold text-ink-primary">{csvRows.length} row(s) parsed</p>
                <button onClick={() => { setCsvRows([]); setCsvErrors([]); setUploadResult(null); }}
                  className="text-label-sm text-ink-muted hover:text-danger flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-surface-low sticky top-0">
                    <tr>
                      {Object.keys(csvRows[0]).map(h => (
                        <th key={h} className="px-3 py-2 text-left text-ink-muted font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvRows.map((row, i) => (
                      <tr key={i} className={csvErrors.some(e => e.includes(`Row ${i + 2}`)) ? 'bg-danger/5' : ''}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5 text-ink-secondary truncate max-w-[100px]">{v || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CSV Errors */}
          {csvErrors.length > 0 && (
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                <p className="text-label-sm font-semibold text-danger">Fix these errors before uploading:</p>
              </div>
              <ul className="space-y-0.5 pl-1">
                {csvErrors.map((e, i) => (
                  <li key={i} className="text-label-sm text-danger">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload result */}
          {uploadResult && (
            <div className="space-y-2">
              {uploadResult.success?.length > 0 && (
                <div className="bg-success/5 border border-success/20 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <p className="text-label-sm text-success font-semibold">
                    {uploadResult.success.length} user(s) created successfully
                  </p>
                </div>
              )}
              {uploadResult.failed?.length > 0 && (
                <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                    <p className="text-label-sm font-semibold text-danger">{uploadResult.failed.length} failed:</p>
                  </div>
                  {uploadResult.failed.map((f, i) => (
                    <p key={i} className="text-label-sm text-danger">• {f.email}: {f.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
