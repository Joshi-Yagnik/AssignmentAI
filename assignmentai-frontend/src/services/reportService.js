// ── Report Service ────────────────────────────────────────────────────────────
import api from './api';

/** Get full AI grading report for a submission (includes per-question breakdown) */
export async function getAIReport(submissionId) {
  const { data } = await api.get(`/reports/submission/${submissionId}`);
  return data;
}

/**
 * Poll the processing status of a grading job.
 * Returns { status: 'waiting'|'active'|'processing'|'completed'|'failed', progress: 0-100 }
 */
export async function getReportStatus(submissionId) {
  const { data } = await api.get(`/reports/submission/${submissionId}/status`);
  return data;
}

/**
 * Teacher: confirm or override an AI grade and publish to student.
 * @param {string} submissionId
 * @param {{ finalGrade: number, remarks: string, notify: boolean }} payload
 */
export async function confirmGrade(submissionId, payload) {
  const { data } = await api.patch(`/submissions/${submissionId}/grade`, payload);
  return data;
}

/** Admin: system-wide stats */
export async function getAdminStats() {
  const { data } = await api.get('/admin/stats');
  return data;
}

/** Admin: department overview */
export async function getDepartments() {
  const { data } = await api.get('/admin/departments');
  return data;
}

/** Admin: recent platform activity */
export async function getRecentActivity() {
  const { data } = await api.get('/admin/activity');
  return data;
}
