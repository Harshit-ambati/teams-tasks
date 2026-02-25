import axiosClient from './axios';

export const collaborationRequestApi = {
  create: (payload) => axiosClient.post('/collaboration-requests', payload),
  getByTask: (taskId) => axiosClient.get(`/collaboration-requests/task/${taskId}`),
  approve: (id) => axiosClient.patch(`/collaboration-requests/${id}/approve`, {}),
  reject: (id) => axiosClient.patch(`/collaboration-requests/${id}/reject`, {}),
};
