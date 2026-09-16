import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(correo, password);
      navigate('/dashboard');
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

  const handleQuickFill = (email, pass) => {
    setCorreo(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge">🔐</div>
          <h2>Iniciar Sesión</h2>
          <p>Accede a tu Bóveda Híbrida de archivos cifrados</p>
        </div>

        {error && (
          <div className="alert-box error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              id="correo"
              type="email"
              placeholder="tu.correo@boveda.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Autenticando...
              </>
            ) : (
              'Ingresar a la Bóveda'
            )}
          </button>
        </form>

        <div className="quick-access-box">
          <p className="quick-title">⚡ Cuentas de Demostración:</p>
          <div className="quick-buttons">
            <button
              type="button"
              className="btn-quick"
              onClick={() => handleQuickFill('admin@boveda.com', 'Admin1234!*')}
            >
              👑 Administrador
            </button>
            <button
              type="button"
              className="btn-quick"
              onClick={() => handleQuickFill('investigador@boveda.com', 'User1234!*')}
            >
              🔬 Investigador (Miembro)
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            ¿No tienes una cuenta? <Link to="/register">Regístrate aquí (CU-01)</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
