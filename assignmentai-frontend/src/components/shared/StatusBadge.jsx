const VARIANTS = {
  submitted: { label: 'Submitted', classes: 'bg-info-bg    text-info-text'    },
  pending:   { label: 'Pending',   classes: 'bg-warning-bg text-warning-text' },
  graded:    { label: 'Graded',    classes: 'bg-success-bg text-success-text' },
  missed:    { label: 'Missed',    classes: 'bg-danger-bg  text-danger-text'  },
  live:      { label: 'LIVE',      classes: 'bg-danger-bg  text-danger-text'  },
  resolved:  { label: 'Resolved',  classes: 'bg-success-bg text-success-text' },
  rejected:  { label: 'Rejected',  classes: 'bg-danger-bg  text-danger-text'  },
  high:      { label: 'High',      classes: 'bg-danger-bg  text-danger-text'  },
  medium:    { label: 'Medium',    classes: 'bg-warning-bg text-warning-text' },
  low:       { label: 'Low',       classes: 'bg-info-bg    text-info-text'    },
  active:    { label: 'Active',    classes: 'bg-success-bg text-success-text' },
  upcoming:  { label: 'Upcoming',  classes: 'bg-info-bg    text-info-text'    },
  teacher:   { label: 'Teacher',   classes: 'bg-primary-50 text-primary-700'  },
  student:   { label: 'Student',   classes: 'bg-surface-container text-ink-secondary' },
  admin:     { label: 'Admin',     classes: 'bg-primary-950/10 text-primary-900' },
};

/**
 * StatusBadge — pill-shaped status indicator.
 * @param {string} status  - key from VARIANTS
 * @param {string} [label] - override label text
 * @param {boolean} [dot]  - show pulsing dot (for LIVE)
 */
export default function StatusBadge({ status, label, dot = false }) {
  const variant = VARIANTS[status] ?? { label: status, classes: 'bg-surface-container text-ink-secondary' };
  const text = label ?? variant.label;
  const isLive = status === 'live';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                      text-label-sm font-semibold ${variant.classes}`}>
      {(dot || isLive) && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
      {text}
    </span>
  );
}
