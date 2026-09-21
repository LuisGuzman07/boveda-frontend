import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Zap,
  CheckCircle,
  Ban,
  Smartphone,
  Laptop,
  Globe,
  ShieldAlert,
  X,
} from 'lucide-react';
import { listAllDevicesAdmin, revokeDeviceAdmin } from '../services/deviceService';

export default function AdminDevicesModal({ isOpen, onClose, onDeviceRevoked }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrust, setFilterTrust] = useState('ALL'); // 'ALL', 'TRUSTED_ONLY', 'ACTIVE_ONLY', 'REVOKED_ONLY'

  // Modal para ingresar motivo de revocación
  const [revokingDevice, setRevokingDevice] = useState(null);
  const [revokeReason, setRevokeReason] = useState('Sospecha de acceso indebido o terminal vulnerada');

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.query = searchQuery.trim();
      if (filterTrust === 'TRUSTED_ONLY') params.solo_confiables = true;
      if (filterTrust === 'ACTIVE_ONLY') params.estado = 'ACTIVO';
      if (filterTrust === 'REVOKED_ONLY') params.estado = 'REVOCADO';

      const data = await listAllDevicesAdmin(params);
      setDevices(data.dispositivos || []);
    } catch (err) {
      console.error('Error al consultar inventario global de dispositivos:', err);
      setError(err.response?.data?.detail || 'Error al obtener inventario administrativo de dispositivos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessMsg(null);
      setError(null);
      fetchDevices();
    }
  }, [isOpen, filterTrust]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDevices();
  };

  const handleOpenRevokePrompt = (device) => {
    setRevokingDevice(device);
    setRevokeReason('Sospecha de acceso indebido o terminal vulnerada');
  };

  const handleConfirmRevoke = async () => {
    if (!revokingDevice) return;

    setActionLoadingId(revokingDevice.id_dispositivo);
    setError(null);
    setSuccessMsg(null);

    try {
      await revokeDeviceAdmin(revokingDevice.id_dispositivo, revokeReason);
      setSuccessMsg(`Dispositivo '${revokingDevice.nombre}' de ${revokingDevice.usuario_correo} revocado y sesiones finalizadas.`);
      setRevokingDevice(null);
      await fetchDevices();
      onDeviceRevoked?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al revocar dispositivo.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-admin" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3>Control Global de Terminales (CU-05)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Auditoría y revocación inmediata de hardware y sesiones activas (Rol Administrador)
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <p>{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="alert-banner success" style={{ marginBottom: '1rem' }}>
            <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Banner de Seguridad Administrativa */}
        <div className="admin-device-alert">
          <div className="alert-icon">
            <Zap size={18} />
          </div>
          <div className="alert-desc">
            <strong>Revocación en Tiempo Real:</strong> Al revocar una terminal, el sistema invalida inmediatamente el dispositivo y purga todas las sesiones activas asociadas en la base de datos (motivo: <em>REVOCADO_POR_ADMINISTRADOR</em>), auditando el incidente.
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="admin-filters-bar">
          <form onSubmit={handleSearchSubmit} className="search-form-flex">
            <input
              type="text"
              placeholder="Buscar por usuario, correo o nombre de equipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-control input-sm"
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
              Buscar
            </button>
          </form>

          <div className="filter-pill-group">
            <button
              type="button"
              className={`pill-btn ${filterTrust === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterTrust('ALL')}
            >
              Todos ({devices.length})
            </button>
            <button
              type="button"
              className={`pill-btn ${filterTrust === 'TRUSTED_ONLY' ? 'active' : ''}`}
              onClick={() => setFilterTrust('TRUSTED_ONLY')}
            >
              <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              Confiables
            </button>
            <button
              type="button"
              className={`pill-btn ${filterTrust === 'ACTIVE_ONLY' ? 'active' : ''}`}
              onClick={() => setFilterTrust('ACTIVE_ONLY')}
            >
              <CheckCircle size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px', color: '#34d399' }} />
              Activos
            </button>
            <button
              type="button"
              className={`pill-btn ${filterTrust === 'REVOKED_ONLY' ? 'active' : ''}`}
              onClick={() => setFilterTrust('REVOKED_ONLY')}
            >
              <Ban size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px', color: '#f87171' }} />
              Revocados
            </button>
          </div>
        </div>

        {/* Tabla / Lista de Dispositivos */}
        <div className="admin-devices-table-wrap">
          {loading ? (
            <div className="devices-loading-box">Consultando terminales globales...</div>
          ) : devices.length === 0 ? (
            <div className="devices-empty-box">No se encontraron dispositivos con los criterios de búsqueda.</div>
          ) : (
            <table className="admin-devices-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Terminal / SO</th>
                  <th>Estado</th>
                  <th>Sesiones</th>
                  <th>Último Acceso</th>
                  <th>Acción (CU-05)</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const isRevoked = d.estado === 'REVOCADO';
                  const isBusy = actionLoadingId === d.id_dispositivo;
                  const DeviceIcon = d.tipo === 'MOVIL' ? Smartphone : d.tipo === 'DESKTOP' ? Laptop : Globe;

                  return (
                    <tr key={d.id_dispositivo} className={isRevoked ? 'row-revoked' : ''}>
                      <td>
                        <div className="user-cell">
                          <strong>{d.usuario_nombre}</strong>
                          <small>{d.usuario_correo}</small>
                        </div>
                      </td>
                      <td>
                        <div className="device-cell">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <DeviceIcon size={16} /> {d.nombre || 'Terminal Web'}
                          </span>
                          <small>{d.sistema_operativo} • {d.tipo}</small>
                          <small className="device-id-mono" title={d.identificador_seguro}>
                            {d.identificador_seguro ? `${d.identificador_seguro.substring(0, 12)}...` : ''}
                          </small>
                        </div>
                      </td>
                      <td>
                        {isRevoked ? (
                          <span className="device-pill-revoked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Ban size={12} /> Revocado
                          </span>
                        ) : d.es_confiable ? (
                          <span className="device-pill-trusted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <ShieldCheck size={12} /> Confiable
                          </span>
                        ) : (
                          <span className="device-pill-untrusted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <AlertTriangle size={12} /> No Confiable
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`sessions-chip ${d.sesiones_activas > 0 ? 'active' : 'zero'}`}>
                          {d.sesiones_activas} activa{d.sesiones_activas === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td>
                        <small>{new Date(d.ultimo_acceso).toLocaleString()}</small>
                      </td>
                      <td>
                        {isRevoked ? (
                          <span className="revoked-tag">Invalidador por Admin</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-danger-sm"
                            onClick={() => handleOpenRevokePrompt(d)}
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              'Revocando...'
                            ) : (
                              <>
                                <ShieldAlert size={14} /> Revocar
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal de confirmación de revocación con motivo */}
        {revokingDevice && (
          <div className="submodal-overlay" onClick={() => setRevokingDevice(null)}>
            <div className="submodal-card" onClick={(e) => e.stopPropagation()}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldAlert size={18} color="#ef4444" /> Confirmar Revocación Inmediata
              </h4>
              <p>
                Estás a punto de invalidar la terminal <strong>{revokingDevice.nombre}</strong> del usuario <strong>{revokingDevice.usuario_correo}</strong>.
              </p>
              <p className="submodal-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={15} color="#fbbf24" style={{ flexShrink: 0 }} />
                Todas las sesiones activas en este equipo serán cerradas inmediatamente.
              </p>

              <div className="form-field" style={{ marginTop: '1rem' }}>
                <label htmlFor="revoke-reason">Motivo de seguridad (queda registrado en auditoría):</label>
                <input
                  id="revoke-reason"
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="input-control"
                  placeholder="Ej: Reporte de robo, sospecha de compromiso, etc."
                  required
                />
              </div>

              <div className="submodal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRevokingDevice(null)}
                  disabled={Boolean(actionLoadingId)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmRevoke}
                  disabled={Boolean(actionLoadingId) || !revokeReason.trim()}
                >
                  {actionLoadingId ? 'Revocando...' : 'Confirmar Revocación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
