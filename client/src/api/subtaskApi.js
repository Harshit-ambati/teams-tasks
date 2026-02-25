import axiosClient from './axios';

export const subtaskApi = {
  create: (payload) => axiosClient.post('/subtasks', payload),
  getByTask: (taskId) => axiosClient.get(`/subtasks/task/${taskId}`),
  update: (id, payload) => axiosClient.patch(`/subtasks/${id}`, payload),
  remove: (id) => axiosClient.delete(`/subtasks/${id}`),
};
