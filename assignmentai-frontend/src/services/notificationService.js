import api from './api';

export const getNotifications = () => 
  api.get('/notifications').then(res => res.data);

export const markAsRead = (id) => 
  api.put(`/notifications/${id}/read`).then(res => res.data);

export const markAllAsRead = () => 
  api.put('/notifications/read-all').then(res => res.data);

export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`).then(res => res.data);
