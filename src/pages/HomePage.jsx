import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { checkBackendHealth, checkDatabaseHealth } from '../services/healthService';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState({ loading: true, ok: false, data: null, error: null });
  const [dbStatus, setDbStatus] = useState({ loading: true, ok: false, data: null, error: null });
  const { isAuthenticated, user } = useAuth();

  const fetchStatus = async () => {
    setBackendStatus({ loading: true, ok: false, data: null, error: null });
    setDbStatus({ loading: true, ok: false, data: null, error: null });

    // Check FastAPI Backend
    try {
      const data = await checkBackendHealth();
      setBackendStatus({ loading: false, ok: true, data, error: null });
    } catch (err) {
      setBackendStatus({
        loading: false,
        ok: false,
        data: null,
        error: err.message || 'No se pudo conectar con el backend',
      });
    }

    // Check PostgreSQL Database
    try {
      const dbData = await checkDatabaseHealth();
      setDbStatus({ loading: false, ok: true, data: dbData, error: null });
    } catch (err) {
      setDbStatus({
        loading: false,
        ok: false,
        data: null,
        error: err.response?.data?.detail?.message || err.message || 'Error al conectar con la base de datos',
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="container">
      {/* Hero Section */}
      <header className="hero-section">
        <div className="header-badge">
          <span>🛡️ Bóveda Híbrida</span> • <span>Seguridad Criptográfica</span>
        </div>
        <h1>Bóveda Híbrida de Archivos Cifrados</h1>
        <p>
          Plataforma de alta seguridad para equipos académicos y pequeñas organizaciones.
          Control de acceso basado en roles (RBAC), tokens JWT, cifrado y trazabilidad inmutable.
        </p>

        <div className="hero-cta-group">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">
              🚀 Ir al Panel de Control ({user?.nombre})
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-lg">
                🔐 Iniciar Sesión
              </Link>
              <Link to="/register" className="btn btn-secondary btn-lg">
                ✨ Registrarse (CU-01)
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Tarjetas de Casos de Uso Implementados */}
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">👤</div>
          <h3>CU-01: Registro de Usuario</h3>
          <p>
            Creación segura de cuentas con validación de complejidad de contraseña, hash Bcrypt y
            asignación automática del rol <strong>Miembro</strong>.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔑</div>
          <h3>Inicio de Sesión (JWT + Sesiones)</h3>
          <p>
            Autenticación con Access Tokens y Refresh Tokens, control de intentos fallidos,
            bloqueo de fuerza bruta y registro de dispositivos.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <h3>CU-16: RBAC (Roles y Permisos)</h3>
          <p>
            Gestión granular de accesos con roles (Administrador, Miembro, Auditor, Invitado) y
            catálogo de permisos por módulo.
          </p>
        </div>
      </div>

      {/* Monitor de Estado de Servicios */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>
            📡 Estado del Backend & Base de Datos en Vivo
          </h2>
          <button className="btn-refresh-sm" onClick={fetchStatus}>
            🔄 Actualizar
          </button>
        </div>

        <div className="status-section">
          {/* Backend Card */}
          <div className={`status-card ${backendStatus.loading ? 'loading' : backendStatus.ok ? 'success' : 'error'}`}>
            <div className="status-info">
              <h3>FastAPI Backend (Docker :8000)</h3>
              <p>
                {backendStatus.loading
                  ? 'Comprobando conexión...'
                  : backendStatus.ok
                  ? 'FastAPI respondiendo correctamente'
                  : 'No se pudo conectar con el backend'}
              </p>
            </div>
            <div className="status-indicator">
              <span className="indicator-dot"></span>
              <span>{backendStatus.loading ? 'Cargando' : backendStatus.ok ? 'Online' : 'Error'}</span>
            </div>
          </div>

          {/* Database Card */}
          <div className={`status-card ${dbStatus.loading ? 'loading' : dbStatus.ok ? 'success' : 'error'}`}>
            <div className="status-info">
              <h3>PostgreSQL DB (Docker :5432)</h3>
              <p>
                {dbStatus.loading
                  ? 'Comprobando base de datos...'
                  : dbStatus.ok
                  ? 'Base de datos conectada (SELECT 1 OK)'
                  : 'Sin conexión a la base de datos'}
              </p>
            </div>
            <div className="status-indicator">
              <span className="indicator-dot"></span>
              <span>{dbStatus.loading ? 'Cargando' : dbStatus.ok ? 'Conectado' : 'Error'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
