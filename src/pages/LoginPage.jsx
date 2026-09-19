import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'mfa'
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login, completeMfaLogin } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(correo, password);
      if (data.mfa_required) {
        setMfaToken(data.mfa_token);
        setStep('mfa');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Error al iniciar sesión. Verifique sus credenciales.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await completeMfaLogin(mfaToken, totpCode.trim());
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Código de verificación incorrecto o expirado.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTotpCode('');
    setError(null);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {step === 'credentials' ? (
          <>
            <div className="auth-header">
              <div className="auth-brand-icon">🛡️</div>
              <h2>Iniciar Sesión</h2>
              <p>Ingresa a tu cuenta para acceder a la bóveda</p>
            </div>

            {error && (
              <div className="alert-banner error">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="auth-form">
              <div className="form-field">
                <label htmlFor="correo">Correo Electrónico</label>
                <input
                  id="correo"
                  type="email"
                  placeholder="nombre@organizacion.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  disabled={loading}
                  className="input-control"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="input-control"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="auth-header">
              <div className="auth-brand-icon">📱</div>
              <h2>Verificación en Dos Pasos</h2>
              <p>Ingresa el código de 6 dígitos de tu app <strong>Bóveda Authenticator</strong> o un código de recuperación</p>
            </div>

            {error && (
              <div className="alert-banner error">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleMfaSubmit} className="auth-form">
              <div className="form-field">
                <label htmlFor="totp">Código de Seguridad</label>
                <input
                  id="totp"
                  type="text"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                  className="input-control mfa-code-input"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || !totpCode.trim()}
              >
                {loading ? 'Verificando...' : 'Verificar y Acceder'}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={handleBackToCredentials}
                disabled={loading}
              >
                ← Volver al login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
