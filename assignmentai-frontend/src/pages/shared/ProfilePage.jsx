import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Save, UserCircle, Shield, Building2, BookOpen, Key, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const toast = useToast();
  const { user, login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
    current_semester: '',
    class_name: '',
    lab_batch: '',
    batch_year: '',
    password: ''
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/users/profile');
      setProfile(data);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        gender: data.gender || '',
        current_semester: data.current_semester || '',
        class_name: data.class_name || '',
        lab_batch: data.lab_batch || '',
        batch_year: data.batch_year || '',
        password: ''
      });
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load profile', message: err?.response?.data?.error || '' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.current_semester) payload.current_semester = null;
      
      const { data } = await api.put('/admin/users/profile', payload);
      setProfile(data);
      
      setForm(prev => ({ ...prev, password: '' })); // clear password field
      toast({ type: 'success', title: 'Profile updated successfully!' });
    } catch (err) {
      toast({ type: 'error', title: 'Update failed', message: err?.response?.data?.error || '' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      <TopBar title="My Profile" subtitle="Manage your personal information and settings" />

      <main className="p-4 md:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6 mb-12">
        
        {/* Header Card */}
        <div className="card flex flex-col md:flex-row items-center md:items-start gap-6 border-t-4 border-t-primary">
          <div className="w-24 h-24 rounded-full bg-indigo-gradient flex items-center justify-center shrink-0 shadow-lg text-white font-bold text-3xl">
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-ink-primary">{profile.first_name} {profile.last_name}</h2>
            <p className="text-ink-secondary mt-1">{profile.email}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">
                <Shield className="w-3.5 h-3.5" />
                {profile.role}
              </span>
              {profile.departments && (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-high text-ink-primary border border-border">
                  <Building2 className="w-3.5 h-3.5 text-ink-muted" />
                  {profile.departments.name}
                </span>
              )}
              {profile.enrollment_number && (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-high text-ink-primary border border-border">
                  <BookOpen className="w-3.5 h-3.5 text-ink-muted" />
                  ID: {profile.enrollment_number}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Editable Form */}
        <form onSubmit={handleSubmit} className="card p-0 overflow-hidden">
          <div className="p-5 md:p-6 bg-surface-low border-b border-border">
            <h3 className="font-bold text-ink-primary text-lg flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" />
              Personal Details
            </h3>
            <p className="text-label-sm text-ink-muted mt-1">Update your basic information and contact details.</p>
          </div>
          
          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <label className="text-label-sm font-semibold text-ink-primary">First Name</label>
              <input type="text" required className="input w-full bg-surface" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-label-sm font-semibold text-ink-primary">Last Name</label>
              <input type="text" required className="input w-full bg-surface" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-label-sm font-semibold text-ink-primary">Email Address</label>
              <input type="email" disabled className="input w-full bg-surface-low cursor-not-allowed text-ink-muted" value={profile.email} />
              <p className="text-[10px] text-ink-muted">Email cannot be changed.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-label-sm font-semibold text-ink-primary">Phone Number</label>
              <input type="text" className="input w-full bg-surface" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm font-semibold text-ink-primary">Gender</label>
              <select className="input w-full bg-surface" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {profile.role === 'student' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-label-sm font-semibold text-ink-primary">Current Semester</label>
                  <input type="number" min="1" max="10" className="input w-full bg-surface" value={form.current_semester} onChange={e => setForm({...form, current_semester: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label-sm font-semibold text-ink-primary">Class</label>
                  <input type="text" placeholder="e.g. 7IT-A" className="input w-full bg-surface" value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label-sm font-semibold text-ink-primary">Lab Batch</label>
                  <input type="text" placeholder="e.g. 7IT-A-1" className="input w-full bg-surface" value={form.lab_batch} onChange={e => setForm({...form, lab_batch: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label-sm font-semibold text-ink-primary">Batch Year</label>
                  <input type="text" placeholder="e.g. 2023-2027" className="input w-full bg-surface" value={form.batch_year} onChange={e => setForm({...form, batch_year: e.target.value})} />
                </div>
              </>
            )}
          </div>

          <div className="p-5 md:p-6 bg-surface-low border-y border-border">
            <h3 className="font-bold text-ink-primary text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Change Password
            </h3>
            <p className="text-label-sm text-ink-muted mt-1">Leave blank if you do not wish to change your password.</p>
            
            <div className="mt-4 max-w-md space-y-1.5">
              <label className="text-label-sm font-semibold text-ink-primary">New Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="input w-full bg-surface" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
                minLength={6}
              />
            </div>
          </div>

          <div className="p-5 md:p-6 flex items-center justify-end gap-3 bg-surface">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={load} 
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary min-w-[140px]" 
              disabled={saving}
            >
              {saving ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
            </button>
          </div>
        </form>

      </main>
    </>
  );
}
