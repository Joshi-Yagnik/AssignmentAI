import React from 'react';
import { X, CheckCheck, Bell, Info, CheckCircle, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

const ICON_MAP = {
  info: <Info className="w-5 h-5 text-primary shrink-0" />,
  success: <CheckCircle className="w-5 h-5 text-success shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
};

export default function NotificationPanel({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-surface-high/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-headline-xs font-semibold text-ink-primary">Notifications</h2>
                <p className="text-label-sm text-ink-muted">Stay updated on your platform activity</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-high transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Sub-header */}
          <div className="px-5 py-2.5 bg-surface-low border-b border-border flex items-center justify-between text-xs">
            <span className="text-ink-muted font-medium">
              {notifications.filter(n => !n.is_read).length} unread
            </span>
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={onMarkAllAsRead}
                className="text-primary hover:underline font-medium flex items-center gap-1.5 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col gap-3 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-surface-high rounded-xl animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-surface-high flex items-center justify-center text-ink-muted mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-body-md font-medium text-ink-primary">No notifications yet</p>
                <p className="text-label-sm text-ink-muted mt-1 max-w-xs">
                  We will notify you when there are updates on assignments, grades, or viva sessions.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const icon = ICON_MAP[item.type] || ICON_MAP.info;
                const timeAgo = item.created_at
                  ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && onMarkAsRead(item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-start relative ${
                      item.is_read
                        ? 'bg-surface/50 border-border/60 opacity-80'
                        : 'bg-surface border-primary/30 shadow-xs hover:border-primary'
                    }`}
                  >
                    {!item.is_read && (
                      <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-primary" />
                    )}
                    <div className="mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-label-md font-semibold text-ink-primary truncate">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-body-sm text-ink-secondary leading-snug line-clamp-2">
                        {item.message}
                      </p>
                      {timeAgo && (
                        <div className="flex items-center gap-1 mt-2 text-[11px] text-ink-muted">
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-surface-high/30 text-center">
            <span className="text-label-sm text-ink-muted">Notifications are updated in real-time</span>
          </div>

        </div>
      </div>
    </div>
  );
}
