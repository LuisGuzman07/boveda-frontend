import React, { useState, useEffect } from 'react';
import { listPolicies, updatePolicy } from '../services/policyService';
import { useInactivity } from '../context/InactivityContext';

const POLICY_METADATA = {
  INACTIVITY_TIMEOUT_MINUTES: {
    icon: '⏱️',
    min: 1,
    max: 120,
    unit: 'minutos',
    help: 'Tiempo sin interacción del usuario antes de purgar claves volátiles y bloquear la terminal (CU-12).',
  },
  MAX_FAILED_LOGIN_ATTEMPTS: {
    icon: '⚠️',
    min: 3,
    max: 10,
    unit: 'intentos',
    help: 'Límite de contraseñas erróneas consecutivas permitidas antes de bloquear preventivamente la cuenta.',
  },
  LOCKOUT_DURATION_MINUTES: {
    icon: '🔒',
    min: 5,
    max: 120,
    unit: 'minutos',
    help: 'Tiempo durante el cual la cuenta se mantendrá bloqueada tras exceder los intentos fallidos.',
  },
  VAULT_SESSION_DURATION_MINUTES: {
    icon: '🗄️',
    min: 5,
    max: 60,
    unit: 'minutos',
    help: 'Vigencia de la sesión de acceso a bóvedas autenticada mediante segundo factor TOTP.',
  },
  AUDIT_RETENTION_DAYS: {
    icon: '📜',
    min: 30,
    max: 365,
    unit: 'días',
    help: 'Plazo mínimo legal durante el cual no se permite la depuración de eventos inmutables en bitácora.',
  },
  PASSWORD_MIN_LENGTH: {
    icon: '🔑',
    min: 8,
    max: 32,
    unit: 'caracteres',
    help: 'Longitud mínima exigida al crear contraseñas de acceso y frases de paso de bóvedas.',
  },
};

export default function SecurityPoliciesModal({ isOpen, onClose, onPolicyUpdated }) {
  const { refreshPolicy } = useInactivity();
  const [policies, setPolicies] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPolicies();
      setPolicies(data);
      const valMap = {};
      data.forEach((p) => {
        valMap[p.codigo] = p.valor;
      });
      setValues(valMap);
    } catch (err) {
      console.error('Error al listar políticas de seguridad:', err);
      setError(err.response?.data?.detail || 'Error al consultar las políticas de seguridad.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      fetchPolicies();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (codigo, val) => {
    setValues((prev) => ({
      ...prev,
      [codigo]: val,
    }));
  };

  const handleSavePolicy = async (policy) => {
    const code = policy.codigo;
    const newVal = values[code];
    const meta = POLICY_METADATA[code];

    if (meta) {
      const num = parseInt(newVal, 10);
      if (isNaN(num) || num < meta.min || num > meta.max) {
        setError(`El valor para ${policy.nombre} debe estar entre ${meta.min} y ${meta.max} ${meta.unit}.`);
        return;
      }
    }

    setSavingCode(code);
    setError(null);
    setSuccess(null);

    try {
      await updatePolicy(code, newVal, policy.activa);
      setSuccess(`Política '${policy.nombre}' actualizada exitosamente.`);
      await fetchPolicies();
      if (code === 'INACTIVITY_TIMEOUT_MINUTES') {
        refreshPolicy?.();
      }
      onPolicyUpdated?.();
    } catch (err) {
      console.error('Error al actualizar política:', err);
      setError(err.response?.data?.detail || err.message || 'Error al actualizar la política.');
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card-wide"
        style={{ maxWidth: '820px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🛡️</span>
            <div>
              <h3>Políticas de Seguridad Globales (CU-17)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Configuración dinámica de umbrales, inactividad y retención del sistema
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
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
        {success && (
          <div className="alert-banner success" style={{ marginBottom: '1rem' }}>
            <span>✅</span>
            <p>{success}</p>
          </div>
        )}

        {/* Banner explicativo */}
        <div className="device-zk-banner" style={{ marginBottom: '1.25rem' }}>
          <div className="zk-icon">⚙️</div>
          <div className="zk-text">
            <strong>Aplicación Inmediata:</strong> Los cambios en estas políticas entran en vigencia de inmediato para todas las terminales y sesiones activas. Cada modificación se audita inmutablemente registrando usuario, IP y valor previo.
          </div>
        </div>

        {/* Contenido / Lista de Políticas */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem' }}>
          {loading && policies.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', gap: '0.75rem' }}>
              <div className="spinner" />
              <span>Cargando políticas de seguridad...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {policies.map((p) => {
                const meta = POLICY_METADATA[p.codigo] || {
                  icon: '📌',
                  min: 1,
                  max: 9999,
                  unit: '',
                  help: p.descripcion,
                };
                const isSaving = savingCode === p.codigo;
                const isModified = values[p.codigo] !== p.valor;

                return (
                  <div
                    key={p.codigo}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: isModified ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-subtle)',
                      borderRadius: '0.65rem',
                      padding: '1.1rem 1.25rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.35rem' }}>{meta.icon}</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {p.nombre}
                          </h4>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {p.codigo}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="chip-count chip-success" style={{ fontSize: '0.7rem' }}>
                          {p.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.45 }}>
                      {meta.help || p.descripcion}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <input
                          type="number"
                          className="input-field"
                          min={meta.min}
                          max={meta.max}
                          value={values[p.codigo] !== undefined ? values[p.codigo] : p.valor}
                          onChange={(e) => handleInputChange(p.codigo, e.target.value)}
                          disabled={isSaving}
                          style={{
                            width: '110px',
                            textAlign: 'center',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1rem',
                            fontWeight: 600,
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {meta.unit} (Rango: {meta.min} - {meta.max})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {p.fecha_actualizacion && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            Actualizado: {new Date(p.fecha_actualizacion).toLocaleDateString()}
                            {p.modificada_por_nombre ? ` por ${p.modificada_por_nombre}` : ''}
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSavePolicy(p)}
                          disabled={isSaving || !isModified}
                        >
                          {isSaving ? 'Guardando...' : isModified ? '💾 Aplicar' : 'Al día'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
