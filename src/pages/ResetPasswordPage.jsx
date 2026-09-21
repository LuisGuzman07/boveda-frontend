import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  User,
  Info,
  Check,
  Circle,
} from 'lucide-react';
import { resetPassword, validateResetToken } from '../services/authService';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [tokenStatus, setTokenStatus] = useState('idle'); // 'idle' | 'checking' | 'valid' | 'invalid'
  const [userEmail, setUserEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const navigate = useNavigate();

  // Validar token automáticamente si viene en URL
  useEffect(() => {
    if (initialToken.trim()) {
      handleCheckToken(initialToken.trim());
    }
  }, [initialToken]);

  const handleCheckToken = async (tok) => {
    if (!tok || tok.trim().length < 10) return;
    setTokenStatus('checking');
    setError(null);

    try {
      const res = await validateResetToken(tok.trim());
      if (res.valid) {
        setTokenStatus('valid');
        setUserEmail(res.correo || '');
      } else {
        setTokenStatus('invalid');
        setError(res.message || 'El enlace de recuperación es inválido o ha expirado.');
      }
    } catch (err) {
      setTokenStatus('invalid');
      setError(
        err.response?.data?.detail ||
        'Error al validar el enlace de recuperación. Puede haber expirado.'
      );
    }
  };

  // Reglas de validación de contraseña
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password && password === confirmPassword;
  const isFormValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setLoading(true);

    try {
      const data = await resetPassword(token.trim(), password);
      setSuccessData(data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Error al restablecer la contraseña.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="auth-brand-icon">
            <RotateCcw size={36} />
          </div>
          <h2>Restablecer Contraseña</h2>
          <p>CU-03: Actualización segura de credenciales</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <p>{error}</p>
          </div>
        )}

        {successData ? (
          <div className="recovery-success-box">
            <div className="alert-banner success">
              <CheckCircle2 size={22} color="#34d399" style={{ flexShrink: 0 }} />
              <div>
                <strong>{successData.message}</strong>
                <p style={{ marginTop: '0.25rem', fontSize: '0.88rem' }}>
                  Se cerraron {successData.sesiones_revocadas} sesión(es) previas por seguridad.
                </p>
              </div>
            </div>

            <div className="zk-guarantee-card">
              <span className="zk-icon">
                <ShieldCheck size={20} />
              </span>
              <div className="zk-text">
                <span className="zk-title">Principio Cero-Conocimiento Garantizado</span>
                <p>{successData.zero_knowledge_notice}</p>
              </div>
            </div>

            <div className="auth-footer" style={{ marginTop: '1.75rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => navigate('/login')}
              >
                Iniciar Sesión con Nueva Contraseña →
              </button>
            </div>
          </div>
        ) : tokenStatus === 'invalid' ? (
          <div className="token-invalid-box">
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              El enlace o código de recuperación que intentas utilizar ha caducado, ya fue
              consumido anteriormente o no es válido.
            </p>
            <Link to="/forgot-password" className="btn btn-primary btn-block">
              Solicitar Nuevo Enlace de Recuperación
            </Link>
            <div className="auth-footer" style={{ marginTop: '1rem' }}>
              <Link to="/login">← Volver al inicio de sesión</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Si no venía token en URL, permitir ingresarlo */}
            {!initialToken && tokenStatus !== 'valid' && (
              <div className="manual-token-field" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  Ingresa tu token de recuperación:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Pega el token aquí..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="input-control"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleCheckToken(token)}
                    disabled={tokenStatus === 'checking' || !token.trim()}
                  >
                    {tokenStatus === 'checking' ? 'Validando...' : 'Verificar'}
                  </button>
                </div>
              </div>
            )}

            {tokenStatus === 'checking' && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Loader2 size={18} className="spinner" />
                <span>Validando vigencia del token de seguridad...</span>
              </div>
            )}

            {(tokenStatus === 'valid' || (initialToken && tokenStatus !== 'invalid')) && (
              <>
                {userEmail && (
                  <div className="account-badge">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User size={15} /> Cuenta a recuperar:
                    </span>
                    <strong>{userEmail}</strong>
                  </div>
                )}

                <div className="zk-guarantee-card" style={{ marginBottom: '1.25rem' }}>
                  <span className="zk-icon">
                    <Info size={18} />
                  </span>
                  <div className="zk-text">
                    <span className="zk-title">Aviso de Privacidad y Bóvedas</span>
                    <p>
                      Restablecer tu contraseña recupera el acceso a la cuenta. La clave maestra
                      de tus bóvedas se maneja de forma independiente y no se ve afectada.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-field">
                    <label htmlFor="new-password">Nueva Contraseña</label>
                    <input
                      id="new-password"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="input-control"
                      autoFocus
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
                    <input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="input-control"
                    />
                  </div>

                  {/* Checklist de requisitos de seguridad */}
                  <div className="password-checklist">
                    <div className={`check-item ${hasMinLength ? 'ok' : ''}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {hasMinLength ? <Check size={14} color="#34d399" /> : <Circle size={14} color="var(--text-dim)" />}
                      </span>{' '}
                      Mínimo 8 caracteres
                    </div>
                    <div className={`check-item ${hasUpper ? 'ok' : ''}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {hasUpper ? <Check size={14} color="#34d399" /> : <Circle size={14} color="var(--text-dim)" />}
                      </span>{' '}
                      Al menos una mayúscula (A-Z)
                    </div>
                    <div className={`check-item ${hasLower ? 'ok' : ''}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {hasLower ? <Check size={14} color="#34d399" /> : <Circle size={14} color="var(--text-dim)" />}
                      </span>{' '}
                      Al menos una minúscula (a-z)
                    </div>
                    <div className={`check-item ${hasNumber ? 'ok' : ''}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {hasNumber ? <Check size={14} color="#34d399" /> : <Circle size={14} color="var(--text-dim)" />}
                      </span>{' '}
                      Al menos un número (0-9)
                    </div>
                    <div className={`check-item ${hasSpecial ? 'ok' : ''}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {hasSpecial ? <Check size={14} color="#34d399" /> : <Circle size={14} color="var(--text-dim)" />}
                      </span>{' '}
                      Carácter especial (!@#$...)
                    </div>
                    <div className={`check-item ${passwordsMatch ? 'ok' : ''}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {passwordsMatch ? <Check size={14} color="#34d399" /> : <Circle size={14} color="var(--text-dim)" />}
                      </span>{' '}
                      Las contraseñas coinciden
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading || !isFormValid}
                    style={{ marginTop: '1.25rem' }}
                  >
                    {loading ? 'Restableciendo...' : 'Restablecer Contraseña y Revocar Sesiones'}
                  </button>
                </form>

                <div className="auth-footer">
                  <p>
                    <Link to="/login">← Cancelar y volver al login</Link>
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
