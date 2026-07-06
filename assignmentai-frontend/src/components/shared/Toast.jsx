import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-success" />,
  error:   <XCircle    className="w-5 h-5 text-danger"  />,
  warning: <AlertTriangle className="w-5 h-5 text-warning" />,
  info:    <Info       className="w-5 h-5 text-info"    />,
};

const BG = {
  success: 'border-l-success bg-success-bg',
  error:   'border-l-danger  bg-danger-bg',
  warning: 'border-l-warning bg-warning-bg',
  info:    'border-l-info    bg-info-bg',
};

function ToastItem({ id, type = 'info', title, message, onRemove }) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl shadow-modal border-l-4
                  bg-white animate-toast-in min-w-[320px] max-w-[400px] ${BG[type]}`}
    >
      <span className="mt-0.5 shrink-0">{ICONS[type]}</span>
      <div className="flex-1 min-w-0">
        {title   && <p className="font-semibold text-ink-primary text-label-md">{title}</p>}
        {message && <p className="text-ink-secondary text-label-md mt-0.5">{message}</p>}
      </div>
      <button onClick={() => onRemove(id)} className="btn-icon shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now().toString();
    setToasts(t => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
