import React, { useEffect, useState } from 'react';
import { Clock, Lock, AlertTriangle, LockOpen } from 'lucide-react';
import { useInactivity } from '../context/InactivityContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function InactivityLockModal() {
  const { isLocked, isWarning, remainingSeconds, unlockSession, resetTimer } = useInactivity();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLocked) {
      setPassword('');
      setError(null);
      setShowPassword(false);
    }
  }, [isLocked]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError('Ingresa tu contraseña para desbloquear.');
      return;
    }

    setLoading(true);
    try {
      await unlockSession(password);
      setPassword('');
    } catch (err) {
      console.error('Error al desbloquear sesión por inactividad:', err);
      setError(err.response?.data?.detail || err.message || 'Contraseña incorrecta.');
    } finally {
      setLoading(false);
    }
  };

  const handleFullLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 1. Advertencia sutil flotante cuando restan 60 segundos o menos antes del bloqueo
  if (isWarning && !isLocked) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: 'rgba(245, 158, 11, 0.95)',
          color: '#0f172a',
          padding: '0.85rem 1.25rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          cursor: 'pointer',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
        onClick={resetTimer}
        title="Haz clic o mueve el cursor para continuar la sesión"
      >
        <Clock size={20} />
        <div>
          <strong style={{ fontSize: '0.85rem', display: 'block' }}>
            Inactividad Detectada (CU-12)
          </strong>
          <span style={{ fontSize: '0.78rem' }}>
            Tu terminal se bloqueará en <strong>{remainingSeconds}s</strong>. Haz clic aquí para continuar.
          </span>
        </div>
      </div>
    );
  }

  // 2. Pantalla de bloqueo total por inactividad
  if (!isLocked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 14, 23, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1.5rem',
      }}
    >
        <div
          className="modal-card inactivity-modal-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.15)',
        }}
      >
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}
          >
            <Lock size={26} color="#60a5fa" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Terminal Bloqueada por Inactividad
          </h3>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Caso de Uso CU-12: Protección de memoria local y claves volátiles
          </p>
        </div>

        {/* Tarjeta de usuario */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#ffffff',
            }}
          >
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
              {user?.nombre}
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block' }}>
              {user?.correo}
            </span>
          </div>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <p>{error}</p>
          </div>
        )}

        {/* Banner Zero-Knowledge */}
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '0.45rem',
            padding: '0.65rem 0.85rem',
            fontSize: '0.75rem',
            color: '#a7f3d0',
            lineHeight: 1.4,
            marginBottom: '1.25rem',
          }}
        >
          <strong>Garantía de Cero Conocimiento:</strong> Por seguridad, las claves de descifrado en RAM y la sesión de bóvedas fueron erradicadas de esta terminal. Ingresa tu contraseña para reanudar de forma segura.
        </div>

        {/* Formulario de reautenticación */}
        <form onSubmit={handleUnlock}>
          <div className="inactivity-password-field">
            <div className="inactivity-password-heading">
              <label className="input-label" htmlFor="inactivity-password">Contraseña de la cuenta *</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="inactivity-password-toggle"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className={`inactivity-password-shell${error ? ' has-error' : ''}${loading ? ' is-disabled' : ''}`}>
              <input
                id="inactivity-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="inactivity-password-input"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                autoFocus
                required
                aria-invalid={Boolean(error)}
                aria-describedby="inactivity-password-helper"
              />
            </div>
            <p className="inactivity-password-helper" id="inactivity-password-helper">
              Tu contraseña vuelve a autenticar esta sesión; no se almacena en el navegador.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || !password}
            >
              {loading ? 'Verificando credenciales...' : <><LockOpen size={16} /> Desbloquear Terminal</>}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block btn-sm"
              onClick={handleFullLogout}
              disabled={loading}
            >
              Cerrar sesión completamente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
