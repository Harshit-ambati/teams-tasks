import axiosClient from './axios';

export const projectApi = {
  getAll: () => axiosClient.get('/projects'),
  getById: (id) => axiosClient.get(`/projects/${id}`),
  create: (payload) => axiosClient.post('/projects', payload),
  update: (id, payload) => axiosClient.patch(`/projects/${id}`, payload),
  remove: (id) => axiosClient.delete(`/projects/${id}`),
  getTeam: (id) => axiosClient.get(`/projects/${id}/team`),
};
