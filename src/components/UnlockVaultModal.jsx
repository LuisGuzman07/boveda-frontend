import React, { useState, useEffect, useRef } from 'react';
import {
  LockOpen,
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  KeyRound,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  HardDrive,
  FileText,
  Image,
  FileArchive,
  FileCode,
  File,
  Plus,
} from 'lucide-react';
import {
  hasActiveVaultSession,
  openVaultSession,
  getVault,
  unlockVault,
  clearVaultSession,
  listVaultFiles,
  uploadVaultFile,
  downloadAndDecryptVaultFile,
  deleteVaultFile,
  decryptFilename,
} from '../services/vaultService';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return <Image size={18} color="#38bdf8" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return <FileText size={18} color="#f472b6" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive size={18} color="#fbbf24" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'json', 'html', 'css'].includes(ext)) {
    return <FileCode size={18} color="#34d399" />;
  }
  return <File size={18} color="#94a3b8" />;
}

export default function UnlockVaultModal({
  isOpen,
  vault,
  initialUnlockedData = null,
  onClose,
  onUnlocked,
  onLock,
}) {
  const [masterPassword, setMasterPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [cryptoStep, setCryptoStep] = useState('');
  const [error, setError] = useState(null);
  const [decryptedResult, setDecryptedResult] = useState(null);

  // File explorer states
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setHasSession(hasActiveVaultSession());
      setMasterPassword('');
      setTotpCode('');
      setError(null);
      setCryptoStep('');
      setUploadStatus('');

      if (initialUnlockedData) {
        setDecryptedResult(initialUnlockedData);
      } else {
        setDecryptedResult(null);
        setFiles([]);
      }
    }
  }, [isOpen, vault, initialUnlockedData]);

  const loadFiles = async () => {
    if (!vault?.id_boveda) return;
    setLoadingFiles(true);
    setError(null);
    try {
      const res = await listVaultFiles(vault.id_boveda);
      const items = res.items || [];
      const decryptedItems = await Promise.all(
        items.map(async (item) => {
          let clearName = null;
          if (item.clave_archivo_envuelta && item.nombre_cifrado) {
            clearName = await decryptFilename({
              vaultId: vault.id_boveda,
              versionId: item.id_version_archivo,
              encryptedNameEnvelope: item.nombre_cifrado,
              wrappedKeyEnvelope: item.clave_archivo_envuelta,
            });
          }
          return {
            ...item,
            decryptedFilename: clearName || `Archivo ${item.id_archivo?.slice(0, 8)}...`,
          };
        })
      );
      setFiles(decryptedItems);
    } catch (err) {
      console.error('Error al listar archivos de la bóveda:', err);
      setError(err.message || 'Error al listar los archivos de la bóveda.');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (decryptedResult && vault?.id_boveda) {
      loadFiles();
    }
  }, [decryptedResult, vault?.id_boveda]);

  if (!isOpen || !vault) return null;

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError(null);

    if (!masterPassword) {
      setError('Ingresa la contraseña maestra de la bóveda.');
      return;
    }

    if (!hasSession && (!totpCode || totpCode.trim().length !== 6)) {
      setError('Ingresa el código TOTP de 6 dígitos de tu aplicación Bóveda Authenticator.');
      return;
    }

    setLoading(true);

    try {
      if (!hasSession) {
        setCryptoStep('Autorizando hardware con TOTP 2FA...');
        await openVaultSession(totpCode);
        setHasSession(true);
      }

      setCryptoStep('Obteniendo sobre criptográfico del servidor...');
      const fullVault = vault.clave_envuelta ? vault : await getVault(vault.id_boveda);

      setCryptoStep('Desbloqueando sobre local y derivando clave Argon2id...');
      const decrypted = await unlockVault(fullVault, masterPassword);

      setDecryptedResult(decrypted);
      setCryptoStep('');
      onUnlocked?.(decrypted);
    } catch (err) {
      console.error('Error al desbloquear bóveda:', err);
      setError(err.message || 'Error al desbloquear la bóveda. Verifica la contraseña maestra.');
      setCryptoStep('');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setUploadStatus(`Cifrando localmente "${file.name}" con AES-256-GCM...`);

    try {
      setUploadStatus(`Almacenando ciphertext cifrado en MinIO local...`);
      await uploadVaultFile(vault.id_boveda, file);
      setUploadStatus(`¡"${file.name}" cifrado y guardado con éxito!`);
      await loadFiles();
      setTimeout(() => setUploadStatus(''), 3500);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setError(err.message || 'Error al cifrar o almacenar el archivo.');
      setUploadStatus('');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploading) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDownload = async (fileItem) => {
    setError(null);
    setDownloadingId(fileItem.id_version_archivo);
    try {
      await downloadAndDecryptVaultFile(
        vault.id_boveda,
        fileItem.id_version_archivo,
        fileItem
      );
    } catch (err) {
      console.error('Error al descargar y descifrar archivo:', err);
      setError(err.message || 'Error al descargar y descifrar el archivo.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (fileItem) => {
    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${fileItem.decryptedFilename}" de la bóveda?`)) {
      return;
    }
    setError(null);
    setDeletingId(fileItem.id_archivo);
    try {
      await deleteVaultFile(vault.id_boveda, fileItem.id_archivo);
      await loadFiles();
    } catch (err) {
      console.error('Error al eliminar archivo:', err);
      setError(err.message || 'Error al eliminar el archivo.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLockVault = () => {
    onLock?.(vault.id_boveda);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={loading || uploading ? undefined : onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: decryptedResult ? '860px' : '540px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div className="modal-title-group">
            <span className="modal-icon">
              {decryptedResult ? <LockOpen size={20} color="#34d399" /> : <Lock size={20} />}
            </span>
            <div>
              <h3>
                {decryptedResult
                  ? `Bóveda Descifrada: ${decryptedResult.name}`
                  : 'Desbloquear Bóveda Cifrada'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ID: {vault.id_boveda?.slice(0, 8)}... | Criptografía Cero Conocimiento v{vault.version_criptografica || 1} | MinIO Local
              </p>
            </div>
          </div>
          {!loading && !uploading && (
            <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Notificaciones de Error */}
        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem', flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <p>{error}</p>
          </div>
        )}

        {/* CONTENIDO DESBLOQUEADO: EXPLORADOR DE ARCHIVOS */}
        {decryptedResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {/* Banner de Estado Criptográfico */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '0.65rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#34d399" />
                  <strong style={{ fontSize: '0.9rem', color: '#34d399' }}>
                    Almacenamiento Seguro Activo (MinIO + Cero Conocimiento)
                  </strong>
                </div>
                {decryptedResult.description && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {decryptedResult.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="permission-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <ShieldCheck size={12} /> AES-256-GCM
                </span>
                <span className="permission-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>
                  <HardDrive size={12} /> MinIO Local
                </span>
                <span className="permission-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd' }}>
                  <KeyRound size={12} /> Ed25519 Firmado
                </span>
              </div>
            </div>

            {/* ZONA DE SUBIDA DE ARCHIVOS (CU-08) */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--primary)' : 'rgba(255, 255, 255, 0.18)'}`,
                background: isDragOver ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.75rem',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem', color: isDragOver ? 'var(--primary)' : '#60a5fa' }}>
                <UploadCloud size={38} />
              </div>

              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>
                {uploading ? 'Cifrando y Subiendo Archivo...' : 'Arrastra un archivo aquí o haz clic para subirlo'}
              </h4>

              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {uploading
                  ? uploadStatus || 'Procesando criptografía en cliente...'
                  : 'Cualquier archivo de hasta 100 MB. El archivo se cifra con AES-256-GCM en tu navegador antes de enviarse a MinIO.'}
              </p>

              {uploading && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>{uploadStatus}</span>
                </div>
              )}

              {!uploading && (
                <div style={{ marginTop: '0.85rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Plus size={14} /> Seleccionar Archivo
                  </button>
                </div>
              )}
            </div>

            {/* Mensaje de Éxito de Subida */}
            {uploadStatus && !uploading && (
              <div className="alert-banner success" style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} color="#34d399" />
                <span>{uploadStatus}</span>
              </div>
            )}

            {/* LISTADO DE ARCHIVOS CIFRADOS (CU-09) */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    Archivos en Bóveda
                  </h4>
                  <span className="chip-count chip-success" style={{ fontSize: '0.75rem' }}>
                    {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={loadFiles}
                  disabled={loadingFiles}
                  title="Actualizar lista de archivos"
                  style={{ padding: '0.35rem 0.65rem' }}
                >
                  <RefreshCw size={14} className={loadingFiles ? 'spinner' : ''} />
                  <span>Actualizar</span>
                </button>
              </div>

              {loadingFiles ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2.5rem 1rem',
                    color: 'var(--text-muted)',
                    gap: '0.5rem',
                  }}
                >
                  <div className="spinner" style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '0.85rem' }}>Consultando y descifrando metadatos de archivos...</span>
                </div>
              ) : files.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '0.5rem',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <HardDrive size={36} />
                  </div>
                  <h5 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    No hay archivos en esta bóveda
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Usa el área de arriba para subir tu primer archivo cifrado a MinIO.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Archivo</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tamaño</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fecha</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Proveedor</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.map((file) => {
                          const isDownloading = downloadingId === file.id_version_archivo;
                          const isDeleting = deletingId === file.id_archivo;

                          return (
                            <tr
                              key={file.id_archivo}
                              style={{
                                borderBottom: '1px solid var(--border-subtle)',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              {/* Nombre de archivo descifrado */}
                              <td style={{ padding: '0.75rem 0.85rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <span>{getFileIcon(file.decryptedFilename)}</span>
                                  <div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                                      {file.decryptedFilename}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                      v{file.numero_version} | ID: {file.id_archivo?.slice(0, 8)}...
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Tamaño */}
                              <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {formatBytes(file.tamano_cifrado)}
                              </td>

                              {/* Fecha */}
                              <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                {file.fecha_creacion ? new Date(file.fecha_creacion).toLocaleString() : 'Reciente'}
                              </td>

                              {/* Proveedor de Almacenamiento */}
                              <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                                <span
                                  className="chip-count chip-success"
                                  style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem' }}
                                >
                                  {file.proveedor || 'MINIO'}
                                </span>
                              </td>

                              {/* Acciones: Descargar y Eliminar */}
                              <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleDownload(file)}
                                    disabled={isDownloading || isDeleting}
                                    title="Descargar ciphertext de MinIO y descifrar en memoria"
                                    style={{ padding: '0.35rem 0.65rem' }}
                                  >
                                    {isDownloading ? (
                                      <>
                                        <div className="spinner" style={{ width: '12px', height: '12px' }} />
                                        <span>Descifrando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download size={14} />
                                        <span>Descargar</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleDelete(file)}
                                    disabled={isDownloading || isDeleting}
                                    title="Eliminar archivo de la bóveda"
                                    style={{ padding: '0.35rem 0.55rem', color: '#f87171' }}
                                  >
                                    {isDeleting ? (
                                      <div className="spinner" style={{ width: '12px', height: '12px' }} />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer de Acciones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLockVault}
                title="Cierra y purga las claves de esta bóveda de la memoria"
                style={{ color: '#fbbf24' }}
              >
                <Lock size={14} /> Bloquear Bóveda
              </button>

              <button type="button" className="btn btn-primary" onClick={onClose}>
                Cerrar Explorador
              </button>
            </div>
          </div>
        ) : (
          /* FORMULARIO DE DESBLOQUEO INICIAL CON CONTRASEÑA MAESTRA */
          <form onSubmit={handleUnlock}>
            {/* Banner Zero-Knowledge */}
            <div className="device-zk-banner" style={{ marginBottom: '1rem' }}>
              <div className="zk-icon"><Lock size={22} color="#60a5fa" /></div>
              <div className="zk-text">
                Ingresa tu contraseña maestra para descifrar la clave simétrica de la bóveda localmente mediante Argon2id.
              </div>
            </div>

            {/* TOTP si la sesión no está activa */}
            {!hasSession && (
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '0.5rem',
                  padding: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <KeyRound size={16} color="#93c5fd" />
                  <strong style={{ fontSize: '0.82rem', color: '#93c5fd' }}>
                    Sesión de Bóvedas Expirada (Requiere TOTP)
                  </strong>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Ingresa tu código 2FA de 6 dígitos para renovar la autorización del hardware.
                </p>
                <div className="form-field">
                  <input
                    type="text"
                    className="input-control mfa-code-input"
                    placeholder="000000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            {/* Contraseña Maestra */}
            <div className="form-field" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="unlock-master-password">Contraseña Maestra *</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                id="unlock-master-password"
                type={showPassword ? 'text' : 'password'}
                className="input-control"
                placeholder="Ingresa la contraseña maestra que definiste al crearla"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Progreso */}
            {loading && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <div className="spinner" style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '0.78rem', color: '#34d399' }}>
                  {cryptoStep || 'Descifrando localmente...'}
                </span>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !masterPassword}
              >
                {loading ? 'Descifrando...' : <><LockOpen size={15} /> Desbloquear y Descifrar</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
