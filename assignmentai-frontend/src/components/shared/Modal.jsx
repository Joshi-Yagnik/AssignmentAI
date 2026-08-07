import { X } from 'lucide-react';
import { useEffect, useCallback } from 'react';

/**
 * Modal — accessible overlay modal.
 * On mobile (< md): renders as a bottom-sheet that slides up from the bottom.
 * On desktop: renders as a centered modal dialog.
 *
 * @param {boolean}   open       - controlled open state
 * @param {Function}  onClose    - close handler
 * @param {string}    title      - modal title
 * @param {ReactNode} children   - body content
 * @param {string}    [size]     - 'sm' | 'md' | 'lg' | 'xl' (desktop only)
 * @param {ReactNode} [footer]   - footer action buttons
 */
export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-primary/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* ── Mobile: bottom-sheet ───────────────────────────────────────── */}
      <div className="md:hidden bottom-sheet relative">
        {/* Drag handle */}
        <div className="bottom-sheet-handle" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 id="modal-title" className="text-headline-sm text-ink-primary font-semibold">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-border flex flex-col gap-2 bg-surface-low">
            {footer}
          </div>
        )}
      </div>

      {/* ── Desktop: centered modal ────────────────────────────────────── */}
      <div
        className={`hidden md:flex relative w-full ${sizes[size]} bg-white rounded-2xl shadow-modal
                     border border-primary/10 animate-fade-in flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 id="modal-title" className="text-headline-sm text-ink-primary">{title}</h3>
          <button onClick={onClose} className="btn-icon" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-surface-low rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
