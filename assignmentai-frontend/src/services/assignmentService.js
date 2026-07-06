// ── Assignment Service ────────────────────────────────────────────────────────
import api from './api';

/** Student: fetch all assignments for the logged-in student */
export async function getMyAssignments() {
  const { data } = await api.get('/assignments/my');
  return data; // Assignment[]
}

/** Teacher: fetch all assignments across their courses */
export async function getAssignments() {
  const { data } = await api.get('/assignments');
  return data; // Assignment[]
}

/** Teacher: fetch courses summary */
export async function getMyCourses() {
  const { data } = await api.get('/courses/my');
  return data; // Course[]
}

/** Teacher: fetch pending submissions across all courses */
export async function getPendingSubmissions() {
  const { data } = await api.get('/submissions/pending');
  return data; // Submission[]
}

/**
 * Teacher: create / deploy a new assignment.
 * @param {FormData|object} payload
 */
export async function createAssignment(payload) {
  const isFormData = payload instanceof FormData;
  const { data } = await api.post('/assignments', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return data; // created Assignment
}

/**
 * Student: submit an assignment.
 * @param {string} assignmentId
 * @param {FormData} formData — includes 'file' + optional 'notes'
 */
export async function submitAssignment(assignmentId, formData) {
  const { data } = await api.post(`/assignments/${assignmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Teacher: confirm/override AI grade for a submission.
 * @param {string} submissionId
 * @param {{ finalGrade: number, remarks: string, notify: boolean }} payload
 */
export async function gradeSubmission(submissionId, payload) {
  const { data } = await api.patch(`/submissions/${submissionId}/grade`, payload);
  return data;
}
