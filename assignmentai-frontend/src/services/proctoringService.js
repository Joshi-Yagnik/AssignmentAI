import api from './api';

export const logSecurityViolation = (payload) => {
  return api.post('/reports/security-logs', payload).then(res => res.data);
};
