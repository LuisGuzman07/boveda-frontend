import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  Settings,
  Lock,
  Laptop,
  ShieldAlert,
  Archive,
  FolderArchive,
  KeyRound,
  ScrollText,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMfaStatus } from '../services/authService';
import { listDevices, getOrCreateDeviceId } from '../services/deviceService';
import MfaModal from '../components/MfaModal';
import TrustedDevicesModal from '../components/TrustedDevicesModal';
import AdminDevicesModal from '../components/AdminDevicesModal';
import SecurityPoliciesModal from '../components/SecurityPoliciesModal';
import AdminUsersModal from '../components/AdminUsersModal';

export default function DashboardPage() {
  const { user, roles, permissions } = useAuth();
  const location = useLocation();
  const isAdmin = roles.includes('Administrador');
  const canAdminUsers = permissions.includes('users:read');
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

  // CU-17: Políticas de Seguridad Globales
  const [policiesModalOpen, setPoliciesModalOpen] = useState(false);
  const [adminUsersModalOpen, setAdminUsersModalOpen] = useState(false);

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

  useEffect(() => {
    const handleOpenModal = (e) => {
      const modalName = e.detail;
      if (modalName === 'trusted_devices') setDevicesModalOpen(true);
      else if (modalName === 'mfa_modal') setMfaModalOpen(true);
      else if (modalName === 'security_policies') setPoliciesModalOpen(true);
      else if (modalName === 'admin_devices') setAdminDevicesModalOpen(true);
      else if (modalName === 'admin_users') setAdminUsersModalOpen(true);
    };

    window.addEventListener('boveda:open-modal', handleOpenModal);

    if (location.state?.openModal) {
      handleOpenModal({ detail: location.state.openModal });
    }

    return () => window.removeEventListener('boveda:open-modal', handleOpenModal);
  }, [location.state]);

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
                  <span className="badge-success-text" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={16} /> Confiable ({currentDeviceName})
                  </span>
                ) : (
                  <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertTriangle size={16} /> No Confiable ({currentDeviceName})
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
              {isMfaActive ? (
                <>
                  <Settings size={16} /> Desactivar 2FA
                </>
              ) : (
                <>
                  <Lock size={16} /> Configurar 2FA con App Móvil
                </>
              )}
                  </button>
                {canAdminUsers && <button type="button" className="btn btn-block btn-admin-action" onClick={() => setAdminUsersModalOpen(true)}><Users size={16} /> Administrar usuarios y roles (CU-16)</button>}
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setDevicesModalOpen(true)}
            >
              <Laptop size={16} /> Gestionar Dispositivos de Confianza ({devicesCount})
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  className="btn btn-block btn-admin-action"
                  onClick={() => setAdminDevicesModalOpen(true)}
                >
                  <ShieldAlert size={16} /> Control Global de Terminales (CU-05)
                </button>
                <button
                  type="button"
                  className="btn btn-block btn-secondary"
                  onClick={() => setPoliciesModalOpen(true)}
                  style={{ border: '1px solid rgba(59, 130, 246, 0.4)', color: '#93c5fd' }}
                >
                  <ShieldCheck size={16} /> Políticas de Seguridad Globales (CU-17)
                </button>
              </>
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
          <Link
            to="/vaults"
            className="deck-card deck-card-clickable"
            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <div className="deck-icon">
              <Archive size={32} />
            </div>
            <h4>Bóvedas (CU-06)</h4>
            <p>Repositorios cifrados con Cero Conocimiento (AES-256-GCM + Argon2id).</p>
          </Link>

          <div className="deck-card">
            <div className="deck-icon">
              <FolderArchive size={32} />
            </div>
            <h4>Archivos</h4>
            <p>Carga, versionado y control de acceso de documentos.</p>
          </div>

          <div
            className="deck-card deck-card-clickable"
            onClick={() => setDevicesModalOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            <div className="deck-icon">
              <KeyRound size={32} />
            </div>
            <h4>Seguridad & Dispositivos</h4>
            <p>Gestión de claves, hardware local y dispositivos de confianza (CU-04).</p>
          </div>

          <Link to="/audit" className="deck-card deck-card-clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="deck-icon">
              <ScrollText size={32} />
            </div>
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

      {/* Modal de Políticas de Seguridad Globales (CU-17) */}
      <SecurityPoliciesModal
        isOpen={policiesModalOpen}
        onClose={() => setPoliciesModalOpen(false)}
      />
      <AdminUsersModal isOpen={adminUsersModalOpen} onClose={() => setAdminUsersModalOpen(false)} permissions={permissions} />
    </div>
  );
}
