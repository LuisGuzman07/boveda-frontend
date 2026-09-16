import React, { useState, useEffect } from 'react';
import { checkBackendHealth, checkDatabaseHealth } from '../services/healthService';

export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState({ loading: true, ok: false, data: null, error: null });
  const [dbStatus, setDbStatus] = useState({ loading: true, ok: false, data: null, error: null });

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
      <header className="header">
        <div className="header-badge">
          <span>🛡️ Bóveda Híbrida</span> • <span>Fase 3: Frontend</span>
        </div>
        <h1>Panel de Integración y Estado</h1>
        <p>
          Bóveda híbrida de archivos cifrados para equipos académicos y pequeñas organizaciones.
        </p>
      </header>

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: '600' }}>
          Estado de los Servicios
        </h2>

        <div className="status-section">
          {/* Backend Card */}
          <div className={`status-card ${backendStatus.loading ? 'loading' : backendStatus.ok ? 'success' : 'error'}`}>
            <div className="status-info">
              <h3>FastAPI Backend</h3>
              <p>
                {backendStatus.loading
                  ? 'Comprobando conexión...'
                  : backendStatus.ok
                  ? 'Backend conectado correctamente'
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
              <h3>PostgreSQL DB</h3>
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

        <div className="btn-group">
          <button className="btn btn-primary" onClick={fetchStatus}>
            🔄 Reintentar conexión
          </button>
          <a
            className="btn btn-secondary"
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            📖 Ver Swagger Docs
          </a>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: '600' }}>
          Arquitectura del Flujo de Datos
        </h3>
        <div className="architecture-box">
{`React Frontend (http://localhost:5173)
       │
       ▼ [Axios HTTP /api/v1/health]
FastAPI Backend (http://localhost:8000)
       │
       ▼ [SQLAlchemy + psycopg SELECT 1]
PostgreSQL Database (port 5432)`}
        </div>
      </div>
    </div>
  );
}
