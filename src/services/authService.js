import api from '../api/axios';
import { getDeviceInfo } from './deviceService';

export const loginUser = async (correo, password, confiarDispositivo = false) => {
  const payload = {
    correo,
    password,
    confiar_dispositivo: Boolean(confiarDispositivo),
    dispositivo: getDeviceInfo(confiarDispositivo),
  };
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const verifyLoginMfa = async (mfaToken, code, confiarDispositivo = false) => {
  const payload = {
    mfa_token: mfaToken,
    code,
    confiar_dispositivo: Boolean(confiarDispositivo),
    dispositivo: getDeviceInfo(confiarDispositivo),
  };
  const response = await api.post('/auth/mfa/verify-login', payload);
  return response.data;
};

export const registerUser = async (nombre, correo, password) => {
  const response = await api.post('/auth/register', {
    nombre,
    correo,
    password,
  });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logoutUser = async (refreshToken) => {
  try {
    await api.post('/auth/logout', { refresh_token: refreshToken });
  } catch (err) {
    console.error('Error al notificar logout al backend:', err);
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export const getMfaStatus = async () => {
  const response = await api.get('/auth/mfa/status');
  return response.data;
};

export const setupMfa = async () => {
  const response = await api.post('/auth/mfa/setup');
  return response.data;
};

export const enableMfa = async (code) => {
  const response = await api.post('/auth/mfa/enable', { code });
  return response.data;
};

export const disableMfa = async (password) => {
  const response = await api.post('/auth/mfa/disable', { password });
  return response.data;
};

// CU-03: Recuperación de Cuenta
export const requestPasswordReset = async (correo) => {
  const response = await api.post('/auth/recovery/forgot-password', { correo });
  return response.data;
};

export const validateResetToken = async (token) => {
  const response = await api.get(`/auth/recovery/validate-token?token=${encodeURIComponent(token)}`);
  return response.data;
};

export const resetPassword = async (token, password, dispositivoInfo) => {
  const payload = {
    token,
    password,
    dispositivo: dispositivoInfo || getDeviceInfo(false),
  };
  const response = await api.post('/auth/recovery/reset-password', payload);
  return response.data;
};

