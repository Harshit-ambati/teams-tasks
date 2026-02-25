import axiosClient from './axios';

export const resourceRequestApi = {
  create: (payload) => axiosClient.post('/resource-requests', payload),
  getByProject: (projectId) => axiosClient.get(`/resource-requests/project/${projectId}`),
  getByDepartment: () => axiosClient.get('/resource-requests/department'),
  approve: (id, payload) => axiosClient.patch(`/resource-requests/${id}/approve`, payload),
  reject: (id) => axiosClient.patch(`/resource-requests/${id}/reject`, {}),
};
