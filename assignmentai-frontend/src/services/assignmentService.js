import { api } from './api';

// ── STUDENT: Assignments ─────────────────────────────────────────────────────

/** Fetch all assignments visible to the logged-in student */
export const getStudentAssignments = () =>
  api.get('/assignments/student').then(r => r.data);

/** Fetch a single assignment with its details */
export const getAssignmentById = (id) =>
  api.get(`/assignments/${id}`).then(r => r.data);

// ── TEACHER: Assignments ─────────────────────────────────────────────────────

/** Fetch all assignments (Admins see all, Teachers see their own) */
export const getAssignments = () =>
  api.get('/assignments').then(r => r.data);

/** Create a new assignment (JSON payload — PDFs uploaded separately via storage) */
export const createAssignment = (body) =>
  api.post('/assignments', body).then(r => r.data);

/** Update assignment */
export const updateAssignment = (id, body) =>
  api.put(`/assignments/${id}`, body).then(r => r.data);

/** Delete assignment */
export const deleteAssignment = (id) =>
  api.delete(`/assignments/${id}`).then(r => r.data);

// ── STORAGE: PDF Uploads ─────────────────────────────────────────────────────

/**
 * Get a pre-signed upload URL from the backend.
 * @param {{ bucket: string, filename: string, contentType: string }} params
 */
export const getUploadUrl = (params) =>
  api.post('/storage/upload-url', params).then(r => r.data);

/**
 * Upload a file directly to Supabase Storage via a signed URL.
 * @param {string} signedUrl
 * @param {File} file
 * @param {function} onProgress — receives 0-100
 */
export async function uploadFileToStorage(signedUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

/**
 * Get a secure signed download URL for a private file.
 * @param {{ bucket: string, path: string }} params
 */
export const getDownloadUrl = (params) =>
  api.post('/storage/download-url', params).then(r => r.data);

// ── SUBMISSIONS ──────────────────────────────────────────────────────────────

/**
 * Create or update a submission record.
 * @param {{ assignment_id, file_url, typed_answer, submission_type }} body
 */
export const createSubmission = (body) =>
  api.post('/submissions', body).then(r => r.data);

/** Get all submissions for the logged-in student */
export const getMySubmissions = () =>
  api.get('/submissions/me').then(r => r.data);

/** Get a single submission by ID */
export const getSubmissionById = (id) =>
  api.get(`/submissions/${id}`).then(r => r.data);

/** Get pending submissions (for Teacher/Admin) */
export const getPendingSubmissions = () =>
  api.get('/submissions/pending').then(r => r.data);
