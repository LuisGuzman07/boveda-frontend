import axios from 'axios';

const localHttpHosts = new Set(['localhost', '127.0.0.1']);
const localDevelopmentApiUrl = 'http://localhost:8000/api/v1';

export function resolveApiBaseUrl(
  rawUrl = import.meta.env.VITE_API_URL,
  isDevelopment = import.meta.env.DEV
) {
  const candidate = rawUrl?.trim() || (isDevelopment ? localDevelopmentApiUrl : '');
  if (!candidate) {
    throw new Error('VITE_API_URL debe configurarse con una URL HTTPS fuera de desarrollo local.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    throw new Error('VITE_API_URL debe ser una URL absoluta válida.');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('VITE_API_URL no puede incluir credenciales.');
  }
  if (parsedUrl.protocol === 'https:') {
    return parsedUrl.toString().replace(/\/$/, '');
  }
  if (
    isDevelopment &&
    parsedUrl.protocol === 'http:' &&
    localHttpHosts.has(parsedUrl.hostname)
  ) {
    return parsedUrl.toString().replace(/\/$/, '');
  }

  throw new Error('HTTP solo está permitido para localhost en desarrollo local.');
}

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para inyectar automáticamente el Bearer Token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas y expiración de tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          const newAccessToken = res.data.access_token;
          localStorage.setItem('access_token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
