import axiosClient from './axios';

export const taskApi = {
  getAll: () => axiosClient.get('/tasks'),
  getByProject: (projectId) => axiosClient.get(`/tasks/project/${projectId}`),
  create: (payload) => axiosClient.post('/tasks', payload),
  update: (id, payload) => axiosClient.patch(`/tasks/${id}`, payload),
  remove: (id) => axiosClient.delete(`/tasks/${id}`),
};
