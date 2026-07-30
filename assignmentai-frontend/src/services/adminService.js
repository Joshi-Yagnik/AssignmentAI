import { api } from './api';

// ── INSTITUTES ──────────────────────────────────────────────────────────────
export const getInstitutes  = ()         => api.get('/admin/institutes').then(r => r.data);
export const createInstitute = (body)    => api.post('/admin/institutes', body).then(r => r.data);
export const updateInstitute = (id, body)=> api.put(`/admin/institutes/${id}`, body).then(r => r.data);
export const deleteInstitute = (id)      => api.delete(`/admin/institutes/${id}`).then(r => r.data);

// ── DEPARTMENTS ─────────────────────────────────────────────────────────────
export const getDepartments  = ()         => api.get('/admin/departments').then(r => r.data);
export const createDepartment = (body)    => api.post('/admin/departments', body).then(r => r.data);
export const updateDepartment = (id, body)=> api.put(`/admin/departments/${id}`, body).then(r => r.data);
export const deleteDepartment = (id)      => api.delete(`/admin/departments/${id}`).then(r => r.data);

// ── SUBJECTS ────────────────────────────────────────────────────────────────
export const getSubjects  = ()         => api.get('/admin/subjects').then(r => r.data);
export const createSubject = (body)    => api.post('/admin/subjects', body).then(r => r.data);
export const updateSubject = (id, body)=> api.put(`/admin/subjects/${id}`, body).then(r => r.data);
export const deleteSubject = (id)      => api.delete(`/admin/subjects/${id}`).then(r => r.data);

// ── USERS (Teachers & Students) ─────────────────────────────────────────────
export const getUsers       = (role)     => api.get('/admin/users', { params: role ? { role } : {} }).then(r => r.data);
export const createUser     = (body)     => api.post('/admin/users', body).then(r => r.data);
export const updateUser     = (id, body) => api.put(`/admin/users/${id}`, body).then(r => r.data);
export const deleteUser     = (id)       => api.delete(`/admin/users/${id}`).then(r => r.data);
export const bulkUploadUsers = (body)    => api.post('/admin/users/bulk', body).then(r => r.data);

// ── AI ENGINE CONFIG ────────────────────────────────────────────────────────
export const getAiConfig    = ()         => api.get('/admin/config/ai').then(r => r.data);
export const updateAiConfig = (body)     => api.patch('/admin/config/ai', body).then(r => r.data);
export const getAiStats     = ()         => api.get('/admin/ai-stats').then(r => r.data);

// ── SECURITY REPORTS ────────────────────────────────────────────────────────
export const getSecurityLogs   = ()      => api.get('/admin/reports/security-logs').then(r => r.data);
export const getSecurityTrends = ()      => api.get('/admin/reports/security-trends').then(r => r.data);

// ── REPORTS ──────────────────────────────────────────────────────────────────
export const getReportOverview    = ()   => api.get('/admin/reports/overview').then(r => r.data);
export const getReportAssignments = ()   => api.get('/admin/reports/assignments').then(r => r.data);
export const getReportStudents    = ()   => api.get('/admin/reports/students').then(r => r.data);

// ── PLATFORM SETTINGS ───────────────────────────────────────────────────────
export const getSettings    = ()     => api.get('/admin/settings').then(r => r.data);
export const updateSettings = (body) => api.patch('/admin/settings', body).then(r => r.data);

