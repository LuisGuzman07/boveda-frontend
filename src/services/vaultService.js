import api from '../api/axios';
import { registerDevice } from './deviceService';
import {
  signWithDeviceKey,
  sha256Hex,
  generateUUID,
  prepareVaultPayload,
  unlockVaultLocally,
  encryptFileWithActiveVaultKey,
  decryptDownloadedFile,
  decryptFilename,
  hasActiveVaultKey,
  createEmergencyKitPayload,
  prepareEmergencyRecovery,
  clearActiveVaultKey,
} from './vaultCryptoService';

export { clearActiveVaultKey, hasActiveVaultKey, decryptFilename } from './vaultCryptoService';

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
  clearActiveVaultKey();
}

/**
 * Abre una sesión de acceso a bóvedas (15 minutos) mediante MFA (TOTP).
 * Registra y autoriza primero el hardware local si es necesario.
 */
export async function openVaultSession(totpCode) {
  clearVaultSession();
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) {
    throw new Error('No se encontró sesión de usuario. Inicie sesión nuevamente.');
  }

  // Asegurar que el dispositivo actual y su clave pública estén sincronizados y confiables
  await registerDevice(true);
  const installationId = localStorage.getItem('boveda_trusted_device_id');
  if (!installationId) throw new Error('No se encontró la identidad del dispositivo.');

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Device-Id': installationId,
  };
  const devices = await api.get('/devices', { headers });
  const device = devices.data.dispositivos.find((item) => item.es_dispositivo_actual);
  if (!device) throw new Error('No se encontró el dispositivo autenticado.');

  const signChallenge = async (purpose) => {
    const issued = await api.post('/devices/challenge', { proposito: purpose }, { headers });
    const expiresAt = new Date(issued.data.fecha_expiracion);
    const transcript = [
      'boveda-device-challenge-v1',
      issued.data.id_desafio,
      purpose,
      device.id_usuario,
      device.id_dispositivo,
      issued.data.nonce,
      Math.floor(expiresAt.getTime() / 1000).toString(),
    ].join('\n');
    return {
      ...issued.data,
      firma: signWithDeviceKey(new TextEncoder().encode(transcript)),
    };
  };

  const enrollment = await signChallenge('DEVICE_ENROLLMENT');
  await api.post('/devices/challenge/prove', {
    id_desafio: enrollment.id_desafio,
    nonce: enrollment.nonce,
    firma: enrollment.firma,
  }, { headers });

  const challenge = await signChallenge('VAULT_SESSION');
  const response = await api.post('/vaults/session', {
    id_desafio: challenge.id_desafio,
    nonce: challenge.nonce,
    firma: challenge.firma,
  }, { headers });

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
    clearVaultSession();
    throw new Error('Token de sesión de bóvedas corrupto.');
  }
  const normalizedB64 = jwtParts[1].replace(/-/g, '+').replace(/_/g, '/');
  const jwtPayload = JSON.parse(atob(normalizedB64));
  const jti = jwtPayload.jti;

  // 2. Timestamp actual (segundos)
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // 3. Ruta completa en el backend
  const serverPath = `/api/v1${relativePath.split('?')[0]}`;

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
      timeout: 60000,
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      clearVaultSession();
    }
    const rawDetail = err.response?.data?.detail;
    let message = 'Error en petición de bóvedas';
    if (typeof rawDetail === 'string') {
      message = rawDetail;
    } else if (Array.isArray(rawDetail)) {
      message = rawDetail.map((d) => `${d.loc ? d.loc.slice(-1)[0] + ': ' : ''}${d.msg || JSON.stringify(d)}`).join(', ');
    } else if (rawDetail && typeof rawDetail === 'object') {
      message = rawDetail.msg || rawDetail.message || JSON.stringify(rawDetail);
    } else if (err.message) {
      message = err.message;
    }
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

/** Returns encrypted file metadata only; it never downloads or decrypts content. */
export async function listVaultFiles(vaultId, page = 1, pageSize = 25) {
  return signedVaultRequest(
    'GET',
    `/vaults/${vaultId}/files?page=${page}&page_size=${pageSize}`,
  );
}

export async function downloadFile(vaultId, metadata) {
  const versionId = metadata.id_version_archivo;
  const download = await signedVaultRequest(
    'GET',
    `/vaults/${vaultId}/files/${versionId}/download`,
  );
  const { plaintext, filename } = await decryptDownloadedFile({
    download,
    metadata,
    vaultId,
  });
  try {
    const blob = new Blob([plaintext], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return { plaintext, filename };
  } finally {
    plaintext.fill(0);
  }
}
export const downloadAndDecryptVaultFile = (vaultId, versionId, metadata) => downloadFile(vaultId, metadata);

/**
 * CU-06: Crea una nueva bóveda cifrada de conocimiento cero.
 */
export async function createVault({ name, description, masterPassword, onProgress }) {
  clearActiveVaultKey();
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
  try {
    return await unlockVaultLocally({ vault, masterPassword, deviceId: session.deviceId, userId: session.userId });
  } catch (error) {
    clearVaultSession();
    throw error;
  }
}

/** CU-08: Encrypts a browser File before it leaves the device and stores only its ciphertext in MinIO. */
export async function uploadFile(vaultId, file) {
  const body = await encryptFileWithActiveVaultKey({ file, vaultId });
  const idempotencyKey = `file-${generateUUID()}-${Date.now()}`;
  return signedVaultRequest('POST', `/vaults/${vaultId}/files`, body, idempotencyKey);
}
export const uploadVaultFile = uploadFile;

/** CU-11: Eliminación lógica de un archivo cifrado en la bóveda. */
export async function deleteVaultFile(vaultId, fileId, reason = 'Eliminado por el usuario') {
  const idempotencyKey = `del-${generateUUID()}-${Date.now()}`;
  return signedVaultRequest(
    'DELETE',
    `/vaults/${vaultId}/files/${fileId}`,
    { motivo: reason },
    idempotencyKey
  );
}



export async function createEmergencyKit(vaultId, recoveryPassword) {
  const vault = await getVault(vaultId);
  const payload = await createEmergencyKitPayload({
    vaultId,
    vaultKdfSalt: vault.kdf_salt,
    recoveryPassword,
  });
  return signedVaultRequest('POST', `/vaults/${vaultId}/emergency-kit`, payload);
}

export async function exportEmergencyKit(vaultId) {
  return signedVaultRequest('GET', `/vaults/${vaultId}/emergency-kit`);
}

export async function importEmergencyKit(vaultId, kit, recoveryPassword) {
  const session = getVaultSessionData();
  if (kit.id_boveda !== vaultId) throw new Error('El kit no corresponde a esta bóveda.');
  const vault = { id_boveda: vaultId, kdf_salt: kit.kdf_salt_boveda };
  const payload = await prepareEmergencyRecovery({
    kit,
    vault,
    recoveryPassword,
    deviceId: session.deviceId,
    userId: session.userId,
  });
  await signedVaultRequest('POST', `/vaults/${vaultId}/emergency-kit/recover`, payload);
  const recoveredVault = await getVault(vaultId);
  return unlockVaultLocally({
    vault: recoveredVault,
    masterPassword: recoveryPassword,
    deviceId: session.deviceId,
    userId: session.userId,
  });
}

export async function revokeEmergencyKit(vaultId) {
  return signedVaultRequest('POST', `/vaults/${vaultId}/emergency-kit/revoke`);
}

export async function createShare(body) {
  return signedVaultRequest('POST', '/shares', body, `share-${generateUUID()}-${Date.now()}`);
}

export async function listShares(vaultId) {
  const data = await signedVaultRequest('GET', `/shares?vault_id=${vaultId}`);
  return data.items || [];
}

export async function revokeShare(grantId, motivo) {
  return signedVaultRequest('POST', `/shares/${grantId}/revoke`, motivo ? { motivo } : {});
}
