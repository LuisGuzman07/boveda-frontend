import api from '../api/axios';

const STORAGE_KEY = 'boveda_trusted_device_id';

/**
 * Obtiene el identificador criptográfico seguro persistente del hardware/navegador local,
 * o genera uno nuevo utilizando la Web Crypto API y lo almacena localmente.
 */
export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    // Generación criptográficamente segura mediante Web Crypto API si está disponible
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      deviceId = `dev-${window.crypto.randomUUID()}`;
    } else {
      deviceId = `dev-${Math.random().toString(36).substring(2, 12)}-${Date.now()}`;
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Detecta el navegador, sistema operativo y tipo de terminal del usuario.
 */
export function detectEnvironment() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? (navigator.userAgentData?.platform || navigator.platform || '') : '';

  // Detección de Sistema Operativo
  let os = 'Desconocido';
  if (/Windows/i.test(ua) || /Win/i.test(platform)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua) || /Mac/i.test(platform)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua) || /Linux/i.test(platform)) os = 'Linux';

  // Detección de Navegador
  let browser = 'Navegador Web';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';

  // Detección de Tipo de Dispositivo
  let type = 'WEB';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) {
    type = 'MOVIL';
  } else {
    type = 'DESKTOP';
  }

  const friendlyName = `${browser} en ${os}`;

  return {
    nombre: friendlyName,
    tipo: type,
    sistema_operativo: os,
    identificador_seguro: getOrCreateDeviceId(),
  };
}

/**
 * Retorna el objeto completo de información del dispositivo para peticiones de autenticación.
 */
export function getDeviceInfo(confiarDispositivo = false) {
  const env = detectEnvironment();
  return {
    ...env,
    confiar_dispositivo: Boolean(confiarDispositivo),
  };
}

/**
 * Consulta la lista de dispositivos vinculados a la cuenta del usuario.
 */
export async function listDevices() {
  const deviceId = getOrCreateDeviceId();
  const response = await api.get('/devices', {
    headers: {
      'X-Device-Id': deviceId,
    },
  });
  return response.data;
}

/**
 * Registra o sincroniza el dispositivo local en el servidor.
 */
export async function registerDevice(confiar = false) {
  const payload = getDeviceInfo(confiar);
  const response = await api.post('/devices/register', payload);
  return response.data;
}

/**
 * Autoriza o revoca el estado de confianza de un dispositivo.
 */
export async function setDeviceTrust(deviceId, esConfiable, nombre = null) {
  const currentId = getOrCreateDeviceId();
  const response = await api.post(
    `/devices/${deviceId}/authorize`,
    {
      es_confiable: Boolean(esConfiable),
      nombre,
    },
    {
      headers: {
        'X-Device-Id': currentId,
      },
    }
  );
  return response.data;
}

/**
 * Revoca el estado de confianza de un dispositivo de forma directa.
 */
export async function revokeDeviceTrust(deviceId) {
  const currentId = getOrCreateDeviceId();
  const response = await api.post(
    `/devices/${deviceId}/revoke-trust`,
    {},
    {
      headers: {
        'X-Device-Id': currentId,
      },
    }
  );
  return response.data;
}

/**
 * Desvincula un dispositivo y revoca sus sesiones.
 */
export async function deleteDevice(deviceId) {
  const response = await api.delete(`/devices/${deviceId}`);
  return response.data;
}

// ==============================================================================
// CU-05: MÉTODOS DE ADMINISTRACIÓN GLOBAL DE TERMINALES (ADMIN)
// ==============================================================================

/**
 * Consulta el inventario global de terminales de todos los usuarios (solo Admin).
 */
export async function listAllDevicesAdmin(params = {}) {
  const response = await api.get('/devices/admin/all', { params });
  return response.data;
}

/**
 * Revocación forzada de un dispositivo y sus sesiones activas (solo Admin).
 */
export async function revokeDeviceAdmin(deviceId, motivo = 'Revocación administrativa por seguridad') {
  const response = await api.post(`/devices/admin/${deviceId}/revoke`, { motivo });
  return response.data;
}

/**
 * Expulsión total de todos los dispositivos de un usuario (solo Admin).
 */
export async function revokeAllUserDevicesAdmin(userId, motivo = 'Revocación total de terminales por seguridad') {
  const response = await api.post(`/devices/admin/user/${userId}/revoke-all`, { motivo });
  return response.data;
}
