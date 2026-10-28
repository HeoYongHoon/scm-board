// client/src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// 요청 헤더에 JWT 토큰 자동 탑재
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;