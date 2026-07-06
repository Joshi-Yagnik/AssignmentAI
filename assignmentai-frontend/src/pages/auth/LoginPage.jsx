import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/shared/Toast';
import { getErrorMessage } from '../../services/api';

const ROLES = ['Student', 'Teacher', 'Admin'];
const ROLE_HOME = { Student: '/student', Teacher: '/teacher', Admin: '/admin' };

function StatCard({ value, label }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <p className="text-white font-bold text-lg leading-tight">{value}</p>
      <p className="text-white/70 text-xs mt-0.5">{label}</p>
    </div>
  );
}

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const toast     = useToast();

  const [role,    setRole]    = useState('Teacher');
  const [show,    setShow]    = useState(false);
  const [email,   setEmail]   = useState('teacher@assignmentai.edu');
  const [pass,    setPass]    = useState('password');
  const [loading, setLoading] = useState(false);
  const [fieldErr, setFieldErr] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setFieldErr('');
    setLoading(true);

    try {
      const user = await login(email, pass, role);
      toast({ type: 'success', title: `Welcome back, ${user.name.split(' ')[0]}!` });
      navigate(ROLE_HOME[role]);
    } catch (err) {
      const msg = getErrorMessage(err);
      setFieldErr(msg);
      toast({ type: 'error', title: 'Login failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex rounded-2xl shadow-modal overflow-hidden">

        {/* ── Left: Branding ────────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col justify-between w-5/12 bg-indigo-brand p-10 relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 left-10  w-56 h-56 rounded-full bg-primary-500/20" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-bold text-xl">AssignmentAI</span>
            </div>
            <h2 className="text-white text-[28px] font-bold leading-snug">
              Intelligent Grading.<br />Live Evaluation.
            </h2>
            <p className="text-white/70 text-sm mt-3 leading-relaxed">
              The AI-powered academic platform built for modern universities.
            </p>
          </div>

          {/* Stat cards */}
          <div className="relative z-10 grid grid-cols-2 gap-3">
            <StatCard value="94.7%" label="AI Accuracy"       />
            <StatCard value="127"   label="Viva Sessions"     />
            <StatCard value="1,247" label="Students Active"   />
            <StatCard value="🔴 Live" label="2 Sessions Now" />
          </div>

          {/* Testimonial */}
          <div className="relative z-10 mt-6">
            <p className="text-white/70 text-sm italic leading-relaxed">
              "AssignmentAI transformed how we evaluate and grade students."
            </p>
            <p className="text-white/50 text-xs mt-2">— Dr. Priya Nair, IIT Bombay</p>
          </div>
        </div>

        {/* ── Right: Form ──────────────────────────────────────────────── */}
        <div className="flex-1 bg-white p-10 flex flex-col justify-center">
          {/* Wordmark */}
          <p className="text-primary-700 font-bold text-xs tracking-widest uppercase mb-3">
            AssignmentAI
          </p>
          <h1 className="text-[30px] font-bold text-ink-primary leading-tight">Welcome Back</h1>
          <p className="text-ink-secondary text-sm mt-1 mb-7">Sign in to your account to continue</p>

          {/* Role tabs */}
          <div className="flex p-1 bg-surface-container rounded-full mb-7">
            {ROLES.map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setFieldErr(''); }}
                className={`flex-1 py-2 text-label-md rounded-full transition-all duration-200
                  ${role === r
                    ? 'bg-white text-primary font-semibold shadow-sm shadow-primary/20'
                    : 'text-ink-muted hover:text-ink-primary'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="input-icon">
                <Mail className="icon" />
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErr(''); }}
                  placeholder="you@university.edu"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  type={show ? 'text' : 'password'}
                  className={`input pl-10 pr-10 ${fieldErr ? 'border-danger ring-1 ring-danger/30' : ''}`}
                  value={pass}
                  onChange={e => { setPass(e.target.value); setFieldErr(''); }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErr && (
                <p className="text-danger text-label-sm mt-1.5">{fieldErr}</p>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-label-md text-ink-secondary cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary rounded" />
                Remember me
              </label>
              <button type="button" className="text-label-md text-primary-700 hover:underline font-medium">
                Forgot Password?
              </button>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1 justify-center"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Social divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-ink-muted text-label-sm">or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-3">
            {/* Google */}
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border
                               bg-white hover:bg-surface-low transition-colors text-label-md font-medium text-ink-primary">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 19.07 11H12v2.75h7.86A7.49 7.49 0 0 1 4.64 17.4l-3.16 2.41A11.98 11.98 0 0 0 24 12c0-.67-.06-1.32-.17-1.95H12v3.7h6.44a5.5 5.5 0 0 1-2.36 3.6l3.4 2.63A11.98 11.98 0 0 0 5.27 9.76Z"/>
                <path fill="#4285F4" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.4-2.63a7.48 7.48 0 0 1-11.3-3.9l-3.16 2.41A11.98 11.98 0 0 0 12 24Z"/>
                <path fill="#FBBC05" d="M5.16 14.55A7.05 7.05 0 0 1 4.77 12c0-.88.15-1.73.39-2.55l-3.52-2.7A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l3.89-2.83Z"/>
                <path fill="#34A853" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A11.98 11.98 0 0 0 1.64 6.62l3.52 2.7A7.08 7.08 0 0 1 12 4.75Z"/>
              </svg>
              <span className="flex-1 text-center">Continue with Google</span>
            </button>

            {/* Microsoft */}
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border
                               bg-white hover:bg-surface-low transition-colors text-label-md font-medium text-ink-primary">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <rect x="1"  y="1"  width="10" height="10" fill="#F25022"/>
                <rect x="13" y="1"  width="10" height="10" fill="#7FBA00"/>
                <rect x="1"  y="13" width="10" height="10" fill="#00A4EF"/>
                <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
              </svg>
              <span className="flex-1 text-center">Continue with Microsoft</span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-label-md text-ink-secondary mt-6">
            Don't have an account?{' '}
            <button className="text-primary-700 font-semibold hover:underline">
              Request Access
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
