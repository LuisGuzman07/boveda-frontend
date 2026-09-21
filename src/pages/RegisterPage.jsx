import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Validaciones de seguridad de contraseña
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas, números y un símbolo.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await register(nombre, correo, password);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Error al crear la cuenta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="auth-brand-icon">
            <UserPlus size={36} />
          </div>
          <h2>Crear Cuenta</h2>
          <p>Registra un nuevo usuario para acceder a la plataforma</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              id="nombre"
              type="text"
              placeholder="Ej. Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={loading}
              className="input-control"
            />
          </div>

          <div className="form-field">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              id="correo"
              type="email"
              placeholder="juan.perez@organizacion.com"
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
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="input-control"
            />
          </div>

          {/* Indicadores limpios de fortaleza */}
          <div className="password-rules-box">
            <div className="rules-grid">
              <span className={`rule-item ${hasMinLength ? 'ok' : ''}`}>
                {hasMinLength ? <Check size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> : '•'} 8+ caracteres
              </span>
              <span className={`rule-item ${hasUpper ? 'ok' : ''}`}>
                {hasUpper ? <Check size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> : '•'} Mayúscula
              </span>
              <span className={`rule-item ${hasLower ? 'ok' : ''}`}>
                {hasLower ? <Check size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> : '•'} Minúscula
              </span>
              <span className={`rule-item ${hasNumber ? 'ok' : ''}`}>
                {hasNumber ? <Check size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> : '•'} Número
              </span>
              <span className={`rule-item ${hasSpecial ? 'ok' : ''}`}>
                {hasSpecial ? <Check size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> : '•'} Símbolo (!@#$)
              </span>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="input-control"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !isPasswordValid || !passwordsMatch}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
