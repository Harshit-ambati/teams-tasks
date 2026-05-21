import axiosClient from './axios';

export const userApi = {
  getAll: () => axiosClient.get('/users'),
  getMe: () => axiosClient.get('/users/me'),
  changeMyPassword: (payload) => axiosClient.patch('/users/me/password', payload),
};
