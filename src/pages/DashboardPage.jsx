import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, roles, permissions } = useAuth();

  return (
    <div className="container dashboard">
      {/* Header del Dashboard */}
      <header className="dashboard-header">
        <div className="user-welcome">
          <div className="user-avatar-large">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="welcome-tag">Sesión Activa Autenticada (JWT)</div>
            <h1>Bienvenido, {user?.nombre}</h1>
            <p className="user-email">{user?.correo}</p>
          </div>
        </div>

        <div className="user-status-pill">
          <span className="dot active"></span>
          <span>Estado: {user?.estado || 'ACTIVO'}</span>
        </div>
      </header>

      {/* Grid Principal */}
      <div className="dashboard-grid">
        {/* Tarjeta 1: Información de Usuario & Dispositivo */}
        <div className="card">
          <div className="card-header">
            <h3>👤 Perfil de Usuario</h3>
            <span className="badge-blue">ID Único</span>
          </div>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Identificador (UUID):</span>
              <span className="info-value monospace">{user?.id_usuario}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Correo Verificado:</span>
              <span className="info-value">
                {user?.correo_verificado ? '✅ Verificado' : '⏳ Pendiente de verificación'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Fecha de Registro:</span>
              <span className="info-value">
                {user?.fecha_creacion ? new Date(user.fecha_creacion).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Último Acceso Registrado:</span>
              <span className="info-value">
                {user?.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleString() : 'Sesión Actual'}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Control de Acceso Basado en Roles (CU-16 RBAC) */}
        <div className="card">
          <div className="card-header">
            <h3>🛡️ Roles y Permisos (CU-16 RBAC)</h3>
            <span className="badge-purple">Seguridad</span>
          </div>

          <div className="roles-section">
            <p className="sub-title">Roles Asignados:</p>
            <div className="roles-badge-container">
              {roles.length > 0 ? (
                roles.map((rol, idx) => (
                  <span key={idx} className="role-chip">
                    👑 {rol}
                  </span>
                ))
              ) : (
                <span className="text-muted">Sin rol asignado</span>
              )}
            </div>
          </div>

          <div className="permissions-section">
            <p className="sub-title">Permisos Efectivos ({permissions.length}):</p>
            <div className="permissions-grid">
              {permissions.map((perm, idx) => (
                <span key={idx} className="permission-chip">
                  ✓ {perm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta 3: Módulos del Sistema */}
      <div className="card modules-card">
        <h3>📂 Módulos de Bóveda Híbrida Disponibles</h3>
        <p className="modules-desc">
          Acceso controlado según tu rol actual ({roles.join(', ') || 'Miembro'}).
        </p>

        <div className="modules-grid">
          <div className="module-item">
            <div className="module-icon">🗄️</div>
            <h4>Bóvedas Cifradas</h4>
            <p>Creación y gestión de repositorios seguros de almacenamiento.</p>
            <span className="status-badge available">Disponible</span>
          </div>

          <div className="module-item">
            <div className="module-icon">🔐</div>
            <h4>Gestión de Archivos</h4>
            <p>Carga, cifrado híbrido, descarga y versionado de archivos.</p>
            <span className="status-badge available">Disponible</span>
          </div>

          <div className="module-item">
            <div className="module-icon">📋</div>
            <h4>Bitácora de Auditoría</h4>
            <p>Trazabilidad inmutable de accesos, intentos y transacciones.</p>
            <span className="status-badge ready">Próximo CU</span>
          </div>

          <div className="module-item">
            <div className="module-icon">📱</div>
            <h4>MFA (Doble Factor)</h4>
            <p>Protección con TOTP Authenticator y dispositivos de confianza.</p>
            <span className="status-badge ready">Próximo CU</span>
          </div>
        </div>
      </div>
    </div>
  );
}
