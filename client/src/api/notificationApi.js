import axiosClient from './axios';

export const notificationApi = {
  getAll: () => axiosClient.get('/notifications'),
  create: (payload) => axiosClient.post('/notifications', payload),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`, {}),
};
