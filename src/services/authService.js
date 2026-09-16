import api from '../api/axios';

export const loginUser = async (correo, password, dispositivoInfo) => {
  const payload = {
    correo,
    password,
    dispositivo: dispositivoInfo || {
      nombre: 'Navegador Web Frontend',
      tipo: 'WEB',
      sistema_operativo: navigator.platform || 'Web',
      identificador_seguro: getOrCreateDeviceId(),
    },
  };
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const verifyLoginMfa = async (mfaToken, code, dispositivoInfo) => {
  const payload = {
    mfa_token: mfaToken,
    code,
    dispositivo: dispositivoInfo || {
      nombre: 'Navegador Web Frontend',
      tipo: 'WEB',
      sistema_operativo: navigator.platform || 'Web',
      identificador_seguro: getOrCreateDeviceId(),
    },
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

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'web-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}
