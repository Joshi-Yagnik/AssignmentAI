import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import {
  Upload, FileText, CheckCircle2, Loader2, ArrowLeft,
  Calendar, Info, AlertCircle, X, ExternalLink
} from 'lucide-react';
import {
  getAssignmentById, getUploadUrl, uploadFileToStorage,
  createSubmission, getSubmissionById, getDownloadUrl
} from '../../services/assignmentService';

export default function StudentSubmissionPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Submission mode: 'file' or 'text'
  const [subMode, setSubMode] = useState('file');
  const [typedAnswer, setTypedAnswer] = useState('');
  
  // File upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState('');
  
  // Overall submit state
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // We'll fetch the assignment details
        const data = await getAssignmentById(assignmentId);
        setAssignment(data);
        
        // If there's already a submission, we could load it here
        // (Assuming the API returns it nested or we fetch it separately)
        if (data.submission) {
          setFileUrl(data.submission.file_url);
        }
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
      // Fetch a secure signed URL that expires shortly
      const { signedUrl } = await getDownloadUrl({ bucket: 'submissions', path: pathUrl });
      window.open(signedUrl, '_blank');
    } catch (err) {
      toast({ type: 'error', title: 'Failed to generate secure link' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && subMode === 'file' && !fileUrl) {
      return toast({ type: 'warning', title: 'Please select a file to upload' });
    }
    if (!typedAnswer.trim() && subMode === 'text' && !fileUrl) {
      return toast({ type: 'warning', title: 'Please type your answer' });
    }

    setSubmitting(true);
    try {
      let finalFileUrl = fileUrl;

      // If they are uploading a new file or text, push to storage first
      if (!finalFileUrl) {
        let uploadFile = file;
        
        if (subMode === 'text') {
          // Convert text to a .txt file blob
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
        finalFileUrl = path; // store internal path, not public URL
        setFileUrl(path);
        setUploading(false);
      }

      // Record submission in DB
      await createSubmission({
        assignment_id: assignmentId,
        file_url: finalFileUrl
      });

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

  const isGraded = assignment.submission?.status === 'graded';
  const score = assignment.submission?.ai_reports?.[0]?.final_score;

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
        
        {/* Details Card */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-headline-sm text-ink-primary">{assignment.title}</h1>
              <p className="text-label-md text-ink-secondary mt-1">
                {assignment.subjects?.name} ({assignment.subjects?.code})
              </p>
            </div>
            {isGraded && (
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-success" />
                <div>
                  <p className="text-label-sm text-success font-semibold">Graded</p>
                  <p className="text-headline-sm text-success leading-none">{score}/100</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 py-3 border-y border-border">
            <div className="flex items-center gap-2 text-label-sm font-medium text-ink-secondary">
              <Calendar className="w-4 h-4 text-primary" />
              Due: {new Date(assignment.deadline).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 text-label-sm font-medium text-ink-secondary">
              <FileText className="w-4 h-4 text-primary" />
              {assignment.total_questions} Questions
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

        {/* Submission Card */}
        <form className="card flex flex-col gap-6" onSubmit={handleSubmit}>
          <p className="text-label-sm font-semibold text-primary uppercase tracking-widest">Your Work</p>
          
          {fileUrl && !isGraded ? (
             <div className="flex items-center justify-between p-4 rounded-xl border bg-success/5 border-success/30">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                   <CheckCircle2 className="w-5 h-5 text-success" />
                 </div>
                 <div>
                   <p className="font-semibold text-ink-primary text-sm">Submission recorded</p>
                   <p className="text-label-sm text-ink-muted">You have already submitted work for this assignment.</p>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <button type="button" onClick={() => handleViewFile(fileUrl)} className="btn btn-ghost btn-sm text-primary">
                   View Securely <ExternalLink className="w-4 h-4 ml-1" />
                 </button>
                 <button type="button" className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" 
                    onClick={() => { setFileUrl(''); setFile(null); setTypedAnswer(''); }}>
                   Replace
                 </button>
               </div>
             </div>
          ) : !isGraded ? (
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
                  <label className="label">Upload PDF or DOCX</label>
                  {uploading ? (
                     <div className="p-6 rounded-xl border bg-surface-low border-border">
                       <div className="flex items-center gap-3 mb-3">
                         <Loader2 className="w-5 h-5 text-primary animate-spin" />
                         <p className="text-label-md font-medium text-ink-primary">Uploading {file?.name}…</p>
                       </div>
                       <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden">
                         <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: \`\${progress}%\` }} />
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
                      <input ref={inputRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                        onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])} />
                      
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
                          <p className="text-label-sm text-ink-muted mt-1.5">Max 50MB</p>
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
          ) : (
            <div className="p-4 bg-surface-low border border-border rounded-xl">
              <p className="text-ink-secondary">This assignment has already been graded. You cannot submit new work.</p>
            </div>
          )}
          
          {!isGraded && (
            <div className="flex justify-end mt-4">
               <button type="submit" className="btn-primary" disabled={submitting || uploading}>
                 {submitting || uploading ? (
                   <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                 ) : (
                   'Submit Assignment'
                 )}
               </button>
            </div>
          )}
        </form>
      </main>
    </>
  );
}
