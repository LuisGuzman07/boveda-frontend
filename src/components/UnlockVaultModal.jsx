import React, { useState, useEffect } from 'react';
import {
  LockOpen,
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  KeyRound,
} from 'lucide-react';
import {
  hasActiveVaultSession,
  openVaultSession,
  getVault,
  unlockVault,
  clearVaultSession,
} from '../services/vaultService';

export default function UnlockVaultModal({ isOpen, vault, onClose, onUnlocked }) {
  const [masterPassword, setMasterPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [cryptoStep, setCryptoStep] = useState('');
  const [error, setError] = useState(null);
  const [decryptedResult, setDecryptedResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setHasSession(hasActiveVaultSession());
      setMasterPassword('');
      setTotpCode('');
      setError(null);
      setCryptoStep('');
      setDecryptedResult(null);
    }
  }, [isOpen, vault]);

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
      // 1. Iniciar sesión de bóvedas si no está activa
      if (!hasSession) {
        setCryptoStep('Autorizando hardware con TOTP 2FA...');
        await openVaultSession(totpCode);
        setHasSession(true);
      }

      setCryptoStep('Obteniendo sobre criptográfico del servidor...');
      // Obtener el sobre completo si hace falta
      const fullVault = vault.clave_envuelta ? vault : await getVault(vault.id_boveda);

      setCryptoStep('Desbloqueando sobre local y derivando clave Argon2id...');
      const decrypted = await unlockVault(fullVault, masterPassword);

      setDecryptedResult(decrypted);
      setCryptoStep('Bóveda descifrada en memoria local.');
      onUnlocked?.(decrypted);
    } catch (err) {
      clearVaultSession();
      console.error('Error al desbloquear bóveda:', err);
      setError(err.message || 'Error al desbloquear la bóveda. Verifica la contraseña maestra.');
      setCryptoStep('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={loading ? undefined : onClose}>
      <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">{decryptedResult ? <LockOpen size={20} /> : <Lock size={20} />}</span>
            <div>
              <h3>
                {decryptedResult
                  ? `Bóveda Descifrada: ${decryptedResult.name}`
                  : 'Desbloquear Bóveda Cifrada'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ID: {vault.id_boveda?.slice(0, 8)}... | Criptografía Cero Conocimiento v{vault.version_criptografica || 1}
              </p>
            </div>
          </div>
          {!loading && (
            <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <p>{error}</p>
          </div>
        )}

        {/* Resultado descifrado */}
        {decryptedResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="alert-banner success">
              <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} />
              <div>
                <strong>Bóveda descifrada exitosamente en memoria local.</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem' }}>
                  El contenido se descifró exclusivamente en este dispositivo. Las claves nunca se expusieron al servidor.
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.5rem',
                padding: '1rem',
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Nombre de la Bóveda (Texto Claro Local)
                </span>
                <h4 style={{ margin: '0.2rem 0 0 0', color: '#60a5fa', fontSize: '1.15rem' }}>
                  {decryptedResult.name}
                </h4>
              </div>

              {decryptedResult.description && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Descripción Descifrada
                  </span>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    {decryptedResult.description}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                <span className="permission-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <ShieldCheck size={12} /> AES-256-GCM
                </span>
                <span className="permission-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>
                  <Zap size={12} /> Argon2id (64 MB)
                </span>
                <span className="permission-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd' }}>
                  <KeyRound size={12} /> Ed25519 Signed
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Entendido
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de desbloqueo */
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
                <div className="input-group">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="000000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.2rem',
                      textAlign: 'center',
                      letterSpacing: '0.3em',
                    }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Contraseña Maestra */}
            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Contraseña Maestra *</label>
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
                type={showPassword ? 'text' : 'password'}
                className="input-field"
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
