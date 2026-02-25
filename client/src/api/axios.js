import axios from 'axios';
import { clearAuth, getToken } from '../utils/authStorage';

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuth();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Request failed';

    return Promise.reject(new Error(message));
  }
);

export default axiosClient;
