import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  Info,
  CheckCircle2,
  Lock,
  Search,
  ArrowLeft,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  runLocalAnomalyAnalysis,
  getLatestAnomalyRun,
  getAnomalyStats,
} from '../services/auditService';

export default function AnomalyDetectionModal({ isOpen, onClose, onInspectEvent }) {
  const [loading, setLoading] = useState(false);
  const [runningScan, setRunningScan] = useState(false);
  const [latestRun, setLatestRun] = useState(null);
  const [stats, setStats] = useState(null);
  const [filterMode, setFilterMode] = useState('anomalies'); // 'all', 'anomalies', 'critical'
  const [error, setError] = useState(null);
  const [showCriteria, setShowCriteria] = useState(false);
  const [inspectedFinding, setInspectedFinding] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [latest, generalStats] = await Promise.all([
        getLatestAnomalyRun().catch(() => null),
        getAnomalyStats().catch(() => null),
      ]);
      setLatestRun(latest);
      setStats(generalStats);
    } catch (err) {
      console.error('Error al cargar datos del análisis de anomalías:', err);
      setError(err.response?.data?.detail || 'No se pudieron recuperar los análisis de anomalías.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setInspectedFinding(null);
    }
  }, [isOpen]);

  const handleRunScan = async () => {
    setRunningScan(true);
    setError(null);
    try {
      const result = await runLocalAnomalyAnalysis();
      setLatestRun(result);
      const generalStats = await getAnomalyStats().catch(() => null);
      setStats(generalStats);
      setInspectedFinding(null);
    } catch (err) {
      console.error('Error al ejecutar análisis de anomalías:', err);
      setError(err.response?.data?.detail || 'Error al ejecutar el escaneo local de anomalías.');
    } finally {
      setRunningScan(false);
    }
  };

  if (!isOpen) return null;

  const hallazgos = latestRun?.hallazgos || [];
  const filteredHallazgos = hallazgos.filter((h) => {
    if (filterMode === 'critical') {
      return h.nivel_riesgo === 'CRITICO' || h.nivel_riesgo === 'ALTO';
    }
    if (filterMode === 'anomalies') {
      return h.etiqueta === 'ANOMALIA';
    }
    return true;
  });

  const getRiskBadge = (nivel) => {
    switch (nivel) {
      case 'CRITICO':
        return <span className="audit-badge audit-badge-danger" style={{ fontWeight: 'bold' }}>CRÍTICO</span>;
      case 'ALTO':
        return <span className="audit-badge audit-badge-warning">ALTO</span>;
      case 'MEDIO':
        return <span className="audit-badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}>MEDIO</span>;
      case 'NORMAL':
      default:
        return <span className="audit-badge audit-badge-success">NORMAL</span>;
    }
  };

  const getCriteriaExplanation = (score) => {
    if (score < -0.10) {
      return {
        level: 'CRÍTICO',
        color: 'var(--danger)',
        rule: 'Score < -0.1000',
        desc: 'Aislamiento estadístico extremo en los árboles de decisión. Se activa ante fallos de seguridad (FALLO, BLOQUEO), horarios atípicos o acciones críticas con muy baja frecuencia.',
      };
    }
    if (score < -0.05) {
      return {
        level: 'ALTO',
        color: '#fbbf24',
        rule: '-0.1000 <= Score < -0.0500',
        desc: 'Desviación estadística notable respecto a la media histórica del sistema. Representa operaciones poco comunes en horario, terminal o usuario.',
      };
    }
    if (score < 0.0) {
      return {
        level: 'MEDIO',
        color: '#facc15',
        rule: '-0.0500 <= Score < 0.0000',
        desc: 'Desviación moderada. El evento difiere ligeramente del patrón común pero no representa un riesgo operativo inminente.',
      };
    }
    return {
      level: 'NORMAL',
      color: 'var(--success)',
      rule: 'Score >= 0.0000',
      desc: 'Comportamiento habitual altamente correlacionado con la distribución normal de la organización.',
    };
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card anomaly-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1100px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="modal-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex' }}>
              <BrainCircuit size={24} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Detección de Anomalías mediante IA Local</h3>
                <span className="badge-local-ai" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.4)', fontWeight: 600 }}>
                  CU-22 · 100% On-Premise (Isolation Forest)
                </span>
              </div>
              <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                Monitoreo determinista de desviaciones estadísticas sobre la bitácora criptográfica inmutable.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Vista Detallada de un Hallazgo (si el usuario hizo clic en Ver) */}
        {inspectedFinding ? (
          <div style={{ margin: '1rem 0' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setInspectedFinding(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}
            >
              <ArrowLeft size={16} /> Volver a la Lista de Hallazgos
            </button>

            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DIAGNÓSTICO DEL EVENTO EN BITÁCORA</span>
                  <h3 style={{ margin: '0.2rem 0 0.4rem 0', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    Secuencia #{inspectedFinding.secuencia_evento} · <code>{inspectedFinding.accion}</code>
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                    ID: <span className="font-mono">{inspectedFinding.id_evento}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Puntaje de Inferencia (Decision Score)</div>
                    <code style={{ fontSize: '1.2rem', fontWeight: 700, color: inspectedFinding.decision_score < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {inspectedFinding.decision_score.toFixed(4)}
                    </code>
                  </div>
                  <div>
                    {getRiskBadge(inspectedFinding.nivel_riesgo)}
                  </div>
                </div>
              </div>

              {/* Explicación del Criterio */}
              {(() => {
                const info = getCriteriaExplanation(inspectedFinding.decision_score);
                return (
                  <div
                    style={{
                      background: inspectedFinding.nivel_riesgo === 'CRITICO' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                      border: `1px solid ${inspectedFinding.nivel_riesgo === 'CRITICO' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      borderRadius: '0.6rem',
                      padding: '1rem 1.25rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <AlertTriangle size={18} style={{ color: info.color }} />
                      <strong style={{ color: info.color, fontSize: '0.95rem' }}>
                        Criterio de Clasificación: Nivel {info.level} ({info.rule})
                      </strong>
                    </div>
                    <p style={{ margin: '0.2rem 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: '1.45' }}>
                      <strong>Explicación del Motor de IA:</strong> {inspectedFinding.explicacion}
                    </p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {info.desc}
                    </div>
                  </div>
                );
              })()}

              {/* Grid de Factores Evaluados por el Modelo */}
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                Factores de Telemetría Analizados por Isolation Forest:
              </h4>

              <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="detail-item">
                  <span className="detail-label">Acción Operativa</span>
                  <code className="detail-value font-mono">{inspectedFinding.accion}</code>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Resultado</span>
                  <span className={`audit-badge ${inspectedFinding.resultado === 'EXITO' ? 'audit-badge-success' : 'audit-badge-danger'}`}>
                    {inspectedFinding.resultado || 'N/A'}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Fecha y Hora</span>
                  <span className="detail-value">
                    {inspectedFinding.fecha_evento
                      ? new Date(inspectedFinding.fecha_evento).toLocaleString('es-ES')
                      : '—'}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Usuario / Origen</span>
                  <span className="detail-value">
                    {inspectedFinding.usuario_nombre || 'Sistema'} ({inspectedFinding.usuario_correo || 'N/A'})
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Dirección IP</span>
                  <span className="detail-value font-mono">{inspectedFinding.direccion_ip || '127.0.0.1'}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Categoría</span>
                  <span className="detail-value">{inspectedFinding.tipo_evento || 'OPERACION'}</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setInspectedFinding(null)}
                >
                  Volver a Lista
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (onInspectEvent) {
                      onInspectEvent(inspectedFinding.id_evento, inspectedFinding.secuencia_evento);
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Search size={15} /> Inspeccionar en Bitácora General
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Banner de Garantías de Privacidad */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '0.6rem',
                padding: '0.85rem 1.1rem',
                margin: '1rem 0 1rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                <Lock size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
                <span>
                  <strong>Zero-Knowledge & Privacidad:</strong> La inferencia se ejecuta exclusivamente en la CPU local del servidor. No envía telemetría a proveedores externos ni analiza payloads confidenciales.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {latestRun?.estado_integridad === 'VALID' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> Cadena Verificada
                  </span>
                ) : latestRun?.estado_integridad === 'INVALID' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <AlertTriangle size={16} /> Cadena Corrompida
                  </span>
                ) : null}
              </div>
            </div>

            {/* Acordeón Explicativo: Criterios y Umbrales */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.6rem',
                marginBottom: '1.25rem',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setShowCriteria(!showCriteria)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={16} style={{ color: '#818cf8' }} />
                  <span>¿Con qué criterio clasifica la IA como Crítico, Alto, Medio o Normal?</span>
                </div>
                {showCriteria ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {showCriteria && (
                <div
                  style={{
                    padding: '0.75rem 1rem 1rem 1rem',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.825rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5',
                  }}
                >
                  <p style={{ margin: '0 0 0.75rem 0' }}>
                    El algoritmo <strong>Isolation Forest</strong> cuantifica el aislamiento de cada evento en una estructura de árboles de partición aleatoria sobre los más de 500 eventos de la bitácora. Cuanto más rápido se aísla un evento respecto a la población, más negativo es su <code>decision_score</code>:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ padding: '0.6rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.4rem' }}>
                      <strong style={{ color: 'var(--danger)' }}>🔴 CRÍTICO (Score &lt; -0.1000):</strong>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.775rem' }}>
                        Desviación extrema. Ocurre con fallos de autenticación (<code>LOGIN_MFA_FALLIDO</code>), bloqueos, denegaciones reiteradas o actividades sensibles en horas atípicas.
                      </p>
                    </div>

                    <div style={{ padding: '0.6rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '0.4rem' }}>
                      <strong style={{ color: '#fbbf24' }}>🟠 ALTO (-0.1000 a -0.0500):</strong>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.775rem' }}>
                        Desviación notable respecto a la media. Inicios de sesión exitosos pero fuera de la franja habitual o terminales inusuales.
                      </p>
                    </div>

                    <div style={{ padding: '0.6rem', background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '0.4rem' }}>
                      <strong style={{ color: '#facc15' }}>🟡 MEDIO (-0.0500 a 0.0000):</strong>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.775rem' }}>
                        Desviación moderada. Operaciones poco frecuentes pero dentro del rango tolerable.
                      </p>
                    </div>

                    <div style={{ padding: '0.6rem', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '0.4rem' }}>
                      <strong style={{ color: 'var(--success)' }}>🟢 NORMAL (&gt;= 0.0000):</strong>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.775rem' }}>
                        Actividad común y predecible alineada al perfil estadístico recurrente de la organización.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="alert-banner error" style={{ marginBottom: '1.25rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <p>{error}</p>
              </div>
            )}

            {/* Tarjetas de Métricas de la Ejecución */}
            <div className="audit-stats-grid" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="stat-card">
                <span className="stat-label">Total Eventos Analizados</span>
                <span className="stat-number">{latestRun?.total_eventos ?? 0}</span>
              </div>

              <div className="stat-card stat-danger">
                <span className="stat-label">Anomalías Críticas</span>
                <span className="stat-number">{latestRun?.conteo_critico ?? 0}</span>
              </div>

              <div className="stat-card stat-warning">
                <span className="stat-label">Anomalías Altas / Medias</span>
                <span className="stat-number">
                  {(latestRun?.conteo_alto ?? 0) + (latestRun?.conteo_medio ?? 0)}
                </span>
              </div>

              <div className="stat-card stat-success">
                <span className="stat-label">Eventos de Perfil Normal</span>
                <span className="stat-number">
                  {Math.max(0, (latestRun?.total_eventos ?? 0) - (latestRun?.conteo_anomalias ?? 0))}
                </span>
              </div>
            </div>

            {/* Barra de Acciones y Filtros */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mostrar:</span>
                <button
                  type="button"
                  className={`btn btn-sm ${filterMode === 'anomalies' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterMode('anomalies')}
                >
                  Solo Anomalías ({latestRun?.conteo_anomalias ?? 0})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filterMode === 'critical' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterMode('critical')}
                >
                  Críticas / Altas ({latestRun?.conteo_critico ?? 0})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterMode('all')}
                >
                  Todos ({hallazgos.length})
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRunScan}
                disabled={runningScan}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={15} className={runningScan ? 'spin-icon' : ''} />
                {runningScan ? 'Ejecutando Inferencia Local...' : 'Ejecutar Nuevo Análisis'}
              </button>
            </div>

            {/* Tabla de Hallazgos */}
            <div className="audit-table-card">
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Secuencia</th>
                      <th style={{ width: '130px' }}>Fecha</th>
                      <th>Acción / Categoría</th>
                      <th>Usuario / Origen</th>
                      <th style={{ width: '110px' }}>Score IA</th>
                      <th style={{ width: '95px' }}>Riesgo</th>
                      <th>Explicación del Algoritmo</th>
                      <th style={{ textAlign: 'right', width: '90px' }}>Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="table-empty-cell">
                          Cargando resultados de la inferencia local...
                        </td>
                      </tr>
                    ) : filteredHallazgos.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="table-empty-cell">
                          {filterMode === 'anomalies'
                            ? 'No se detectaron anomalías en la última ejecución del modelo.'
                            : 'No hay eventos disponibles con el filtro seleccionado.'}
                        </td>
                      </tr>
                    ) : (
                      filteredHallazgos.map((h) => (
                        <tr key={h.id_hallazgo || h.secuencia_evento} className="audit-table-row">
                          <td className="cell-date">
                            <code style={{ color: '#a5b4fc' }}>#{h.secuencia_evento}</code>
                          </td>
                          <td className="cell-date">
                            {h.fecha_evento
                              ? new Date(h.fecha_evento).toLocaleString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="cell-action">
                            <div>
                              <code className="action-code">{h.accion || 'OPERACIÓN'}</code>
                            </div>
                            {h.tipo_evento && (
                              <span className="category-chip" style={{ marginTop: '0.2rem', display: 'inline-block' }}>
                                {h.tipo_evento}
                              </span>
                            )}
                          </td>
                          <td className="cell-user">
                            <div>
                              <div className="user-name-text">{h.usuario_nombre || 'Sistema'}</div>
                              <div className="user-email-text">{h.direccion_ip || '127.0.0.1'}</div>
                            </div>
                          </td>
                          <td>
                            <code
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: h.decision_score < 0 ? 'var(--danger)' : 'var(--success)',
                                fontWeight: 600,
                              }}
                            >
                              {h.decision_score.toFixed(4)}
                            </code>
                          </td>
                          <td>{getRiskBadge(h.nivel_riesgo)}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-main)', maxWidth: '280px' }}>
                            {h.explicacion}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => setInspectedFinding(h)}
                              title="Ver diagnóstico completo del hallazgo de IA"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Técnico del Modelo */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1rem',
                borderRadius: '0.5rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <strong>Parámetros del Motor:</strong> Modelo: <code>{latestRun?.model_version || 'isolation-forest-local-1'}</code> · Semilla Determinista: <code>{latestRun?.random_state || 20260921}</code> · Estimadores: 100 · Contaminación: Auto
              </div>
              <div>
                <strong>Fecha Ejecución:</strong>{' '}
                {latestRun?.fecha_creacion
                  ? new Date(latestRun.fecha_creacion).toLocaleString('es-ES')
                  : 'Pendiente'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
