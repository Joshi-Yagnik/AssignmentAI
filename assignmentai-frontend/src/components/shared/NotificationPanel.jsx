import React, { useState } from 'react';
import {
  X, CheckCheck, Bell, Info, CheckCircle, AlertTriangle,
  AlertCircle, Clock, Trash2, Filter, BellOff
} from 'lucide-react';

// ── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  info: {
    icon: <Info className="w-4.5 h-4.5" />,
    iconBg: 'bg-blue-50 text-blue-500',
    border: 'border-l-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
  },
  success: {
    icon: <CheckCircle className="w-4.5 h-4.5" />,
    iconBg: 'bg-emerald-50 text-emerald-500',
    border: 'border-l-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Success',
  },
  warning: {
    icon: <AlertTriangle className="w-4.5 h-4.5" />,
    iconBg: 'bg-amber-50 text-amber-500',
    border: 'border-l-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Warning',
  },
  error: {
    icon: <AlertCircle className="w-4.5 h-4.5" />,
    iconBg: 'bg-red-50 text-red-500',
    border: 'border-l-red-400',
    badge: 'bg-red-100 text-red-700',
    label: 'Error',
  },
};

// ── Time formatting ───────────────────────────────────────────────────────────
function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now  = new Date();
  const diff = now - date; // ms

  if (diff < 60_000)            return 'Just now';
  if (diff < 3_600_000)         return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)        return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000)   return `${Math.floor(diff / 86_400_000)}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Filter Tabs ───────────────────────────────────────────────────────────────
const TABS = ['all', 'unread', 'info', 'success', 'warning', 'error'];

function FilterTab({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap capitalize ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-ink-muted hover:bg-surface-high hover:text-ink-primary'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          active ? 'bg-white/25 text-white' : 'bg-surface-high text-ink-muted'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NotificationPanel({
  isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead, onDelete, loading
}) {
  const [activeTab, setActiveTab] = useState('all');

  if (!isOpen) return null;

  // Apply tab filter
  const filtered = notifications.filter(n => {
    if (activeTab === 'all')    return true;
    if (activeTab === 'unread') return !n.is_read;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Count per type for tab badges
  const countByType = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 flex pl-10 max-w-full">
        <div className="w-screen max-w-[420px] bg-surface border-l border-border shadow-2xl flex flex-col">

          {/* ── Header ── */}
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-ink-primary leading-tight">Notifications</h2>
                <p className="text-[11px] text-ink-muted">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  title="Mark all as read"
                  className="p-2 rounded-lg text-ink-muted hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-high transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* ── Filter Tabs ── */}
          <div className="px-4 py-2.5 border-b border-border bg-surface-low/50 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <FilterTab
              label="All"
              active={activeTab === 'all'}
              count={notifications.length}
              onClick={() => setActiveTab('all')}
            />
            <FilterTab
              label="Unread"
              active={activeTab === 'unread'}
              count={unreadCount}
              onClick={() => setActiveTab('unread')}
            />
            <div className="w-px bg-border/70 mx-1 self-stretch" />
            {['info', 'success', 'warning', 'error'].map(type => (
              <FilterTab
                key={type}
                label={TYPE_CONFIG[type].label}
                active={activeTab === type}
                count={countByType[type] || 0}
                onClick={() => setActiveTab(type)}
              />
            ))}
          </div>

          {/* ── Notification List ── */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col gap-2.5 py-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-[72px] bg-surface-high rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-surface-high flex items-center justify-center mb-4">
                  <BellOff className="w-6 h-6 text-ink-muted/50" />
                </div>
                <p className="text-[14px] font-semibold text-ink-primary mb-1">
                  {activeTab === 'unread' ? 'All caught up!' : `No ${activeTab === 'all' ? '' : activeTab + ' '}notifications`}
                </p>
                <p className="text-xs text-ink-muted max-w-[220px] leading-relaxed">
                  {activeTab === 'unread'
                    ? 'You have no unread notifications right now.'
                    : 'Notifications for assignments, grades, and viva sessions appear here.'}
                </p>
              </div>
            ) : (
              filtered.map((item) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
                return (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && onMarkAsRead(item.id)}
                    className={`group relative flex gap-3 p-3.5 rounded-xl border border-l-4 transition-all cursor-pointer ${cfg.border} ${
                      item.is_read
                        ? 'bg-surface/60 border-border/50 border-l-4 opacity-70 hover:opacity-90'
                        : 'bg-surface border-border shadow-sm hover:shadow-md hover:-translate-y-px'
                    }`}
                  >
                    {/* Unread dot */}
                    {!item.is_read && (
                      <span className="absolute top-3.5 right-10 w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}

                    {/* Type icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconBg}`}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-start gap-2 mb-0.5">
                        <h4 className="text-[13px] font-semibold text-ink-primary leading-snug flex-1 truncate">
                          {item.title}
                        </h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-ink-muted/70" />
                        <span className="text-[11px] text-ink-muted">{formatTime(item.created_at)}</span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      title="Dismiss"
                      className="absolute top-3 right-3 p-1 rounded-md text-ink-muted/0 group-hover:text-ink-muted hover:!text-danger hover:bg-danger/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-3 border-t border-border bg-surface-low/30 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-ink-muted">
              {notifications.length} total · {unreadCount} unread
            </span>
            <span className="flex items-center gap-1 text-[11px] text-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
