import React, { useState, useEffect, useCallback } from 'react';
import { Download, Search, AlertTriangle, ScrollText, X, ShieldCheck, ScanSearch } from 'lucide-react';
import { createComplianceReport, downloadComplianceReport, getAuditEvents, getAuditStats, getComplianceReports, getLocalAnomalyRuns, runLocalAnomalyAnalysis, verifyAuditChain } from '../services/auditService';

export default function AuditPage() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFormat, setReportFormat] = useState('json');
  const [reportStart, setReportStart] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [reportEnd, setReportEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [resultado, setResultado] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [analysisRuns, setAnalysisRuns] = useState([]);
  const [analysing, setAnalysing] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: 15,
      };
      if (searchQuery.trim()) params.query = searchQuery.trim();
      if (tipoEvento) params.tipo_evento = tipoEvento;
      if (resultado) params.resultado = resultado;

      const data = await getAuditEvents(params);
      setEvents(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar los registros de auditoría.');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, tipoEvento, resultado]);

  const fetchStats = async () => {
    try {
      const data = await getAuditStats();
      setStats(data);
    } catch (err) {
      console.error('Error al cargar estadísticas de auditoría:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchIntegrity = async () => {
    try {
      setIntegrity(await verifyAuditChain());
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo verificar la cadena de auditoría.');
    }
  };

  const fetchAnalysisRuns = async () => {
    try {
      setAnalysisRuns(await getLocalAnomalyRuns());
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar los análisis locales.');
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      setReports(await getComplianceReports());
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar los reportes de cumplimiento.');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleAnalysis = async () => {
    setAnalysing(true);
    try {
      await runLocalAnomalyAnalysis();
      await fetchAnalysisRuns();
      await fetchIntegrity();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo ejecutar el análisis local.');
    } finally {
      setAnalysing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleGenerateReport = async () => {
    setReportGenerating(true);
    setError(null);
    try {
      await createComplianceReport({
        fecha_inicio: `${reportStart}T00:00:00Z`,
        fecha_fin: `${reportEnd}T23:59:59Z`,
        tipo_evento: tipoEvento || null,
        resultado: resultado || null,
        formato: reportFormat,
      });
      await fetchReports();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo generar el reporte seguro.');
    } finally {
      setReportGenerating(false);
    }
  };

  const getBadgeClass = (res) => {
    switch (res?.toUpperCase()) {
      case 'EXITO':
        return 'audit-badge-success';
      case 'FALLO':
        return 'audit-badge-danger';
      case 'DENEGADO':
      case 'BLOQUEO':
        return 'audit-badge-warning';
      default:
        return 'audit-badge-info';
    }
  };

  return (
    <div className="container audit-container">
      {/* Header */}
      <div className="audit-header-row">
        <div>
          <h2>Bitácora de Auditoría</h2>
          <p className="section-subtitle">
            Registro continuo e inmutable de eventos de seguridad, accesos y operaciones.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-export" onClick={fetchReports}>
          Ver reportes seguros
        </button>
      </div>

      <div className="audit-filters-bar" style={{ marginBottom: '1rem' }}>
        <div>
          <strong>Integridad de cadena: </strong>
          {integrity ? (integrity.status === 'VALID' ? `VÁLIDA (${integrity.checked_events} eventos)` : `INVÁLIDA en secuencia ${integrity.first_invalid_sequence}`) : 'Sin verificar'}
        </div>
        <div className="select-filters-group">
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchIntegrity} disabled={loading}>
            <ShieldCheck size={15} /> Verificar cadena
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAnalysis} disabled={analysing}>
            <ScanSearch size={15} /> {analysing ? 'Analizando...' : 'Análisis local'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchAnalysisRuns}>
            Ver análisis
          </button>
        </div>
      </div>

      {analysisRuns.length > 0 && (
        <div className="alert-banner" style={{ marginBottom: '1.5rem' }}>
          <p>Último análisis local: {analysisRuns[0].estado} · {analysisRuns[0].total_eventos} eventos · {analysisRuns[0].hallazgos?.filter((item) => item.etiqueta === 'ANOMALIA').length || 0} anomalías. No se envían datos fuera del sistema.</p>
        </div>
      )}

      <section className="audit-table-card" style={{ marginBottom: '1.5rem', padding: '1rem' }} aria-labelledby="reportes-cumplimiento">
        <h3 id="reportes-cumplimiento">Reportes de cumplimiento</h3>
        <p className="section-subtitle">Solo incluye agregados y referencias aprobadas; no exporta eventos ni metadatos sensibles.</p>
        <div className="select-filters-group" style={{ marginBottom: '1rem' }}>
          <label>Desde <input className="input-control" type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} /></label>
          <label>Hasta <input className="input-control" type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} /></label>
          <label>Formato <select className="input-control select-control" value={reportFormat} onChange={(e) => setReportFormat(e.target.value)}><option value="json">JSON</option><option value="csv">CSV</option></select></label>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleGenerateReport} disabled={reportGenerating || !reportStart || !reportEnd}>
            {reportGenerating ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
        {reportsLoading ? (
          <p className="text-dim">Cargando reportes de cumplimiento...</p>
        ) : reports.length === 0 ? (
          <p className="text-dim">No hay reportes generados para descargar.</p>
        ) : (
          <div className="table-responsive"><table className="audit-table"><thead><tr><th>Generado</th><th>Periodo</th><th>Versión</th><th>Eventos</th><th>Descarga</th></tr></thead><tbody>
            {reports.map((report) => <tr key={report.id_reporte}><td>{new Date(report.fecha_generacion).toLocaleString('es-ES')}</td><td>{report.filtros.fecha_inicio.slice(0, 10)} a {report.filtros.fecha_fin.slice(0, 10)}</td><td>{report.version}</td><td>{report.resumen.event_counts.total}</td><td><button type="button" className="btn btn-secondary btn-xs" onClick={() => downloadComplianceReport(report.id_reporte, reportFormat)}><Download size={14} /> Descargar</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      {/* Tarjetas de Estadísticas Rápidas */}
      {stats && (
        <div className="audit-stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total de Eventos</span>
            <span className="stat-number">{stats.total_eventos}</span>
          </div>
          <div className="stat-card stat-success">
            <span className="stat-label">Operaciones Exitosas</span>
            <span className="stat-number">{stats.eventos_exitosos}</span>
          </div>
          <div className="stat-card stat-danger">
            <span className="stat-label">Intentos Fallidos</span>
            <span className="stat-number">{stats.eventos_fallidos}</span>
          </div>
          <div className="stat-card stat-warning">
            <span className="stat-label">Accesos Denegados / Bloqueos</span>
            <span className="stat-number">{stats.eventos_denegados}</span>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="audit-filters-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Buscar por usuario, correo, IP o acción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-control search-input"
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            <Search size={15} /> Buscar
          </button>
        </form>

        <div className="select-filters-group">
          <select
            value={tipoEvento}
            onChange={(e) => {
              setTipoEvento(e.target.value);
              setPage(1);
            }}
            className="input-control select-control"
          >
            <option value="">Todas las Categorías</option>
            <option value="AUTENTICACION">Autenticación</option>
            <option value="SEGURIDAD_MFA">Seguridad MFA</option>
            <option value="BOVEDA">Bóvedas</option>
            <option value="ARCHIVO">Archivos</option>
            <option value="CONTROL_ACCESO">Control de Acceso</option>
          </select>

          <select
            value={resultado}
            onChange={(e) => {
              setResultado(e.target.value);
              setPage(1);
            }}
            className="input-control select-control"
          >
            <option value="">Todos los Estados</option>
            <option value="EXITO">Éxito</option>
            <option value="FALLO">Fallo</option>
            <option value="DENEGADO">Denegado</option>
            <option value="BLOQUEO">Bloqueo</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert-banner error" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <p>{error}</p>
        </div>
      )}

      {/* Tabla de Eventos */}
      <div className="audit-table-card">
        <div className="table-responsive">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Categoría</th>
                <th>Origen</th>
                <th>Resultado</th>
                <th style={{ textAlign: 'right' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty-cell">
                    Cargando eventos de bitácora...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-cell">
                    No se encontraron eventos registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id_evento} className="audit-table-row">
                    <td className="cell-date">
                      {new Date(ev.fecha_evento).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="cell-user">
                      {ev.usuario ? (
                        <div>
                          <div className="user-name-text">{ev.usuario.nombre}</div>
                          <div className="user-email-text">{ev.usuario.correo}</div>
                        </div>
                      ) : (
                        <span className="text-dim">Sistema / Anónimo</span>
                      )}
                    </td>
                    <td className="cell-action">
                      <code className="action-code">{ev.accion}</code>
                    </td>
                    <td className="cell-type">
                      <span className="category-chip">{ev.tipo_evento}</span>
                    </td>
                    <td className="cell-origin">
                      <div>{ev.direccion_ip || '127.0.0.1'}</div>
                      {ev.dispositivo && (
                        <div className="text-dim text-xs">
                          {ev.dispositivo.nombre} ({ev.dispositivo.tipo})
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`audit-badge ${getBadgeClass(ev.resultado)}`}>
                        {ev.resultado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => setSelectedEvent(ev)}
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

        {/* Paginación */}
        <div className="table-pagination-row">
          <span className="pagination-info">
            Mostrando página {page} de {totalPages} ({total} eventos totales)
          </span>
          <div className="pagination-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Evento */}
      {selectedEvent && (
        <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div className="modal-card audit-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon">
                  <ScrollText size={20} />
                </span>
                <h3>Detalle del Evento de Auditoría</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">ID del Evento</span>
                <code className="detail-value font-mono">{selectedEvent.id_evento}</code>
              </div>

              <div className="detail-item">
                <span className="detail-label">Fecha y Hora</span>
                <span className="detail-value">
                  {new Date(selectedEvent.fecha_evento).toLocaleString('es-ES')}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Acción Realizada</span>
                <code className="detail-value font-mono">{selectedEvent.accion}</code>
              </div>

              <div className="detail-item">
                <span className="detail-label">Categoría</span>
                <span className="detail-value">{selectedEvent.tipo_evento}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Resultado</span>
                <span className={`audit-badge ${getBadgeClass(selectedEvent.resultado)}`}>
                  {selectedEvent.resultado}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Usuario</span>
                <span className="detail-value">
                  {selectedEvent.usuario
                    ? `${selectedEvent.usuario.nombre} (${selectedEvent.usuario.correo})`
                    : 'Sistema'}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Dirección IP</span>
                <span className="detail-value font-mono">{selectedEvent.direccion_ip || '—'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">User Agent</span>
                <span className="detail-value text-xs">{selectedEvent.user_agent || '—'}</span>
              </div>
            </div>

            <div className="detail-json-section">
              <span className="detail-label">Metadatos Contextuales (`detalles` JSON):</span>
              <pre className="json-box">
                {JSON.stringify(selectedEvent.detalles || {}, null, 2)}
              </pre>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedEvent(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
