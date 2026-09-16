import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { setupMfa, enableMfa, disableMfa } from '../services/authService';

export default function MfaModal({ isOpen, onClose, isMfaEnabled, onSuccess }) {
  const [step, setStep] = useState(isMfaEnabled ? 'disable' : 'setup'); // 'setup', 'recovery_codes', 'disable'
  const [setupData, setSetupData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setTotpCode('');
      setPassword('');
      setCopied(false);
      if (isMfaEnabled) {
        setStep('disable');
      } else {
        setStep('setup');
        loadSetup();
      }
    }
  }, [isOpen, isMfaEnabled]);

  const loadSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await setupMfa();
      setSetupData(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al generar clave de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    setError(null);
    if (totpCode.length !== 6) {
      setError('Introduce un código de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const data = await enableMfa(totpCode);
      setRecoveryCodes(setupData?.backup_codes || data.recovery_codes || []);
      setStep('recovery_codes');
    } catch (err) {
      setError(err.response?.data?.detail || 'Código de verificación incorrecto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError('Introduce tu contraseña para confirmar.');
      return;
    }

    setLoading(true);
    try {
      await disableMfa(password);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Contraseña incorrecta.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = () => {
    if (recoveryCodes.length > 0) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleFinishSetup = () => {
    onSuccess?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">📱</span>
            <h3>{step === 'disable' ? 'Desactivar 2FA' : 'Verificación en Dos Pasos'}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* PASO 1: SETUP MFA */}
        {step === 'setup' && (
          <div className="mfa-setup-content">
            <p className="mfa-step-desc">
              Escanea el código QR o ingresa la clave en <strong>Bóveda Authenticator</strong> para vincular tu cuenta:
            </p>

            {loading && !setupData ? (
              <div className="mfa-loading-box">Generando clave de seguridad...</div>
            ) : setupData ? (
              <>
                <div className="mfa-qr-container">
                  <div className="mfa-qr-card">
                    <QRCodeSVG
                      value={setupData.otpauth_url}
                      size={170}
                      bgColor="#ffffff"
                      fgColor="#0a0e17"
                      level="M"
                    />
                  </div>
                  <div className="mfa-secret-box">
                    <span className="mfa-secret-label">Clave manual:</span>
                    <code className="mfa-secret-code">{setupData.secret}</code>
                  </div>
                </div>

                <form onSubmit={handleVerifySetup} className="mfa-verify-form">
                  <div className="form-field">
                    <label htmlFor="totp-code">Código generado por la App Móvil</label>
                    <input
                      id="totp-code"
                      type="text"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="123456"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      className="input-control mfa-code-input"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || totpCode.length !== 6}
                    >
                      {loading ? 'Verificando...' : 'Confirmar y Activar'}
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        )}

        {/* PASO 2: CÓDIGOS DE RECUPERACIÓN */}
        {step === 'recovery_codes' && (
          <div className="mfa-recovery-content">
            <div className="mfa-success-header">
              <span className="mfa-success-icon">✅</span>
              <h4>¡Verificación en dos pasos activada!</h4>
            </div>
            <p className="mfa-step-desc">
              Guarda estos códigos de recuperación en un lugar seguro. Si pierdes acceso a tu aplicación móvil, podrás usarlos para ingresar:
            </p>

            <div className="recovery-codes-grid">
              {recoveryCodes.map((code, index) => (
                <div key={index} className="recovery-code-pill">
                  {code}
                </div>
              ))}
            </div>

            <div className="recovery-actions">
              <button
                type="button"
                className={`btn ${copied ? 'btn-secondary' : 'btn-secondary'}`}
                onClick={handleCopyCodes}
              >
                {copied ? '✅ Códigos copiados' : '📋 Copiar todos'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinishSetup}
              >
                Finalizar
              </button>
            </div>
          </div>
        )}

        {/* DESACTIVAR MFA */}
        {step === 'disable' && (
          <form onSubmit={handleDisable} className="mfa-disable-form">
            <p className="mfa-step-desc">
              Al desactivar la verificación en dos pasos, tu cuenta quedará protegida únicamente con tu contraseña.
            </p>
            <div className="form-field">
              <label htmlFor="disable-password">Confirma tu contraseña</label>
              <input
                id="disable-password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-control"
                required
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--danger)' }}
                disabled={loading || !password}
              >
                {loading ? 'Desactivando...' : 'Desactivar 2FA'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
