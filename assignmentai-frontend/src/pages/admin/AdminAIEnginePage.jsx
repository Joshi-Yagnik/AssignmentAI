import { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import { Bot, Cpu, Zap, Activity, Server, AlertTriangle, Save, Play, Square, Loader2 } from 'lucide-react';
import { getAiConfig, updateAiConfig, getAiStats } from '../../services/adminService';

export default function AdminAIEnginePage() {
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [stats, setStats] = useState({
    totalJobs: 0,
    successRate: 0,
    avgProcessingTime: '0s',
    activeWorkers: 0,
  });

  const [config, setConfig] = useState({
    primary_model: 'grok-3',
    temperature: 0.2,
    is_active: true,
    system_prompt: '',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [aiStats, aiConfig] = await Promise.all([
        getAiStats(),
        getAiConfig()
      ]);
      if (aiStats) setStats(aiStats);
      if (aiConfig) setConfig(aiConfig);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load AI Engine data', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateAiConfig(config);
      setConfig(updated);
      toast({ type: 'success', title: 'Configuration Saved', message: 'The grading worker will use these new settings for the next job.' });
    } catch (err) {
      toast({ type: 'error', title: 'Failed to save', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleState = async () => {
    if (!window.confirm(`Are you sure you want to ${config.is_active ? 'DISABLE' : 'ENABLE'} the AI Engine?`)) return;
    try {
      const updated = await updateAiConfig({ is_active: !config.is_active });
      setConfig(updated);
      toast({ 
        type: updated.is_active ? 'success' : 'warning', 
        title: `Engine ${updated.is_active ? 'Enabled' : 'Disabled'}`, 
        message: updated.is_active ? 'New assignments will now be graded.' : 'Assignments will stay in queue until re-enabled.' 
      });
    } catch (err) {
      toast({ type: 'error', title: 'Failed to toggle', message: err.message });
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="AI Engine Control" />
        <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="AI Engine Control"
        subtitle="Monitor and configure the AI grading infrastructure."
        actions={
          <button 
            className="btn btn-primary gap-2" 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        }
      />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        
        {/* Status Hero */}
        <div className={`card ${config.is_active ? 'bg-primary-900' : 'bg-surface-high border-border'} text-white flex flex-col sm:flex-row items-center justify-between p-8 overflow-hidden relative transition-colors duration-500`}>
          <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 ${config.is_active ? 'bg-primary-500' : 'bg-ink-muted'}`} />
          <div className="relative z-10 text-center sm:text-left">
            <h2 className={`text-3xl font-bold mb-2 flex items-center justify-center sm:justify-start gap-3 ${config.is_active ? 'text-white' : 'text-ink-primary'}`}>
              <Bot className={`w-8 h-8 ${config.is_active ? 'text-primary-300' : 'text-ink-muted'}`} />
              Engine Status: <span className={config.is_active ? 'text-success' : 'text-danger'}>{config.is_active ? 'Online' : 'Offline'}</span>
            </h2>
            <p className={`max-w-md ${config.is_active ? 'text-primary-100/80' : 'text-ink-secondary'}`}>
              {config.is_active 
                ? 'The Grok-powered grading workers are connected and ready to process assignments.'
                : 'The grading queue is currently paused globally. Assignments will queue up but will not be processed.'}
            </p>
          </div>
          <div className="relative z-10 mt-6 sm:mt-0 flex flex-col items-center gap-4">
            <button
              onClick={handleToggleState}
              className={`btn px-6 py-3 font-bold flex items-center gap-2 ${
                config.is_active 
                  ? 'bg-danger hover:bg-danger-hover text-white shadow-danger/20' 
                  : 'bg-success hover:bg-success-hover text-white shadow-success/20'
              }`}
            >
              {config.is_active ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              {config.is_active ? 'EMERGENCY STOP' : 'START ENGINE'}
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary leading-none">{stats.totalJobs}</p>
              <p className="text-label-sm text-ink-muted mt-1">Total Jobs Processed</p>
            </div>
          </div>
          
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary leading-none">{stats.successRate}%</p>
              <p className="text-label-sm text-ink-muted mt-1">Processing Success Rate</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <Server className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary leading-none">{stats.avgProcessingTime}</p>
              <p className="text-label-sm text-ink-muted mt-1">Avg. Processing Time</p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="card lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-ink-primary" />
              <h3 className="text-headline-sm">Grok System Prompt Template</h3>
            </div>
            
            <p className="text-sm text-ink-muted">
              Use variables like <code>{`{{strictnessLabel}}`}</code>, <code>{`{{answerKeyText}}`}</code>, <code>{`{{submissionText}}`}</code>, and <code>{`{{maxMarks}}`}</code>. This prompt must enforce the exact JSON output schema expected by the backend.
            </p>
            
            <textarea
              className="input resize-y font-mono text-xs leading-relaxed h-[450px]"
              value={config.system_prompt}
              onChange={e => setConfig(c => ({ ...c, system_prompt: e.target.value }))}
              placeholder="System prompt..."
            />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="card">
              <h3 className="text-headline-sm mb-4">Model Parameters</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="label mb-1">Primary Model</label>
                  <select 
                    className="input" 
                    value={config.primary_model}
                    onChange={e => setConfig(c => ({ ...c, primary_model: e.target.value }))}
                  >
                    <option value="grok-3">Grok 3 (Recommended)</option>
                    <option value="grok-2-1212">Grok-2-1212</option>
                    <option value="grok-beta">Grok-Beta</option>
                  </select>
                  <p className="text-xs text-ink-muted mt-1">Make sure your xAI API key supports the selected model.</p>
                </div>
                
                <div>
                  <label className="label mb-2 flex justify-between">
                    <span>Temperature</span>
                    <span className="font-mono text-primary font-bold">{config.temperature.toFixed(2)}</span>
                  </label>
                  <input 
                    type="range" 
                    className="w-full accent-primary" 
                    min="0" max="1" step="0.05"
                    value={config.temperature}
                    onChange={e => setConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
                  />
                  <div className="flex justify-between text-xs text-ink-muted mt-1">
                    <span>Deterministic (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-2">
                    A lower temperature (e.g. 0.2) is highly recommended for structured grading outputs.
                  </p>
                </div>
              </div>
            </div>

            <div className="card border border-danger/20 bg-danger/5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <h3 className="text-headline-sm text-danger-text">System Alerts</h3>
              </div>
              <div className="flex flex-col gap-3">
                {!config.is_active && (
                  <div className="p-3 bg-white border border-danger/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">Queue Paused</p>
                      <p className="text-xs text-ink-muted mt-0.5">The engine is globally disabled. Workers will reject new grading jobs.</p>
                    </div>
                  </div>
                )}
                <div className="p-3 bg-white border border-border rounded-lg flex items-start gap-3">
                  <Activity className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">BullMQ Ready</p>
                    <p className="text-xs text-ink-muted mt-0.5">Redis is connected. Up to 3 concurrent grading jobs supported.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
