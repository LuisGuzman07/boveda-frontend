import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMfaStatus } from '../services/authService';
import { listDevices, getOrCreateDeviceId } from '../services/deviceService';
import MfaModal from '../components/MfaModal';
import TrustedDevicesModal from '../components/TrustedDevicesModal';
import AdminDevicesModal from '../components/AdminDevicesModal';

export default function DashboardPage() {
  const { user, roles, permissions } = useAuth();
  const isAdmin = roles.includes('Administrador');
  const [mfaStatus, setMfaStatus] = useState({ mfa_enabled: false, tipo: null });
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(true);

  // CU-04: Dispositivos de Confianza
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [devicesCount, setDevicesCount] = useState(0);
  const [currentDeviceTrusted, setCurrentDeviceTrusted] = useState(false);
  const [currentDeviceName, setCurrentDeviceName] = useState('Navegador Web');

  // CU-05: Administración y Revocación Global de Terminales
  const [adminDevicesModalOpen, setAdminDevicesModalOpen] = useState(false);

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

  const fetchDeviceStatus = async () => {
    try {
      const data = await listDevices();
      setDevicesCount(data.total || 0);
      const localId = getOrCreateDeviceId();
      const current = data.dispositivos?.find(
        (d) => d.identificador_seguro === localId || d.es_dispositivo_actual
      );
      if (current) {
        setCurrentDeviceTrusted(Boolean(current.es_confiable));
        setCurrentDeviceName(current.nombre || 'Navegador Web');
      }
    } catch (err) {
      console.error('Error al obtener estado de dispositivos:', err);
    }
  };

  useEffect(() => {
    fetchMfaStatus();
    fetchDeviceStatus();
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
            <div className="panel-row">
              <span className="row-label">Dispositivo Actual (CU-04)</span>
              <span className="row-value">
                {currentDeviceTrusted ? (
                  <span className="badge-success-text" style={{ fontWeight: 600 }}>
                    🛡️ Confiable ({currentDeviceName})
                  </span>
                ) : (
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                    ⚠️ No Confiable ({currentDeviceName})
                  </span>
                )}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              type="button"
              className={`btn btn-block ${
                isMfaActive ? 'btn-secondary' : 'btn-primary'
              }`}
              onClick={() => setMfaModalOpen(true)}
            >
              {isMfaActive ? '⚙️ Desactivar 2FA' : '🔒 Configurar 2FA con App Móvil'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setDevicesModalOpen(true)}
            >
              💻 Gestionar Dispositivos de Confianza ({devicesCount})
            </button>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-block btn-admin-action"
                onClick={() => setAdminDevicesModalOpen(true)}
              >
                🚨 Control Global de Terminales (CU-05)
              </button>
            )}
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

          <div
            className="deck-card deck-card-clickable"
            onClick={() => setDevicesModalOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            <div className="deck-icon">🔐</div>
            <h4>Seguridad & Dispositivos</h4>
            <p>Gestión de claves, hardware local y dispositivos de confianza (CU-04).</p>
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

      {/* Modal de Dispositivos de Confianza (CU-04) */}
      <TrustedDevicesModal
        isOpen={devicesModalOpen}
        onClose={() => setDevicesModalOpen(false)}
        onDeviceUpdated={fetchDeviceStatus}
      />

      {/* Modal de Administración Global de Terminales (CU-05) */}
      <AdminDevicesModal
        isOpen={adminDevicesModalOpen}
        onClose={() => setAdminDevicesModalOpen(false)}
        onDeviceRevoked={fetchDeviceStatus}
      />
    </div>
  );
}
