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

/** Submit an answer to a question */
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
 * @param {object} options
 */
export async function endVivaSession(sessionId, options = {}) {
  const { data } = await api.post(`/viva/sessions/${sessionId}/end`, options);
  return data;
}

/**
 * Log a security violation during the viva session
 */
export async function logVivaViolation(sessionId, type) {
  try {
    await api.post(`/viva/sessions/${sessionId}/violations`, { type });
  } catch {
    // best effort logging
  }
}

/** Get next dynamic AI question */
export async function getNextVivaQuestion(sessionId, transcriptMessages, currentQuestionCount) {
  const { data } = await api.post(`/viva/sessions/${sessionId}/next-question`, {
    transcriptMessages,
    currentQuestionCount
  });
  return data;
}

/** Evaluate viva session */
export async function evaluateVivaSession(sessionId, transcriptMessages) {
  const { data } = await api.post(`/viva/sessions/${sessionId}/evaluate`, {
    transcriptMessages
  });
  return data;
}
