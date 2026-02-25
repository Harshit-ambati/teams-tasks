import axiosClient from './axios';

export const auditLogApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return axiosClient.get(`/audit-logs${query ? `?${query}` : ''}`);
  },
  getByProject: (projectId) => axiosClient.get(`/audit-logs/project/${projectId}`),
};
