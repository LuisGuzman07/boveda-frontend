import nacl from 'tweetnacl';
import { argon2id } from 'hash-wasm';

const KDF_PARAMETERS = {
  algoritmo: 'Argon2id',
  memoria_kib: 65536,
  iteraciones: 3,
  paralelismo: 1,
  longitud: 32,
};

const STORAGE_KEYS = {
  SIGNING_SECRET: 'boveda_ed25519_secret',
  SIGNING_PUBLIC: 'boveda_ed25519_public',
  DEVICE_WRAPPING: 'boveda_device_wrapping_key',
};

// Vault keys are session material only. Device identity persistence below is a
// development browser convenience, not a hardware-security boundary.
let activeVaultKey = null;

// -------------------------------------------------------------
// Base64 & ArrayBuffer Helpers
// -------------------------------------------------------------
export function toBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(base64Str) {
  const binary = atob(base64Str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function randomBytes(length) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

export function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function sha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// -------------------------------------------------------------
// Ed25519 Device Keys Management (TweetNaCl)
// -------------------------------------------------------------
export function getOrCreateDeviceSigningKey() {
  let secretB64 = localStorage.getItem(STORAGE_KEYS.SIGNING_SECRET);
  let publicB64 = localStorage.getItem(STORAGE_KEYS.SIGNING_PUBLIC);

  if (!secretB64 || !publicB64) {
    const keyPair = nacl.sign.keyPair();
    secretB64 = toBase64(keyPair.secretKey);
    publicB64 = toBase64(keyPair.publicKey);
    localStorage.setItem(STORAGE_KEYS.SIGNING_SECRET, secretB64);
    localStorage.setItem(STORAGE_KEYS.SIGNING_PUBLIC, publicB64);
  }

  return {
    secretKey: fromBase64(secretB64),
    publicKey: fromBase64(publicB64),
    publicKeyBase64: publicB64,
  };
}

export function getDevicePublicKeyBase64() {
  return getOrCreateDeviceSigningKey().publicKeyBase64;
}

export function signWithDeviceKey(messageBytes) {
  const { secretKey } = getOrCreateDeviceSigningKey();
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return toBase64(signature);
}

export async function sha256HexBytes(bytes) {
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeDownloadName(name) {
  const cleaned = String(name || 'download.bin')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
    .replace(/^\.+$/, 'download.bin');
  return cleaned.slice(0, 180) || 'download.bin';
}

export async function decryptDownloadedFile({ download, metadata, vaultId }) {
  if (!activeVaultKey) throw new Error('La bóveda debe estar desbloqueada.');
  const ciphertext = fromBase64(download.ciphertext);
  const actualHash = await sha256HexBytes(ciphertext);
  if (actualHash !== String(download.hash_cifrado).toLowerCase()) {
    ciphertext.fill(0);
    throw new Error('La verificación SHA-256 del ciphertext falló.');
  }

  let fileKey = null;
  try {
    fileKey = await decryptAesGcm(
      download.clave_archivo_envuelta,
      activeVaultKey,
      `${vaultId}:file-key:${download.id_version_archivo}:v1`,
    );
    const plaintext = await decryptAesGcm(
      {
        algoritmo: download.algoritmo,
        ciphertext: download.ciphertext,
        nonce: download.nonce_iv,
        tag: download.auth_tag,
      },
      fileKey,
      `${vaultId}:file:${download.id_version_archivo}:v1`,
    );
    let filename = 'download.bin';
    if (metadata?.nombre_cifrado) {
      const nameBytes = await decryptAesGcm(
        metadata.nombre_cifrado,
        fileKey,
        `${vaultId}:filename:${download.id_version_archivo}:v1`,
      );
      filename = safeDownloadName(new TextDecoder().decode(nameBytes));
      nameBytes.fill(0);
    }
    return { plaintext, filename };
  } finally {
    ciphertext.fill(0);
    if (fileKey) fileKey.fill(0);
  }
}

export function clearActiveVaultKey() {
  if (activeVaultKey) activeVaultKey.fill(0);
  activeVaultKey = null;
}

export function hasActiveVaultKey() {
  return activeVaultKey !== null;
}

// -------------------------------------------------------------
// Device Wrapping Key (Outer Envelope)
// -------------------------------------------------------------
export function getOrCreateDeviceWrappingKey(userId) {
  const keyName = userId ? `${STORAGE_KEYS.DEVICE_WRAPPING}_${userId}` : STORAGE_KEYS.DEVICE_WRAPPING;
  let keyB64 = localStorage.getItem(keyName);
  if (!keyB64) {
    const raw = randomBytes(32);
    keyB64 = toBase64(raw);
    localStorage.setItem(keyName, keyB64);
  }
  return fromBase64(keyB64);
}

// -------------------------------------------------------------
// Symmetric Encryption (AES-256-GCM via Web Crypto API)
// -------------------------------------------------------------
export async function encryptAesGcm(dataBytes, keyBytes, aadStr) {
  const nonce = randomBytes(12);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encoder = new TextEncoder();
  const aad = encoder.encode(aadStr);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: aad,
      tagLength: 128,
    },
    key,
    dataBytes
  );

  const fullBytes = new Uint8Array(encryptedBuffer);
  // Web Crypto returns [ciphertext (len - 16 bytes), tag (16 bytes)]
  const ciphertext = fullBytes.slice(0, -16);
  const tag = fullBytes.slice(-16);

  return {
    algoritmo: 'AES-256-GCM',
    ciphertext: toBase64(ciphertext),
    nonce: toBase64(nonce),
    tag: toBase64(tag),
  };
}

export async function decryptAesGcm(envelope, keyBytes, aadStr) {
  if (envelope.algoritmo !== 'AES-256-GCM') {
    throw new Error(`Algoritmo no soportado: ${envelope.algoritmo}`);
  }

  const ciphertext = fromBase64(envelope.ciphertext);
  const nonce = fromBase64(envelope.nonce);
  const tag = fromBase64(envelope.tag);

  // Combine ciphertext + tag for Web Crypto
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const encoder = new TextEncoder();
  const aad = encoder.encode(aadStr);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: aad,
      tagLength: 128,
    },
    key,
    combined
  );

  return new Uint8Array(decryptedBuffer);
}

// -------------------------------------------------------------
// Argon2id Key Derivation (hash-wasm WebAssembly)
// -------------------------------------------------------------
export async function deriveArgon2idKey(password, saltBytes) {
  return await argon2id({
    password,
    salt: saltBytes,
    parallelism: KDF_PARAMETERS.paralelismo,
    iterations: KDF_PARAMETERS.iteraciones,
    memorySize: KDF_PARAMETERS.memoria_kib,
    hashLength: KDF_PARAMETERS.longitud,
    outputType: 'binary',
  });
}

export async function createEmergencyKitPayload({ vaultId, vaultKdfSalt, recoveryPassword }) {
  if (!activeVaultKey) throw new Error('La bóveda debe estar desbloqueada.');
  if (!recoveryPassword || recoveryPassword.length < 12) {
    throw new Error('La contraseña del Emergency Kit debe tener al menos 12 caracteres.');
  }
  const salt = randomBytes(16);
  const derivedKey = await deriveArgon2idKey(recoveryPassword, salt);
  try {
    const envelope = await encryptAesGcm(activeVaultKey, derivedKey, `${vaultId}:emergency-kit:v1`);
    const fingerprintSource = JSON.stringify({
      version_kit: 1,
      version_criptografica: 1,
      kdf_salt: toBase64(salt),
      kdf_parametros: KDF_PARAMETERS,
      sobre_cifrado: envelope,
    });
    return {
      id_kit: generateUUID(),
      id_boveda: vaultId,
      version_kit: 1,
      version_criptografica: 1,
      kdf_salt: toBase64(salt),
      kdf_salt_boveda: vaultKdfSalt,
      kdf_parametros: KDF_PARAMETERS,
      sobre_cifrado: envelope,
      huella_kit: await sha256Hex(fingerprintSource),
      expira_en_dias: 365,
    };
  } finally {
    derivedKey.fill(0);
  }
}

export async function prepareEmergencyRecovery({ kit, vault, recoveryPassword, deviceId, userId }) {
  if (kit.version_kit !== 1 || kit.version_criptografica !== 1) {
    throw new Error('Versión de Emergency Kit no compatible.');
  }
  const kitKey = await deriveArgon2idKey(recoveryPassword, fromBase64(kit.kdf_salt));
  let vaultKey = null;
  let derivedVaultPassword = null;
  try {
    vaultKey = await decryptAesGcm(kit.sobre_cifrado, kitKey, `${vault.id_boveda}:emergency-kit:v1`);
    derivedVaultPassword = await deriveArgon2idKey(recoveryPassword, fromBase64(vault.kdf_salt));
    const passwordEnvelope = await encryptAesGcm(vaultKey, derivedVaultPassword, `${vault.id_boveda}:password:v1`);
    const deviceKey = getOrCreateDeviceWrappingKey(userId);
    try {
      const outer = await encryptAesGcm(
        new TextEncoder().encode(JSON.stringify(passwordEnvelope)),
        deviceKey,
        `${vault.id_boveda}:${deviceId}:device:v1`,
      );
      return { id_kit: kit.id_kit, id_dispositivo: deviceId, clave_envuelta: { ...outer, id_dispositivo: deviceId, version_clave: 1 } };
    } finally {
      deviceKey.fill(0);
    }
  } finally {
    kitKey.fill(0);
    if (vaultKey) vaultKey.fill(0);
    if (derivedVaultPassword) derivedVaultPassword.fill(0);
  }
}

// -------------------------------------------------------------
// CU-06: Create Vault Payload Preparation
// -------------------------------------------------------------
export async function prepareVaultPayload({ name, description, masterPassword, deviceId, userId }) {
  const vaultId = generateUUID();
  const salt = randomBytes(16);
  const vaultKey = randomBytes(32);

  // 1. Derive master key with Argon2id
  const derivedKey = await deriveArgon2idKey(masterPassword, salt);

  try {
    const encoder = new TextEncoder();

    // 2. Wrap vault key with derived key: AAD = `${vaultId}:password:v1`
    const passwordEnvelope = await encryptAesGcm(vaultKey, derivedKey, `${vaultId}:password:v1`);

    // 3. Wrap passwordEnvelope with local device key: AAD = `${vaultId}:${deviceId}:device:v1`
    const deviceKey = getOrCreateDeviceWrappingKey(userId);
    const passwordEnvelopeJsonBytes = encoder.encode(JSON.stringify(passwordEnvelope));
    const deviceEnvelope = await encryptAesGcm(passwordEnvelopeJsonBytes, deviceKey, `${vaultId}:${deviceId}:device:v1`);

    // 4. Encrypt name & description with vaultKey
    const nombreCifrado = await encryptAesGcm(encoder.encode(name.trim()), vaultKey, `${vaultId}:name:v1`);
    let descripcionCifrada = null;
    if (description && description.trim().length > 0) {
      descripcionCifrada = await encryptAesGcm(encoder.encode(description.trim()), vaultKey, `${vaultId}:description:v1`);
    }

    return {
      id_boveda: vaultId,
      nombre_cifrado: nombreCifrado,
      descripcion_cifrada: descripcionCifrada,
      version_criptografica: 1,
      kdf_salt: toBase64(salt),
      kdf_parametros: KDF_PARAMETERS,
      clave_envuelta: {
        ...deviceEnvelope,
        id_dispositivo: deviceId,
        version_clave: 1,
      },
    };
  } finally {
    // Memory hygiene
    vaultKey.fill(0);
    derivedKey.fill(0);
  }
}

// -------------------------------------------------------------
// CU-06: Local Vault Reopening / Decryption
// -------------------------------------------------------------
export async function unlockVaultLocally({ vault, masterPassword, deviceId, userId }) {
  clearActiveVaultKey();
  if (vault.version_criptografica !== 1) {
    throw new Error('Versión criptográfica de bóveda no compatible');
  }

  const vaultId = vault.id_boveda;
  const envelope = vault.clave_envuelta;
  if (!envelope) {
    throw new Error('No se encontró sobre criptográfico para este dispositivo.');
  }

  // 1. Decrypt outer device envelope
  const deviceKey = getOrCreateDeviceWrappingKey(userId);
  const innerBytes = await decryptAesGcm(envelope, deviceKey, `${vaultId}:${deviceId}:device:v1`);

  const decoder = new TextDecoder();
  const innerEnvelope = JSON.parse(decoder.decode(innerBytes));

  // 2. Derive key with Argon2id
  const salt = fromBase64(vault.kdf_salt);
  const derivedKey = await deriveArgon2idKey(masterPassword, salt);

  let vaultKey = null;
  try {
    // 3. Decrypt inner password envelope
    vaultKey = await decryptAesGcm(innerEnvelope, derivedKey, `${vaultId}:password:v1`);

    // 4. Decrypt name and description
    const nameBytes = await decryptAesGcm(vault.nombre_cifrado, vaultKey, `${vaultId}:name:v1`);
    const name = decoder.decode(nameBytes);

    let description = '';
    if (vault.descripcion_cifrada) {
      const descBytes = await decryptAesGcm(vault.descripcion_cifrada, vaultKey, `${vaultId}:description:v1`);
      description = decoder.decode(descBytes);
    }

    activeVaultKey = new Uint8Array(vaultKey);
    return {
      id_boveda: vaultId,
      name,
      description,
      unlockedAt: Date.now(),
    };
  } catch (err) {
    clearActiveVaultKey();
    throw new Error('Contraseña maestra incorrecta o datos corrompidos.');
  } finally {
    derivedKey.fill(0);
    if (vaultKey) vaultKey.fill(0);
  }
}

// CU-08: the per-version key is wrapped by the in-memory vault key. The
// backend receives the wrapped key, never the vault key or the file key.
export async function encryptFileWithActiveVaultKey({ file, vaultId }) {
  if (!activeVaultKey) throw new Error('La bóveda debe estar desbloqueada.');
  const versionId = generateUUID();
  const fileId = generateUUID();
  const fileKey = randomBytes(32);
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  try {
    const content = await encryptAesGcm(fileBytes, fileKey, `${vaultId}:file:${versionId}:v1`);
    const wrappedKey = await encryptAesGcm(fileKey, activeVaultKey, `${vaultId}:file-key:${versionId}:v1`);
    const encryptedName = await encryptAesGcm(
      new TextEncoder().encode(file.name),
      fileKey,
      `${vaultId}:filename:${versionId}:v1`,
    );
    const ciphertextBytes = fromBase64(content.ciphertext);
    return {
      id_archivo: fileId,
      id_version_archivo: versionId,
      nombre_cifrado: encryptedName,
      contenido_cifrado: content,
      clave_archivo_envuelta: wrappedKey,
      tamano_cifrado: ciphertextBytes.length + fromBase64(content.tag).length,
      hash_cifrado: await sha256HexBytes(ciphertextBytes),
    };
  } finally {
    fileKey.fill(0);
    fileBytes.fill(0);
  }
}
