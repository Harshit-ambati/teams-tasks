import axiosClient from './axios';

export const userApi = {
  getAll: () => axiosClient.get('/users'),
};
