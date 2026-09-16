import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { checkBackendHealth, checkDatabaseHealth } from '../services/healthService';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const [systemStatus, setSystemStatus] = useState({ backend: false, db: false, loading: true });
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [backendRes, dbRes] = await Promise.all([
          checkBackendHealth().catch(() => ({ status: 'error' })),
          checkDatabaseHealth().catch(() => ({ status: 'error' })),
        ]);
        setSystemStatus({
          backend: backendRes.status === 'ok',
          db: dbRes.status === 'ok' && dbRes.database === 'connected',
          loading: false,
        });
      } catch {
        setSystemStatus({ backend: false, db: false, loading: false });
      }
    };
    checkStatus();
  }, []);

  const isSystemReady = systemStatus.backend && systemStatus.db;

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          <span>Plataforma de Seguridad Criptográfica</span>
        </div>
        <h1 className="hero-title">
          Bóveda Híbrida de Archivos Cifrados
        </h1>
        <p className="hero-subtitle">
          Almacena, cifra y colabora en archivos confidenciales con control de acceso
          granular, autenticación segura y trazabilidad inmutable.
        </p>

        <div className="hero-cta-group">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">
              Ir al Panel de Control
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-lg">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="btn btn-secondary btn-lg">
                Crear Cuenta
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Características Principales */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon-wrapper">🔐</div>
          <h3>Cifrado y Seguridad</h3>
          <p>
            Protección de archivos mediante algoritmos criptográficos robustos y almacenamiento seguro.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">🛡️</div>
          <h3>Control de Acceso (RBAC)</h3>
          <p>
            Permisos basados en roles con separación estricta de privilegios para administradores, investigadores y auditores.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">📋</div>
          <h3>Trazabilidad e Integridad</h3>
          <p>
            Bitácora inmutable de eventos para garantizar la auditoría continua de accesos y operaciones.
          </p>
        </div>
      </section>

      {/* Barra de Estado del Sistema (Discreta y Limpia) */}
      <footer className="system-status-bar">
        <div className="status-indicator-group">
          <span className={`status-dot ${isSystemReady ? 'online' : 'offline'}`}></span>
          <span className="status-text">
            {systemStatus.loading
              ? 'Verificando servicios...'
              : isSystemReady
              ? 'Servicios Operativos • API & Base de Datos Conectadas'
              : 'Verificando conexión con el servidor'}
          </span>
        </div>
      </footer>
    </div>
  );
}
