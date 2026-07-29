// ── Request Service ───────────────────────────────────────────────────────────
import api from './api';

/** Student: fetch own requests */
export async function getMyRequests() {
  const { data } = await api.get('/requests');
  return data; // StudentRequest[]
}

/** Teacher/Admin: fetch all requests */
export async function getAllRequests() {
  const { data } = await api.get('/requests');
  return data;
}

/** Teacher/Admin: fetch summary stats */
export async function getRequestStats() {
  const { data } = await api.get('/requests/stats');
  return data;
}

/**
 * Student: submit a new request.
 * @param {{ type, reason, priority, assignment_id?, submission_id?, new_deadline? }} payload
 */
export async function submitRequest(payload) {
  const { data } = await api.post('/requests', payload);
  return data;
}

/**
 * Teacher/Admin: update request status + optional comment.
 * @param {string} id
 * @param {{ status, teacher_comment?, new_deadline? }} payload
 */
export async function resolveRequest(id, payload) {
  const { data } = await api.patch(`/requests/${id}`, payload);
  return data;
}

/**
 * Student: retract a pending request.
 * @param {string} id
 */
export async function retractRequest(id) {
  const { data } = await api.delete(`/requests/${id}`);
  return data;
}
