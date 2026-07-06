// ── EmptyState Component ──────────────────────────────────────────────────────
import { FileX } from 'lucide-react';

/**
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} title
 * @param {string} message
 * @param {React.ReactNode} action - optional CTA button
 */
export default function EmptyState({
  icon: Icon = FileX,
  title = 'Nothing here yet',
  message = '',
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center">
        <Icon className="w-7 h-7 text-ink-muted" />
      </div>
      <div>
        <p className="font-semibold text-ink-primary">{title}</p>
        {message && (
          <p className="text-label-md text-ink-muted mt-1 max-w-xs">{message}</p>
        )}
      </div>
      {action}
    </div>
  );
}
