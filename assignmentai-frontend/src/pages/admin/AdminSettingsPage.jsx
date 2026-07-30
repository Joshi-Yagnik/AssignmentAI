import { useState, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { getSettings, updateSettings } from '../../services/adminService';
import { Save, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    default_grading_strictness: 'normal',
    theme_preference: 'system',
    require_2fa: false,
    session_timeout_minutes: 120
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSettings();
      if (data) setSettings(data);
    } catch (error) {
      toast({ type: 'error', title: 'Failed to load settings', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings(settings);
      toast({ type: 'success', title: 'Settings saved successfully' });
    } catch (error) {
      toast({ type: 'error', title: 'Failed to save settings', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <>
        <TopBar title="Settings" subtitle="Platform configuration and preferences" />
        <main className="p-4 md:p-6 max-w-4xl mx-auto w-full animate-pulse">
          <div className="h-64 bg-surface-high rounded-xl w-full mb-6" />
          <div className="h-64 bg-surface-high rounded-xl w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Settings" subtitle="Platform configuration and preferences" />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">
        
        {/* ── System Settings ────────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-high/50">
            <h3 className="text-headline-sm font-semibold text-ink-primary">System Preferences</h3>
            <p className="text-label-sm text-ink-muted mt-1">Configure global platform behavior</p>
          </div>
          
          <div className="p-5 flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors">
              <div>
                <h4 className="font-medium text-ink-primary mb-1 flex items-center gap-2">
                  Maintenance Mode
                  {settings.maintenance_mode && <span className="bg-warning/20 text-warning-text text-xs px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                </h4>
                <p className="text-sm text-ink-muted">Disable access for non-admin users across the platform.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.maintenance_mode}
                  onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-surface-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger"></div>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-ink-primary">Default AI Grading Strictness</label>
              <p className="text-sm text-ink-muted mb-1">Baseline strictness for AI evaluations if not overridden by the teacher.</p>
              <select 
                className="input max-w-xs"
                value={settings.default_grading_strictness}
                onChange={(e) => handleChange('default_grading_strictness', e.target.value)}
              >
                <option value="lenient">Lenient</option>
                <option value="normal">Normal</option>
                <option value="strict">Strict</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-ink-primary">Global Theme Preference</label>
              <select 
                className="input max-w-xs"
                value={settings.theme_preference}
                onChange={(e) => handleChange('theme_preference', e.target.value)}
              >
                <option value="system">Follow User System Settings</option>
                <option value="light">Force Light Mode</option>
                <option value="dark">Force Dark Mode</option>
              </select>
            </div>

          </div>
        </div>

        {/* ── Security Settings ───────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-high/50">
            <h3 className="text-headline-sm font-semibold text-ink-primary">Security & Auth</h3>
            <p className="text-label-sm text-ink-muted mt-1">Manage global security policies</p>
          </div>
          
          <div className="p-5 flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors">
              <div>
                <h4 className="font-medium text-ink-primary mb-1 flex items-center gap-2">
                  Require 2FA Global
                  {settings.require_2fa && <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">ENABLED</span>}
                </h4>
                <p className="text-sm text-ink-muted">Force all teachers and admins to use Two-Factor Authentication.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.require_2fa}
                  onChange={(e) => handleChange('require_2fa', e.target.checked)}
                />
                <div className="w-11 h-6 bg-surface-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-ink-primary">Session Timeout (Minutes)</label>
              <p className="text-sm text-ink-muted mb-1">Time before an inactive user is automatically logged out.</p>
              <input 
                type="number" 
                className="input max-w-xs"
                value={settings.session_timeout_minutes}
                onChange={(e) => handleChange('session_timeout_minutes', parseInt(e.target.value) || 60)}
                min="15"
                max="1440"
              />
            </div>

          </div>
        </div>

        {/* ── Save Action ─────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-4 border-t border-border mt-4">
          <button 
            className="btn btn-primary flex items-center gap-2 px-6"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Settings
          </button>
        </div>

      </main>
    </>
  );
}
