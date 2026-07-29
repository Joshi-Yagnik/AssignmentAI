import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import {
  Upload, FileText, CheckCircle2, Loader2, ArrowLeft,
  Calendar, Info, AlertCircle, X, ExternalLink, Clock,
  History, ChevronDown, ChevronUp, Star, RefreshCw, Shield
} from 'lucide-react';
import {
  getAssignmentById, getUploadUrl, uploadFileToStorage,
  createSubmission, getMySubmissions, getDownloadUrl
} from '../../services/assignmentService';
import { useProctoring } from '../../hooks/useProctoring';

// ── Deadline Countdown Badge ────────────────────────────────────────────────
function DeadlineBadge({ deadline }) {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end - now;
  if (diffMs <= 0) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-danger/10 border border-danger/30 text-danger text-label-sm font-semibold rounded-full">
        <AlertCircle className="w-3.5 h-3.5" /> Deadline Passed
      </span>
    );
  }
  const diffH = Math.floor(diffMs / 1000 / 60 / 60);
  const diffD = Math.floor(diffH / 24);
  const label = diffD >= 1 ? `${diffD}d ${diffH % 24}h left` : `${diffH}h ${Math.floor((diffMs / 1000 / 60) % 60)}m left`;
  const urgent = diffH < 24;
  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 border text-label-sm font-semibold rounded-full ${urgent ? 'bg-warning/10 border-warning/30 text-warning-700' : 'bg-success/10 border-success/30 text-success'}`}>
      <Clock className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

// ── Upload History Drawer ───────────────────────────────────────────────────
function UploadHistoryDrawer({ history, onView }) {
  const [open, setOpen] = useState(false);
  if (!history || history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-low hover:bg-surface-high transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2 text-label-md font-semibold text-ink-primary">
          <History className="w-4 h-4 text-primary" /> Upload History ({history.length})
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
      </button>
      {open && (
        <div className="divide-y divide-border">
          {history.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <p className="text-label-md font-medium text-ink-primary">Attempt #{idx + 1}</p>
                <p className="text-label-sm text-ink-muted">
                  {entry.submitted_at ? new Date(entry.submitted_at).toLocaleString('en-IN') : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onView(entry.file_url)}
                className="btn btn-ghost btn-sm text-primary gap-1"
              >
                View <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StudentSubmissionPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subMode, setSubMode] = useState('file');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState('');
  const [uploadHistory, setUploadHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  // Proctoring State
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [streamError, setStreamError] = useState(false);

  const isGraded      = assignment?.submission?.status === 'graded';
  const isSubmitted   = !!fileUrl;
  const isPastDeadline = assignment ? new Date() > new Date(assignment.deadline) : false;
  const canResubmit   = isSubmitted && !isGraded && !isPastDeadline && (assignment?.allow_resubmission ?? true);

  const isProctoringActive = !!assignment && !isSubmitted && !isGraded && !isPastDeadline && !streamError;

  const { warnings, faceStatus } = useProctoring({
    isActive: isProctoringActive,
    source: 'assignment',
    referenceId: assignment?.submission?.id || assignmentId,
    subjectId: assignment?.subjects?.id || null,
    videoRef
  });

  // Start webcam for proctoring
  useEffect(() => {
    if (isProctoringActive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setStreamError(false);
        })
        .catch(err => {
          console.error('[Webcam Error]', err);
          setStreamError(true);
        });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isProctoringActive]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [assignData, mySubmissions] = await Promise.all([
          getAssignmentById(assignmentId),
          getMySubmissions()
        ]);
        const existingSub = mySubmissions.find(s => s.assignment_id === assignmentId);
        if (existingSub) {
          assignData.submission = existingSub;
          setFileUrl(existingSub.file_url || '');
          setUploadHistory(existingSub.upload_history || []);
        }
        setAssignment(assignData);
      } catch (err) {
        toast({ type: 'error', title: 'Failed to load assignment' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [assignmentId, toast]);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setFileUrl('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleViewFile = async (pathUrl) => {
    try {
      const { signedUrl } = await getDownloadUrl({ bucket: 'submissions', path: pathUrl });
      window.open(signedUrl, '_blank');
    } catch {
      toast({ type: 'error', title: 'Failed to generate secure link' });
    }
  };

  // Build the accept string from assignment.allowed_formats
  const acceptAttr = assignment?.allowed_formats?.join(',') || '.pdf,.docx,.doc,.png,.jpg,.jpeg';
  const formatLabels = assignment?.allowed_formats?.map(f => f.replace('.', '').toUpperCase()).join(', ') || 'PDF, DOCX, PNG, JPG';

  const score         = assignment?.submission?.ai_reports?.[0]?.final_score;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (subMode === 'file' && !file && !fileUrl) {
      return toast({ type: 'warning', title: 'Please select a file to upload' });
    }
    if (subMode === 'text' && !typedAnswer.trim() && !fileUrl) {
      return toast({ type: 'warning', title: 'Please type your answer' });
    }

    setSubmitting(true);
    try {
      let finalFileUrl = fileUrl;

      if (!finalFileUrl || file) {
        let uploadFile = file;
        if (subMode === 'text') {
          const blob = new Blob([typedAnswer], { type: 'text/plain' });
          uploadFile = new File([blob], `answer_${assignmentId}.txt`, { type: 'text/plain' });
        }

        setUploading(true);
        const { signedUrl, path } = await getUploadUrl({
          bucket: 'submissions',
          filename: `${Date.now()}_${uploadFile.name}`,
          contentType: uploadFile.type || 'application/octet-stream',
        });

        await uploadFileToStorage(signedUrl, uploadFile, setProgress);
        finalFileUrl = path;
        setFileUrl(path);
        setUploading(false);
      }

      await createSubmission({ assignment_id: assignmentId, file_url: finalFileUrl });
      toast({ type: 'success', title: 'Assignment Submitted!', message: 'Your work is being graded by AI.' });
      navigate('/student/assignments');
    } catch (err) {
      toast({ type: 'error', title: err.message || 'Submission failed' });
      setUploading(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-ink-muted">
        <AlertCircle className="w-12 h-12 mb-4 text-danger/50" />
        <p className="text-lg">Assignment not found</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate('/student/assignments')}>
          Back to Assignments
        </button>
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Submit Assignment"
        subtitle={assignment.title}
        actions={
          <button className="btn btn-ghost btn-sm gap-2" onClick={() => navigate('/student/assignments')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      <main className="p-4 md:p-6 pb-24 max-w-4xl mx-auto flex flex-col gap-6">

        {/* ── Details Card ─────────────────────────────────────────────── */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-headline-sm text-ink-primary">{assignment.title}</h1>
              <p className="text-label-md text-ink-secondary mt-1">
                {assignment.subjects?.name} ({assignment.subjects?.code})
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isGraded && (
                <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl">
                  <Star className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-label-sm text-success font-semibold">Graded</p>
                    <p className="text-headline-sm text-success leading-none">{score}/{assignment.max_marks || 100}</p>
                  </div>
                </div>
              )}
              <DeadlineBadge deadline={assignment.deadline} />
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 border-y border-border">
            <div className="flex items-center gap-2 text-label-sm font-medium text-ink-secondary">
              <Calendar className="w-4 h-4 text-primary" />
              Due: {new Date(assignment.deadline).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 text-label-sm font-medium text-ink-secondary">
              <FileText className="w-4 h-4 text-primary" />
              {assignment.total_questions} Questions
            </div>
            <div className="flex items-center gap-2 text-label-sm font-medium text-ink-secondary">
              <Star className="w-4 h-4 text-primary" />
              Total Marks: {assignment.max_marks || 100}
            </div>
            <div className="flex items-center gap-2 text-label-sm font-medium text-ink-secondary">
              <Upload className="w-4 h-4 text-primary" />
              Accepted: {formatLabels}
            </div>
            <div className="flex items-center gap-2 text-label-sm font-medium text-ink-secondary">
              <RefreshCw className="w-4 h-4 text-primary" />
              Resubmission: {(assignment.allow_resubmission ?? true) ? 'Allowed' : 'Not Allowed'}
            </div>
          </div>

          <div>
            <p className="text-label-sm font-semibold text-primary uppercase tracking-widest mb-2">Instructions</p>
            <p className="text-body-md text-ink-primary whitespace-pre-wrap">
              {assignment.instructions || 'No specific instructions provided.'}
            </p>
          </div>

          {assignment.question_pdf_url && (
            <div className="mt-2">
              <a href={assignment.question_pdf_url} target="_blank" rel="noreferrer"
                className="btn btn-secondary inline-flex gap-2">
                <FileText className="w-4 h-4" /> View Question Paper
              </a>
            </div>
          )}
        </div>

        {/* ── Submission Card ──────────────────────────────────────────── */}
        <form className="card flex flex-col gap-6" onSubmit={handleSubmit}>
          <p className="text-label-sm font-semibold text-primary uppercase tracking-widest">Your Work</p>

          {/* Upload History Drawer */}
          <UploadHistoryDrawer history={uploadHistory} onView={handleViewFile} />

          {/* Already submitted + no replace action */}
          {isSubmitted && !isGraded && !canResubmit && (
            <div className="p-4 rounded-xl border border-border bg-surface-low">
              <p className="text-ink-secondary font-medium">
                {isPastDeadline
                  ? '⏰ The deadline has passed. No further submissions are accepted.'
                  : '🔒 The teacher has disabled resubmissions for this assignment.'}
              </p>
              <button type="button" onClick={() => handleViewFile(fileUrl)}
                className="btn btn-secondary btn-sm mt-3 gap-1">
                View Your Submission <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Current submission — can replace */}
          {isSubmitted && !isGraded && canResubmit && (
            <div className="flex items-center justify-between p-4 rounded-xl border bg-success/5 border-success/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-ink-primary text-sm">Submission recorded</p>
                  <p className="text-label-sm text-ink-muted">You can update your submission before the deadline.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleViewFile(fileUrl)} className="btn btn-ghost btn-sm text-primary">
                  View <ExternalLink className="w-4 h-4 ml-1" />
                </button>
                <button type="button" className="btn btn-ghost btn-sm text-warning-700 hover:bg-warning/10"
                  onClick={() => { setFileUrl(''); setFile(null); setTypedAnswer(''); }}>
                  Replace
                </button>
              </div>
            </div>
          )}

          {/* Upload area — shown if not submitted yet, or replacing */}
          {!isSubmitted && !isGraded && !isPastDeadline && (
            <>
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-surface-low border border-border rounded-lg self-start">
                <button type="button" onClick={() => setSubMode('file')}
                  className={`px-4 py-2 text-label-sm font-semibold rounded-md transition-all ${subMode === 'file' ? 'bg-surface shadow-sm text-ink-primary' : 'text-ink-muted'}`}>
                  Upload File
                </button>
                <button type="button" onClick={() => setSubMode('text')}
                  className={`px-4 py-2 text-label-sm font-semibold rounded-md transition-all ${subMode === 'text' ? 'bg-surface shadow-sm text-ink-primary' : 'text-ink-muted'}`}>
                  Type Answer
                </button>
              </div>

              {subMode === 'file' ? (
                <div>
                  <label className="label">Upload File <span className="text-ink-muted font-normal">({formatLabels})</span></label>
                  {uploading ? (
                    <div className="p-6 rounded-xl border bg-surface-low border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <p className="text-label-md font-medium text-ink-primary">Uploading {file?.name}…</p>
                      </div>
                      <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-label-sm text-ink-muted mt-1.5 text-right">{progress}%</p>
                    </div>
                  ) : (
                    <div
                      className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary-50/20 rounded-xl p-8 text-center cursor-pointer transition-all"
                      onClick={() => inputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        accept={acceptAttr}
                        className="hidden"
                        onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])}
                      />
                      {file ? (
                        <>
                          <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                          <p className="font-semibold text-ink-primary">{file.name}</p>
                          <p className="text-label-sm text-ink-muted mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB — Click to change</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                          <p className="font-medium text-ink-primary text-sm">Drop file here or <span className="text-primary">Browse</span></p>
                          <p className="text-label-sm text-ink-muted mt-1.5">Accepted: {formatLabels} · Max 50MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label">Type your answer</label>
                  <textarea
                    className="input resize-y min-h-[200px]"
                    placeholder="Write your response here..."
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    disabled={uploading}
                  />
                  <p className="text-label-sm text-ink-muted mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4" /> This will be saved as a text file to your cloud storage.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Graded state */}
          {isGraded && (
            <div className="p-4 bg-surface-low border border-border rounded-xl">
              <p className="text-ink-secondary">This assignment has already been graded. You cannot submit new work.</p>
              <button type="button" onClick={() => handleViewFile(fileUrl)}
                className="btn btn-secondary btn-sm mt-3 gap-1">
                View Your Submission <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Submit button — shown only when upload area is visible */}
          {!isSubmitted && !isGraded && !isPastDeadline && (
            <div className="flex justify-end mt-4">
              <button type="submit" className="btn-primary" disabled={submitting || uploading}>
                {submitting || uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                ) : 'Submit Assignment'}
              </button>
            </div>
          )}
        </form>
      </main>

      {/* Floating Proctoring Widget */}
      {isProctoringActive && (
        <div className="fixed bottom-6 right-6 w-48 bg-surface border border-border shadow-2xl rounded-xl overflow-hidden z-50">
          <div className="bg-primary-950 px-3 py-2 flex items-center justify-between">
            <span className="text-white text-xs font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary-400" /> Proctoring
            </span>
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse-dot" />
          </div>
          <div className="relative h-32 bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover -scale-x-100" 
            />
          </div>
          <div className="px-3 py-2 bg-surface-low border-t border-border flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-ink-secondary">{faceStatus}</span>
            {warnings > 0 && (
              <span className="text-[10px] font-semibold text-danger">Violations: {warnings}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
