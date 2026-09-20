import api from '../api/axios';
import { registerDevice } from './deviceService';
import {
  getDevicePublicKeyBase64,
  signWithDeviceKey,
  sha256Hex,
  generateUUID,
  prepareVaultPayload,
  unlockVaultLocally,
} from './vaultCryptoService';

const SESSION_STORAGE_KEYS = {
  TOKEN: 'boveda_vault_session_token',
  DEVICE_ID: 'boveda_vault_device_id',
  USER_ID: 'boveda_vault_user_id',
  EXPIRES_AT: 'boveda_vault_expires_at',
};

/**
 * Retorna los datos de la sesión de bóvedas si existen y están vigentes.
 */
export function getVaultSessionData() {
  const token = localStorage.getItem(SESSION_STORAGE_KEYS.TOKEN);
  const deviceId = localStorage.getItem(SESSION_STORAGE_KEYS.DEVICE_ID);
  const userId = localStorage.getItem(SESSION_STORAGE_KEYS.USER_ID);
  const expiresAt = parseInt(localStorage.getItem(SESSION_STORAGE_KEYS.EXPIRES_AT) || '0', 10);

  return { token, deviceId, userId, expiresAt };
}

/**
 * Comprueba si hay una sesión de bóveda activa y no expirada.
 */
export function hasActiveVaultSession() {
  const { token, expiresAt } = getVaultSessionData();
  return Boolean(token && Date.now() < expiresAt);
}

/**
 * Limpia los tokens de la sesión de bóvedas del almacenamiento local.
 */
export function clearVaultSession() {
  localStorage.removeItem(SESSION_STORAGE_KEYS.TOKEN);
  localStorage.removeItem(SESSION_STORAGE_KEYS.DEVICE_ID);
  localStorage.removeItem(SESSION_STORAGE_KEYS.USER_ID);
  localStorage.removeItem(SESSION_STORAGE_KEYS.EXPIRES_AT);
}

/**
 * Abre una sesión de acceso a bóvedas (15 minutos) mediante MFA (TOTP).
 * Registra y autoriza primero el hardware local si es necesario.
 */
export async function openVaultSession(totpCode) {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No se encontró sesión de usuario. Inicie sesión nuevamente.');
  }

  // Asegurar que el dispositivo actual y su clave pública estén sincronizados y confiables
  try {
    await registerDevice(true);
  } catch (err) {
    console.warn('Registro de dispositivo pre-sesión omitido o con advertencia:', err);
  }

  const publicKey = getDevicePublicKeyBase64();

  const response = await api.post('/vaults/session', {
    refresh_token: refreshToken,
    code: totpCode.trim(),
    public_key: publicKey,
  });

  const { access_token, id_dispositivo, id_usuario, expires_in } = response.data;
  const expiresAt = Date.now() + (expires_in || 900) * 1000;

  localStorage.setItem(SESSION_STORAGE_KEYS.TOKEN, access_token);
  localStorage.setItem(SESSION_STORAGE_KEYS.DEVICE_ID, id_dispositivo);
  localStorage.setItem(SESSION_STORAGE_KEYS.USER_ID, id_usuario);
  localStorage.setItem(SESSION_STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

  return {
    token: access_token,
    deviceId: id_dispositivo,
    userId: id_usuario,
    expiresAt,
  };
}

/**
 * Ejecuta una petición HTTP firmada con la clave privada Ed25519 del dispositivo.
 */
async function signedVaultRequest(method, relativePath, body = null, idempotencyKey = null) {
  const session = getVaultSessionData();
  if (!session.token || Date.now() >= session.expiresAt) {
    clearVaultSession();
    const err = new Error('La sesión de bóvedas ha expirado o requiere autenticación MFA.');
    err.code = 'VAULT_SESSION_EXPIRED';
    throw err;
  }

  // 1. Extraer jti del token JWT
  const jwtParts = session.token.split('.');
  if (jwtParts.length !== 3) {
    throw new Error('Token de sesión de bóvedas corrupto.');
  }
  const normalizedB64 = jwtParts[1].replace(/-/g, '+').replace(/_/g, '/');
  const jwtPayload = JSON.parse(atob(normalizedB64));
  const jti = jwtPayload.jti;

  // 2. Timestamp actual (segundos)
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // 3. Ruta completa en el backend
  const serverPath = `/api/v1${relativePath}`;

  // 4. Digest SHA-256 del cuerpo exacto
  const bodyStr = body ? JSON.stringify(body) : '';
  const digest = await sha256Hex(bodyStr);

  // 5. Cadena de mensaje canónico para firma Ed25519:
  // jti \n timestamp \n method \n serverPath \n idempotencyKey \n digest
  const canonicalMessage = [
    jti,
    timestamp,
    method.toUpperCase(),
    serverPath,
    idempotencyKey || '',
    digest,
  ].join('\n');

  const encoder = new TextEncoder();
  const signature = signWithDeviceKey(encoder.encode(canonicalMessage));

  // 6. Encabezados de seguridad
  const headers = {
    Authorization: `Bearer ${session.token}`,
    'X-Vault-Timestamp': timestamp,
    'X-Vault-Signature': signature,
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  try {
    const res = await api.request({
      method,
      url: relativePath,
      data: bodyStr || undefined,
      headers,
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      clearVaultSession();
    }
    const message = err.response?.data?.detail || err.message || 'Error en petición de bóvedas';
    const errorObj = new Error(message);
    errorObj.status = err.response?.status;
    throw errorObj;
  }
}

/**
 * Consulta la lista de bóvedas cifradas del usuario.
 */
export async function listVaults() {
  const data = await signedVaultRequest('GET', '/vaults');
  return data.items || [];
}

/**
 * Consulta el sobre criptográfico de una bóveda específica.
 */
export async function getVault(vaultId) {
  return await signedVaultRequest('GET', `/vaults/${vaultId}`);
}

/**
 * CU-06: Crea una nueva bóveda cifrada de conocimiento cero.
 */
export async function createVault({ name, description, masterPassword, onProgress }) {
  const session = getVaultSessionData();
  if (!session.token || Date.now() >= session.expiresAt) {
    const err = new Error('Se requiere una sesión activa con MFA para crear bóvedas.');
    err.code = 'VAULT_SESSION_EXPIRED';
    throw err;
  }

  if (onProgress) onProgress('Preparando llaves criptográficas y derivación Argon2id...');

  const payload = await prepareVaultPayload({
    name,
    description,
    masterPassword,
    deviceId: session.deviceId,
    userId: session.userId,
  });

  if (onProgress) onProgress('Firmando petición con hardware local (Ed25519)...');

  const idempotencyKey = `idemp-${generateUUID()}-${Date.now()}`;

  if (onProgress) onProgress('Registrando bóveda cifrada en el servidor...');

  const created = await signedVaultRequest('POST', '/vaults', payload, idempotencyKey);
  return created;
}

/**
 * Desbloquea y descifra localmente una bóveda en memoria del cliente.
 */
export async function unlockVault(vault, masterPassword) {
  const session = getVaultSessionData();
  return await unlockVaultLocally({
    vault,
    masterPassword,
    deviceId: session.deviceId,
    userId: session.userId,
  });
}
