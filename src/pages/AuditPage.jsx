import React, { useState, useEffect, useCallback } from 'react';
import { getAuditEvents, getAuditStats, downloadAuditCsv } from '../services/auditService';

export default function AuditPage() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [resultado, setResultado] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.query = searchQuery.trim();
      if (tipoEvento) params.tipo_evento = tipoEvento;
      if (resultado) params.resultado = resultado;
      await downloadAuditCsv(params);
    } catch (err) {
      alert('Error al exportar bitácora.');
    } finally {
      setExporting(false);
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
        <button
          type="button"
          className="btn btn-secondary btn-export"
          onClick={handleExport}
          disabled={exporting || loading}
        >
          {exporting ? 'Descargando...' : '📥 Exportar CSV'}
        </button>
      </div>

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
            🔍 Buscar
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
          <span>⚠️</span>
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
                <span className="modal-icon">📜</span>
                <h3>Detalle del Evento de Auditoría</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>
                ✕
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
