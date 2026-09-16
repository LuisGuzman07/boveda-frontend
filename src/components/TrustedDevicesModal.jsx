import React, { useState, useEffect } from 'react';
import {
  listDevices,
  setDeviceTrust,
  revokeDeviceTrust,
  deleteDevice,
  registerDevice,
  getOrCreateDeviceId,
} from '../services/deviceService';

export default function TrustedDevicesModal({ isOpen, onClose, onDeviceUpdated }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDevices();
      setDevices(data.dispositivos || []);
    } catch (err) {
      console.error('Error al listar dispositivos:', err);
      setError(err.response?.data?.detail || 'Error al consultar dispositivos autorizados.');
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
  }, [isOpen]);

  const handleToggleTrust = async (device) => {
    setActionLoadingId(device.id_dispositivo);
    setError(null);
    setSuccessMsg(null);

    const newTrustStatus = !device.es_confiable;
    try {
      if (newTrustStatus) {
        await setDeviceTrust(device.id_dispositivo, true);
        setSuccessMsg(`Dispositivo '${device.nombre}' autorizado como de confianza.`);
      } else {
        await revokeDeviceTrust(device.id_dispositivo);
        setSuccessMsg(`Se revocó la confianza del dispositivo '${device.nombre}'.`);
      }
      await fetchDevices();
      onDeviceUpdated?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al modificar estado de confianza.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteDevice = async (device) => {
    if (!window.confirm(`¿Estás seguro de desvincular el dispositivo '${device.nombre}'? Se cerrarán las sesiones activas en él.`)) {
      return;
    }

    setActionLoadingId(device.id_dispositivo);
    setError(null);
    setSuccessMsg(null);

    try {
      await deleteDevice(device.id_dispositivo);
      setSuccessMsg(`Dispositivo '${device.nombre}' desvinculado con éxito.`);
      await fetchDevices();
      onDeviceUpdated?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al desvincular dispositivo.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRegisterCurrentAsTrusted = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await registerDevice(true);
      setSuccessMsg('Este dispositivo ha sido registrado y autorizado como de confianza.');
      await fetchDevices();
      onDeviceUpdated?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar el dispositivo actual.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentLocalId = getOrCreateDeviceId();
  const currentDevice = devices.find((d) => d.identificador_seguro === currentLocalId || d.es_dispositivo_actual);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">💻</span>
            <div>
              <h3>Dispositivos de Confianza (CU-04)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Gestión y autorización de hardware local seguro
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            ✕
          </button>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="alert-banner success" style={{ marginBottom: '1rem' }}>
            <span>✅</span>
            <p>{successMsg}</p>
          </div>
        )}

        {/* Banner Zero-Knowledge */}
        <div className="device-zk-banner">
          <div className="zk-icon">🔒</div>
          <div className="zk-text">
            <strong>Garantía de Cero Conocimiento:</strong> Marcar un dispositivo como confiable autoriza el hardware para el acceso al sistema sin comprometer tus claves maestras de cifrado, las cuales nunca salen de tu almacenamiento local.
          </div>
        </div>

        {/* Lista de Dispositivos */}
        <div className="devices-list-container">
          {loading && devices.length === 0 ? (
            <div className="devices-loading-box">
              <span>Cargando dispositivos vinculados...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="devices-empty-box">
              <p>No se encontraron dispositivos vinculados.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRegisterCurrentAsTrusted}
              >
                🛡️ Registrar este dispositivo como de confianza
              </button>
            </div>
          ) : (
            <div className="devices-stack">
              {devices.map((device) => {
                const isCurrent = Boolean(device.es_dispositivo_actual || device.identificador_seguro === currentLocalId);
                const isBusy = actionLoadingId === device.id_dispositivo;
                const icon = device.tipo === 'MOVIL' ? '📱' : device.tipo === 'DESKTOP' ? '💻' : '🌐';

                return (
                  <div
                    key={device.id_dispositivo}
                    className={`device-item-card ${isCurrent ? 'device-card-current' : ''}`}
                  >
                    <div className="device-card-header">
                      <div className="device-icon-wrapper">{icon}</div>
                      <div className="device-main-info">
                        <div className="device-title-row">
                          <h4 className="device-name">{device.nombre || 'Dispositivo sin nombre'}</h4>
                          {isCurrent && (
                            <span className="device-pill-current">
                              💻 Este Dispositivo (Actual)
                            </span>
                          )}
                          {device.es_confiable ? (
                            <span className="device-pill-trusted">
                              🛡️ Confiable
                            </span>
                          ) : (
                            <span className="device-pill-untrusted">
                              ⚠️ No Confiable
                            </span>
                          )}
                        </div>
                        <div className="device-meta-row">
                          <span>SO: {device.sistema_operativo || 'Desconocido'}</span>
                          <span>•</span>
                          <span>Tipo: {device.tipo}</span>
                          <span>•</span>
                          <span title={device.identificador_seguro} className="device-fingerprint-hint">
                            Huella: {device.identificador_seguro ? `${device.identificador_seguro.substring(0, 14)}...` : 'N/A'}
                          </span>
                        </div>
                        <div className="device-time-row">
                          <small>
                            Último acceso: {new Date(device.ultimo_acceso).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Acciones del Dispositivo */}
                    <div className="device-card-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${device.es_confiable ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleToggleTrust(device)}
                        disabled={isBusy}
                      >
                        {isBusy
                          ? 'Actualizando...'
                          : device.es_confiable
                          ? '✕ Revocar Confianza'
                          : '🛡️ Autorizar como Confiable'}
                      </button>

                      {!isCurrent && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => handleDeleteDevice(device)}
                          disabled={isBusy}
                        >
                          🗑️ Desvincular
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {currentDevice && !currentDevice.es_confiable && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => handleToggleTrust(currentDevice)}
              disabled={actionLoadingId === currentDevice.id_dispositivo}
            >
              🛡️ Autorizar este equipo como de confianza
            </button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
