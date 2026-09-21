import axios from 'axios';

const localHttpHosts = new Set(['localhost', '127.0.0.1']);
const localDevelopmentApiUrl = 'http://localhost:8000/api/v1';
const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token';
const csrfHeaderName = import.meta.env.VITE_CSRF_HEADER_NAME || 'X-CSRF-Token';

export const WEB_AUTH_ENDPOINTS = Object.freeze({
  login: '/auth/web/login',
  verifyMfaLogin: '/auth/web/mfa/verify-login',
  refresh: '/auth/web/refresh',
  logout: '/auth/web/logout',
  inactivityLock: '/auth/web/inactivity-lock',
});

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

const webSessionApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,
});

let accessTokenProvider = () => null;
let refreshedTokenHandler = () => {};
let unauthorizedHandler = () => {};
let refreshPromise = null;

export function setAccessTokenProvider(provider) {
  accessTokenProvider = typeof provider === 'function' ? provider : () => null;
}

export function setRefreshedTokenHandler(handler) {
  refreshedTokenHandler = typeof handler === 'function' ? handler : () => {};
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : () => {};
}

export function getCsrfHeaders() {
  if (typeof document === 'undefined') {
    return {};
  }

  const cookiePrefix = `${encodeURIComponent(csrfCookieName)}=`;
  const csrfCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(cookiePrefix));

  if (!csrfCookie) {
    return {};
  }

  return {
    [csrfHeaderName]: decodeURIComponent(csrfCookie.slice(cookiePrefix.length)),
  };
}

export function refreshWebSession() {
  if (!refreshPromise) {
    refreshPromise = webSessionApi
      .post(WEB_AUTH_ENDPOINTS.refresh, undefined, {
        headers: getCsrfHeaders(),
      })
      .then((response) => {
        const accessToken = response.data?.access_token;
        if (!accessToken) {
          throw new Error('El refresco de sesión no devolvió un token de acceso.');
        }
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function getRequestAccessToken(request) {
  const authorization = request?.headers?.Authorization || request?.headers?.authorization;
  return typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
}

// The AuthContext owns the token; the client only asks for it at request time.
api.interceptors.request.use(
  (config) => {
    const token = accessTokenProvider();
    if (token && !config.skipAuthorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestAccessToken = getRequestAccessToken(originalRequest) || accessTokenProvider();
    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      Boolean(requestAccessToken);

    if (!shouldRefresh) {
      if (error.response?.status === 401 && originalRequest?._retry) {
        unauthorizedHandler(requestAccessToken);
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshWebSession();
      const currentAccessToken = accessTokenProvider();
      if (
        !currentAccessToken ||
        (currentAccessToken !== requestAccessToken && currentAccessToken !== newAccessToken)
      ) {
        return Promise.reject(error);
      }

      refreshedTokenHandler(newAccessToken);
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch {
      unauthorizedHandler(requestAccessToken);
    }

    return Promise.reject(error);
  }
);

export default api;
