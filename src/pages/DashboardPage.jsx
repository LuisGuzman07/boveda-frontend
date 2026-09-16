import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMfaStatus } from '../services/authService';
import MfaModal from '../components/MfaModal';

export default function DashboardPage() {
  const { user, roles, permissions } = useAuth();
  const [mfaStatus, setMfaStatus] = useState({ mfa_enabled: false, tipo: null });
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(true);

  const fetchMfaStatus = async () => {
    try {
      setLoadingMfa(true);
      const data = await getMfaStatus();
      setMfaStatus(data);
    } catch (err) {
      console.error('Error al obtener estado MFA:', err);
    } finally {
      setLoadingMfa(false);
    }
  };

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const isMfaActive = Boolean(mfaStatus?.enabled || mfaStatus?.mfa_enabled);

  return (
    <div className="container">
      {/* Header del Dashboard */}
      <header className="dashboard-hero">
        <div className="profile-summary">
          <div className="profile-avatar">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-details">
            <div className="profile-badge-row">
              <span className="account-status-badge">Cuenta Activa</span>
              {roles.map((rol, i) => (
                <span key={i} className="role-badge">
                  {rol}
                </span>
              ))}
            </div>
            <h2>{user?.nombre}</h2>
            <p className="profile-email">{user?.correo}</p>
          </div>
        </div>
      </header>

      {/* Grid de Resumen */}
      <div className="dashboard-grid">
        {/* Tarjeta: Información de Cuenta */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3>Perfil de Usuario</h3>
          </div>
          <div className="panel-list">
            <div className="panel-row">
              <span className="row-label">Estado de Cuenta</span>
              <span className="row-value badge-success-text">Activo</span>
            </div>
            <div className="panel-row">
              <span className="row-label">Verificación de Correo</span>
              <span className="row-value">
                {user?.correo_verificado ? 'Verificado' : 'No verificado'}
              </span>
            </div>
            <div className="panel-row">
              <span className="row-label">Fecha de Registro</span>
              <span className="row-value">
                {user?.fecha_creacion
                  ? new Date(user.fecha_creacion).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta: Seguridad & 2FA */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3>Seguridad de la Cuenta</h3>
            <span
              className={`chip-count ${
                isMfaActive ? 'chip-success' : 'chip-warning'
              }`}
            >
              {isMfaActive ? '2FA Activo' : '2FA Inactivo'}
            </span>
          </div>
          <div className="panel-list">
            <div className="panel-row">
              <span className="row-label">Doble Factor (TOTP)</span>
              <span className="row-value">
                {loadingMfa
                  ? 'Consultando...'
                  : isMfaActive
                  ? 'Habilitado (Bóveda Authenticator)'
                  : 'Sin configurar'}
              </span>
            </div>
            <div className="panel-row">
              <span className="row-label">Protección de Sesión</span>
              <span className="row-value badge-success-text">Alta (JWT + Refresh)</span>
            </div>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className={`btn btn-block ${
                isMfaActive ? 'btn-secondary' : 'btn-primary'
              }`}
              onClick={() => setMfaModalOpen(true)}
            >
              {isMfaActive ? '⚙️ Desactivar 2FA' : '🔒 Configurar 2FA con App Móvil'}
            </button>
          </div>
        </div>

        {/* Tarjeta: Privilegios y Permisos */}
        <div className="panel-card" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-card-header">
            <h3>Privilegios Asignados</h3>
            <span className="chip-count">{permissions.length} permisos</span>
          </div>
          <p className="panel-hint">
            Permisos habilitados según tu rol actual ({roles.join(', ') || 'Miembro'}):
          </p>
          <div className="permissions-flow">
            {permissions.map((perm, idx) => (
              <span key={idx} className="permission-tag">
                {perm}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Módulos Principales */}
      <section className="modules-section">
        <div className="section-title-row">
          <h3>Módulos de la Bóveda</h3>
        </div>

        <div className="modules-deck">
          <div className="deck-card">
            <div className="deck-icon">🗄️</div>
            <h4>Bóvedas</h4>
            <p>Repositorios cifrados para almacenar archivos confidenciales.</p>
          </div>

          <div className="deck-card">
            <div className="deck-icon">📁</div>
            <h4>Archivos</h4>
            <p>Carga, versionado y control de acceso de documentos.</p>
          </div>

          <div className="deck-card">
            <div className="deck-icon">🔐</div>
            <h4>Seguridad</h4>
            <p>Gestión de claves, dispositivos vinculados y políticas.</p>
          </div>

          <Link to="/audit" className="deck-card deck-card-clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="deck-icon">📜</div>
            <h4>Auditoría</h4>
            <p>Registro continuo e inmutable de eventos de seguridad.</p>
          </Link>
        </div>
      </section>

      {/* Modal de Configuración MFA */}
      <MfaModal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
        isMfaEnabled={isMfaActive}
        onSuccess={fetchMfaStatus}
      />
    </div>
  );
}
