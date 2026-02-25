import axiosClient from './axios';

export const authApi = {
  register: (payload) => axiosClient.post('/auth/register', payload),
  login: (payload) => axiosClient.post('/auth/login', payload),
  me: () => axiosClient.get('/auth/me'),
};
