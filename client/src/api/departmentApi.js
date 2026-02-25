import axiosClient from './axios';

export const departmentApi = {
  getAll: () => axiosClient.get('/departments'),
  create: (payload) => axiosClient.post('/departments', payload),
  update: (id, payload) => axiosClient.patch(`/departments/${id}`, payload),
};
