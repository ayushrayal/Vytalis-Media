import axios from 'axios';

export const API_URL =
  import.meta.env.MODE === "production"
    ? ""
    : "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
      console.log('[Axios Interceptor] URL:', config.url);
      console.log('[Axios Interceptor] Auth Header Present:', config.headers['Authorization'] ? 'YES' : 'NO');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
