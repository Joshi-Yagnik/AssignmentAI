// ── Viva Service ─────────────────────────────────────────────────────────────
import api from './api';

/** Fetch all viva sessions visible to the current user */
export async function getVivaSessions() {
  const { data } = await api.get('/viva/sessions');
  return data; // VivaSession[]
}

/** Fetch a single viva session */
export async function getVivaSession(sessionId) {
  const { data } = await api.get(`/viva/sessions/${sessionId}`);
  return data; // VivaSession
}

/** Fetch questions for a viva session */
export async function getVivaQuestions(sessionId) {
  const { data } = await api.get(`/viva/sessions/${sessionId}/questions`);
  return data; // VivaQuestion[]
}

/**
 * Save/update student's answer for a specific question.
 * @param {string} sessionId
 * @param {string} questionId
 * @param {string} answer
 */
export async function submitVivaAnswer(sessionId, questionId, answer) {
  const { data } = await api.post(`/viva/sessions/${sessionId}/answers`, {
    questionId,
    answer,
  });
  return data;
}

/**
 * End the viva session (final submission).
 * @param {string} sessionId
 * @param {{ reason?: string }} options
 */
export async function endVivaSession(sessionId, options = {}) {
  const { data } = await api.post(`/viva/sessions/${sessionId}/end`, options);
  return data;
}

/**
 * Report a violation event (tab switch, blur, face-not-detected, etc.)
 * @param {string} sessionId
 * @param {string} type — 'tab_switch' | 'blur' | 'face_lost' | 'multi_person'
 */
export async function reportViolation(sessionId, type) {
  try {
    await api.post(`/viva/sessions/${sessionId}/violations`, { type });
  } catch (_) {
    // Best-effort; don't block the UI
  }
}
