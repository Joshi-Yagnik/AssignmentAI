import { useState, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import { Bot, Cpu, Zap, Activity, Server, AlertTriangle } from 'lucide-react';

export default function AdminAIEnginePage() {
  const [stats, setStats] = useState({
    totalJobs: 145,
    successRate: 98.5,
    avgProcessingTime: '12.4s',
    activeWorkers: 3,
  });

  return (
    <>
      <TopBar
        title="AI Engine Control"
        subtitle="Monitor and configure the AI grading infrastructure."
      />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        
        {/* Status Hero */}
        <div className="card bg-primary-900 text-white flex flex-col sm:flex-row items-center justify-between p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary-300" />
              Engine Status: <span className="text-success">Online</span>
            </h2>
            <p className="text-primary-100/80 max-w-md">
              The Grok-powered grading workers are connected and ready to process assignments.
            </p>
          </div>
          <div className="relative z-10 mt-6 sm:mt-0 flex items-center gap-4">
            <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-md text-center min-w-[120px]">
              <div className="text-3xl font-bold text-white">{stats.activeWorkers}</div>
              <div className="text-xs text-primary-200 mt-1 uppercase tracking-wider font-semibold">Active Workers</div>
            </div>
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
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-primary leading-none">{stats.avgProcessingTime}</p>
              <p className="text-label-sm text-ink-muted mt-1">Avg. Processing Time</p>
            </div>
          </div>
        </div>

        {/* Configuration / Settings Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-ink-primary" />
              <h3 className="text-headline-sm">Model Configuration</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Primary Model</label>
                <select className="input" disabled>
                  <option>Grok-2-1212</option>
                  <option>Grok-Beta</option>
                </select>
              </div>
              <div>
                <label className="label">Temperature (Creativity vs. Strictness)</label>
                <input type="range" className="w-full accent-primary" min="0" max="100" defaultValue="20" disabled />
                <div className="flex justify-between text-xs text-ink-muted mt-1">
                  <span>Strict Grading</span>
                  <span>Lenient Grading</span>
                </div>
              </div>
              <button className="btn-secondary w-full" disabled>Save Configuration (Locked)</button>
            </div>
          </div>

          <div className="card border border-danger/20 bg-danger/5">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-danger" />
              <h3 className="text-headline-sm text-danger-text">Infrastructure Alerts</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-white border border-danger/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Redis Connection Instability</p>
                  <p className="text-xs text-ink-muted mt-0.5">The BullMQ grading queue experienced intermittent connection drops in the last 24h. The worker has automatically retried connections.</p>
                </div>
              </div>
              <div className="p-3 bg-white border border-border rounded-lg flex items-start gap-3">
                <Activity className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Grok API Latency</p>
                  <p className="text-xs text-ink-muted mt-0.5">API response times are within normal operational limits (&lt; 2000ms).</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}

// Just a quick dummy icon if Clock isn't imported from lucide-react above.
function Clock(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
