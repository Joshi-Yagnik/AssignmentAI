// ── Request Service ───────────────────────────────────────────────────────────
import api from './api';

/** Teacher: fetch all student requests */
export async function getStudentRequests() {
  const { data } = await api.get('/requests');
  return data; // StudentRequest[]
}

/**
 * Teacher: resolve or reject a request.
 * @param {string} id
 * @param {'approved'|'rejected'} status
 * @param {string} [remarks]
 */
export async function resolveRequest(id, status, remarks = '') {
  const { data } = await api.patch(`/requests/${id}`, { status, remarks });
  return data;
}
