import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  // Validaciones en tiempo real de contraseña
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
      setError('Por favor cumpla con todos los requisitos de seguridad de la contraseña.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
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
        'Error al registrar el usuario. Verifique los datos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register">
        <div className="auth-header">
          <div className="auth-icon-badge">✨</div>
          <h2>Crear Cuenta (CU-01)</h2>
          <p>Únete a la plataforma con rol asignado automáticamente (RBAC)</p>
        </div>

        {error && (
          <div className="alert-box error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              id="nombre"
              type="text"
              placeholder="Dr. Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              id="correo"
              type="email"
              placeholder="juan.perez@boveda.com"
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
              placeholder="Ingresa tu contraseña segura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="form-input"
            />
          </div>

          {/* Checklist de requisitos de contraseña */}
          <div className="password-checklist">
            <p className="checklist-title">Requisitos de Contraseña (Seguridad):</p>
            <ul>
              <li className={hasMinLength ? 'valid' : 'invalid'}>
                {hasMinLength ? '✓' : '○'} Mínimo 8 caracteres
              </li>
              <li className={hasUpper ? 'valid' : 'invalid'}>
                {hasUpper ? '✓' : '○'} Al menos una letra mayúscula (A-Z)
              </li>
              <li className={hasLower ? 'valid' : 'invalid'}>
                {hasLower ? '✓' : '○'} Al menos una letra minúscula (a-z)
              </li>
              <li className={hasNumber ? 'valid' : 'invalid'}>
                {hasNumber ? '✓' : '○'} Al menos un número (0-9)
              </li>
              <li className={hasSpecial ? 'valid' : 'invalid'}>
                {hasSpecial ? '✓' : '○'} Al menos un carácter especial (!@#$%^&*...)
              </li>
            </ul>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="form-input"
            />
            {confirmPassword && (
              <p className={`match-hint ${passwordsMatch ? 'match' : 'no-match'}`}>
                {passwordsMatch ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !isPasswordValid || !passwordsMatch}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Registrando...
              </>
            ) : (
              'Crear Cuenta y Asignar Rol'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
