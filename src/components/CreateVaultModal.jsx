import React, { useState, useEffect } from 'react';
import { hasActiveVaultSession, openVaultSession, createVault } from '../services/vaultService';

export default function CreateVaultModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [cryptoStep, setCryptoStep] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setHasSession(hasActiveVaultSession());
      setName('');
      setDescription('');
      setMasterPassword('');
      setConfirmPassword('');
      setTotpCode('');
      setError(null);
      setSuccess(null);
      setCryptoStep('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Cálculo de fortaleza de contraseña
  const calculateStrength = (pwd) => {
    let score = 0;
    if (!pwd) return { score: 0, label: 'Vacía', color: '#64748b' };
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 30, label: 'Débil (mínimo 12 caracteres)', color: '#ef4444' };
    if (score <= 4) return { score: 70, label: 'Aceptable', color: '#f59e0b' };
    return { score: 100, label: 'Excelente (Criptográficamente Fuerte)', color: '#10b981' };
  };

  const strength = calculateStrength(masterPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Debes ingresar un nombre para la bóveda.');
      return;
    }

    if (masterPassword.length < 12) {
      setError('La contraseña maestra debe tener al menos 12 caracteres.');
      return;
    }

    if (masterPassword !== confirmPassword) {
      setError('Las contraseñas maestras no coinciden.');
      return;
    }

    if (!hasSession && (!totpCode || totpCode.trim().length !== 6)) {
      setError('Ingresa el código TOTP de 6 dígitos de tu aplicación de autenticación.');
      return;
    }

    setLoading(true);

    try {
      // 1. Abrir sesión de bóvedas si no está activa
      if (!hasSession) {
        setCryptoStep('Validando segundo factor TOTP y autorizando hardware...');
        await openVaultSession(totpCode);
        setHasSession(true);
      }

      // 2. Crear y cifrar la bóveda
      const created = await createVault({
        name: name.trim(),
        description: description.trim(),
        masterPassword,
        onProgress: (stepText) => setCryptoStep(stepText),
      });

      setSuccess(`¡Bóveda cifrada '${name}' creada exitosamente con arquitectura de Conocimiento Cero!`);
      setCryptoStep('Completado.');

      setTimeout(() => {
        onSuccess?.(created);
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Error al crear bóveda:', err);
      setError(err.message || 'Error al procesar la creación de la bóveda cifrada.');
      setCryptoStep('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={loading ? undefined : onClose}>
      <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🗄️</span>
            <div>
              <h3>Nueva Bóveda Cifrada (CU-06)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cifrado simétrico AES-256-GCM y derivación local Argon2id
              </p>
            </div>
          </div>
          {!loading && (
            <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          )}
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="alert-banner success" style={{ marginBottom: '1rem' }}>
            <span>✅</span>
            <p>{success}</p>
          </div>
        )}

        {/* Banner Zero-Knowledge */}
        <div className="device-zk-banner" style={{ marginBottom: '1.25rem' }}>
          <div className="zk-icon">🛡️</div>
          <div className="zk-text">
            <strong>Arquitectura de Cero Conocimiento:</strong> El nombre, la descripción y la clave maestra de la bóveda se cifran 100% en tu navegador antes de transmitirse. El servidor nunca recibe contraseñas ni contenido en texto claro.
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label">Nombre de la Bóveda *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Documentos Financieros Confidenciales"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              maxLength={120}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label">Descripción Opcional</label>
            <textarea
              className="input-field"
              rows="2"
              placeholder="Notas o propósito de esta bóveda (se cifra en el cliente)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={250}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Autenticación MFA requerida si no hay sesión de bóvedas activa */}
          {!hasSession && (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🔑</span>
                <strong style={{ fontSize: '0.85rem', color: '#93c5fd' }}>
                  Autorización de Bóveda Requerida (TOTP 2FA)
                </strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Para habilitar operaciones criptográficas en este dispositivo, ingresa el código de 6 dígitos generado por tu aplicación Bóveda Authenticator.
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
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    letterSpacing: '0.35em',
                  }}
                  required
                />
              </div>
            </div>
          )}

          {/* Contraseña Maestra de la Bóveda */}
          <div className="input-group" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label">Contraseña Maestra de la Bóveda *</label>
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
              placeholder="Mínimo 12 caracteres alfanuméricos y símbolos"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              disabled={loading}
              required
              minLength={12}
            />

            {/* Medidor de Fortaleza */}
            {masterPassword && (
              <div style={{ marginTop: '0.5rem' }}>
                <div
                  style={{
                    height: '4px',
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${strength.score}%`,
                      background: strength.color,
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                  <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 500 }}>
                    Fortaleza: {strength.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Argon2id (64 MB, 3 iteraciones)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="input-group" style={{ marginBottom: '1.25rem' }}>
            <label className="input-label">Confirmar Contraseña Maestra *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Repite la contraseña maestra exactamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Indicador de proceso criptográfico */}
          {loading && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '0.5rem',
                padding: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#34d399' }}>
                  Procesando Criptografía Local...
                </p>
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {cryptoStep || 'Iniciando operaciones criptográficas...'}
                </p>
              </div>
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
              disabled={loading || masterPassword.length < 12}
            >
              {loading ? 'Cifrando Bóveda...' : '🔒 Cifrar y Crear Bóveda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
