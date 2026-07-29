import { useState } from 'react';
import Modal from '../shared/Modal';
import { useToast } from '../shared/Toast';
import { submitRequest } from '../../services/requestService';
import { Send, Calendar, FileText, MessageSquare, AlertTriangle } from 'lucide-react';

const TYPE_OPTIONS = [
  {
    value: 'deadline_extension',
    label: 'Deadline Extension',
    icon: Calendar,
    description: 'Request more time to submit an assignment',
    color: 'text-warning',
    bg: 'bg-warning/10 border-warning/20',
  },
  {
    value: 'grade_appeal',
    label: 'Grade Appeal',
    icon: FileText,
    description: 'Request re-evaluation of an AI-graded assignment',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  },
  {
    value: 'other',
    label: 'Other Request',
    icon: MessageSquare,
    description: 'General queries or special requests',
    color: 'text-ink-secondary',
    bg: 'bg-surface-high border-border',
  },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low',    className: 'bg-surface-high text-ink-secondary' },
  { value: 'medium', label: 'Medium', className: 'bg-warning/10 text-warning-text' },
  { value: 'high',   label: 'High',   className: 'bg-danger/10 text-danger' },
];

/**
 * SubmitRequestModal — lets a student raise a deadline extension, grade appeal, or other request.
 *
 * Props:
 *   open          {boolean}   - controlled open state
 *   onClose       {Function}  - close handler
 *   onSubmitted   {Function}  - called with the new request row on success
 *   assignments   {Array}     - list of the student's assignments for context selection
 *   defaultType   {string}    - pre-select a request type (optional)
 *   defaultAssignmentId {string} - pre-link to an assignment (optional)
 */
export default function SubmitRequestModal({
  open, onClose, onSubmitted, assignments = [],
  defaultType = '', defaultAssignmentId = '',
}) {
  const toast = useToast();
  const [type, setType] = useState(defaultType || '');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignmentId, setAssignmentId] = useState(defaultAssignmentId || '');
  const [newDeadline, setNewDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setType(defaultType || '');
    setReason('');
    setPriority('medium');
    setAssignmentId(defaultAssignmentId || '');
    setNewDeadline('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type) return toast({ type: 'error', title: 'Please select a request type.' });
    if (!reason.trim()) return toast({ type: 'error', title: 'Please enter a reason.' });
    if (type === 'deadline_extension' && !newDeadline) {
      return toast({ type: 'error', title: 'Please specify the requested new deadline.' });
    }

    try {
      setSubmitting(true);
      const payload = {
        type,
        reason: reason.trim(),
        priority,
        assignment_id: assignmentId || undefined,
        new_deadline: newDeadline ? new Date(newDeadline).toISOString() : undefined,
      };
      const newReq = await submitRequest(payload);
      toast({ type: 'success', title: 'Request submitted!', message: 'Your teacher will review it shortly.' });
      onSubmitted?.(newReq);
      handleClose();
    } catch (err) {
      toast({ type: 'error', title: 'Failed to submit', message: err.response?.data?.error || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Submit a Request"
      size="md"
      footer={
        <>
          <button className="btn btn-ghost" onClick={handleClose} disabled={submitting}>Cancel</button>
          <button
            className="btn btn-primary gap-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>

        {/* Request Type Selector */}
        <div>
          <label className="label mb-2">Request Type *</label>
          <div className="grid grid-cols-1 gap-2">
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const selected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150 ${
                    selected
                      ? `${opt.bg} ring-2 ring-offset-1 ${opt.color.replace('text-', 'ring-')}`
                      : 'border-border bg-surface-low hover:bg-surface-high'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? opt.bg : 'bg-surface-high'}`}>
                    <Icon className={`w-4 h-4 ${selected ? opt.color : 'text-ink-muted'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${selected ? 'text-ink-primary' : 'text-ink-secondary'}`}>{opt.label}</p>
                    <p className="text-xs text-ink-muted">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Linked Assignment */}
        {assignments.length > 0 && (
          <div>
            <label className="label mb-1" htmlFor="req-assignment">Linked Assignment</label>
            <select
              id="req-assignment"
              className="input"
              value={assignmentId}
              onChange={e => setAssignmentId(e.target.value)}
            >
              <option value="">— Select assignment (optional) —</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Requested New Deadline (only for deadline extension) */}
        {type === 'deadline_extension' && (
          <div>
            <label className="label mb-1" htmlFor="req-deadline">
              Requested New Deadline *
            </label>
            <input
              id="req-deadline"
              type="datetime-local"
              className="input"
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="label mb-1" htmlFor="req-reason">Reason / Explanation *</label>
          <textarea
            id="req-reason"
            className="input resize-none"
            rows={4}
            placeholder="Explain your request in detail. Be specific — this helps your teacher decide quickly."
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={1000}
          />
          <p className="text-xs text-ink-muted mt-1 text-right">{reason.length}/1000</p>
        </div>

        {/* Priority */}
        <div>
          <label className="label mb-2">Priority</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  priority === p.value
                    ? `${p.className} border-current ring-1 ring-current`
                    : 'border-border text-ink-muted hover:bg-surface-high'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-ink-secondary">
            Your teacher will be notified instantly. You can track the status of this request in your Requests page.
          </p>
        </div>

      </form>
    </Modal>
  );
}
