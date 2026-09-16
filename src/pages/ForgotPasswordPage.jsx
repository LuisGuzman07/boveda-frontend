import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await requestPasswordReset(correo.trim());
      setSuccessData(data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Error al procesar la solicitud de recuperación.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email) => {
    setCorreo(email);
    setError(null);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand-icon">🔑</div>
          <h2>Recuperar Cuenta</h2>
          <p>CU-03: Restablecimiento seguro de credenciales</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {successData ? (
          <div className="recovery-success-box">
            <div className={`alert-banner ${successData.email_sent ? 'success' : 'info'}`}>
              <span style={{ fontSize: '1.4rem' }}>{successData.email_sent ? '📬' : '✉️'}</span>
              <div>
                <strong>{successData.email_sent ? '¡Correo enviado exitosamente!' : 'Solicitud procesada'}</strong>
                <p style={{ marginTop: '0.35rem', fontSize: '0.88rem', lineHeight: '1.45' }}>
                  {successData.message}
                </p>
                {successData.email_sent && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#93c5fd' }}>
                    💡 <em>Tip: Si no lo ves en tu bandeja de entrada en 1-2 minutos, revisa tu carpeta de Spam o Correo no deseado.</em>
                  </p>
                )}
              </div>
            </div>

            {successData.simulation_token && (
              <div className="simulation-notice-card">
                <div className="simulation-header">
                  <span className="simulation-badge">Modo Demostración</span>
                  <span className="simulation-time">Expira en {successData.expires_in_minutes} min</span>
                </div>
                <p className="simulation-desc">
                  SMTP no configurado en .env. Se generó el enlace simulado para pruebas locales:
                </p>
                <div className="token-preview">
                  <code>{successData.simulation_token.substring(0, 16)}...</code>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => navigate(`/reset-password?token=${encodeURIComponent(successData.simulation_token)}`)}
                >
                  Continuar al Restablecimiento →
                </button>
              </div>
            )}


            <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => {
                  setSuccessData(null);
                  setCorreo('');
                }}
              >
                Solicitar para otro correo
              </button>
              <p style={{ marginTop: '1rem' }}>
                <Link to="/login">← Volver a Iniciar Sesión</Link>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="info-banner-subtle">
              <span>🛡️</span>
              <p>
                Recuperar tu cuenta restablece la contraseña de acceso sin alterar ni comprometer
                la clave de tus bóvedas cifradas (Principio Cero-Conocimiento).
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '1.25rem' }}>
              <div className="form-field">
                <label htmlFor="correo">Correo Electrónico Registrado</label>
                <input
                  id="correo"
                  type="email"
                  placeholder="usuario@boveda.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  disabled={loading}
                  className="input-control"
                  autoFocus
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading || !correo}>
                {loading ? 'Generando token...' : 'Generar Enlace de Recuperación'}
              </button>
            </form>

            <div className="demo-accounts-helper">
              <span className="helper-label">Cuentas disponibles para prueba:</span>
              <div className="helper-pills">
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => handleQuickFill('investigador@boveda.com')}
                >
                  investigador@boveda.com
                </button>
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => handleQuickFill('admin@boveda.com')}
                >
                  admin@boveda.com
                </button>
              </div>
            </div>

            <div className="auth-footer">
              <p>
                ¿Recordaste tu contraseña? <Link to="/login">Iniciar Sesión</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
