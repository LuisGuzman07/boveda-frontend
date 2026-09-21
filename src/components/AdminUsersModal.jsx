import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, Users, X } from 'lucide-react';
import {
  assignAdminUserRole,
  listAdminRoles,
  listAdminUsers,
  removeAdminUserRole,
  updateAdminUserStatus,
} from '../services/adminUserService';

export default function AdminUsersModal({ isOpen, onClose, permissions }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('Actualización administrativa autorizada');
  const canUpdate = permissions.includes('users:update');
  const canAssignRole = permissions.includes('users:assign_role');

  const load = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const [userData, roleData] = await Promise.all([
        listAdminUsers({ page: nextPage, page_size: 10, query: query || undefined, estado: status || undefined }),
        listAdminRoles(),
      ]);
      setUsers(userData.items || []);
      setTotalPages(userData.total_pages || 1);
      setRoles(roleData.roles || []);
      setPage(nextPage);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No fue posible consultar la administración de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setNotice('');
      load(1);
    }
  }, [isOpen]);

  const openAction = (action, user, role = null) => {
    setPending({ action, user, role });
    setReason('Actualización administrativa autorizada');
  };

  const confirmAction = async () => {
    if (!pending || !reason.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (pending.action === 'status') {
        await updateAdminUserStatus(pending.user.id_usuario, pending.user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO', reason.trim());
      } else if (pending.action === 'assign') {
        await assignAdminUserRole(pending.user.id_usuario, pending.role.id_rol, reason.trim());
      } else {
        await removeAdminUserRole(pending.user.id_usuario, pending.role.id_rol, reason.trim());
      }
      setNotice('Cambio aplicado. Las sesiones del usuario afectado fueron invalidadas.');
      setPending(null);
      await load(page);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No fue posible aplicar el cambio administrativo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-admin" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon"><Users size={20} /></span>
            <div><h3>Administración de usuarios y roles</h3><p>CU-16: permisos, estado de cuenta y asignaciones auditadas.</p></div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar administración"><X size={18} /></button>
        </div>
        {error && <div className="alert-banner error"><AlertTriangle size={18} /><p>{error}</p></div>}
        {notice && <div className="alert-banner success"><CheckCircle2 size={18} /><p>{notice}</p></div>}
        <div className="admin-device-alert"><div className="alert-icon"><ShieldCheck size={18} /></div><div className="alert-desc">La interfaz no otorga privilegios: cada operación se valida nuevamente en el servidor. Los cambios revocan sesiones y quedan auditados sin credenciales.</div></div>
        <form className="admin-filters-bar" onSubmit={(event) => { event.preventDefault(); load(1); }}>
          <input className="input-control input-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo" />
          <select className="input-control input-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option><option value="BLOQUEADO">Bloqueado</option></select>
          <button className="btn btn-secondary btn-sm" disabled={loading}>Buscar</button>
        </form>
        <div className="admin-devices-table-wrap">
          {loading ? <div className="devices-loading-box">Consultando usuarios...</div> : users.length === 0 ? <div className="devices-empty-box">No se encontraron usuarios.</div> : <table className="admin-devices-table"><thead><tr><th>Usuario</th><th>Estado</th><th>Roles</th><th>Acciones</th></tr></thead><tbody>{users.map((user) => <tr key={user.id_usuario}><td><div className="user-cell"><strong>{user.nombre}</strong><small>{user.correo}</small></div></td><td>{user.estado}</td><td><div className="permissions-flow">{user.roles.map((role) => <span className="permission-tag" key={role.id_rol}>{role.nombre}{canAssignRole && <button type="button" className="btn-link" onClick={() => openAction('remove', user, role)}>Quitar</button>}</span>)}</div></td><td><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>{canUpdate && <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAction('status', user)}>{user.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}</button>}{canAssignRole && roles.filter((role) => !user.roles.some((assigned) => assigned.id_rol === role.id_rol)).map((role) => <button type="button" className="btn btn-secondary btn-sm" key={role.id_rol} onClick={() => openAction('assign', user, role)}>Asignar {role.nombre}</button>)}</div></td></tr>)}</tbody></table>}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}><button className="btn btn-secondary" disabled={loading || page <= 1} onClick={() => load(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button className="btn btn-secondary" disabled={loading || page >= totalPages} onClick={() => load(page + 1)}>Siguiente</button></div>
        {pending && <div className="submodal-overlay" onClick={() => setPending(null)}><div className="submodal-card" onClick={(event) => event.stopPropagation()}><h4>Confirmar cambio administrativo</h4><p>Se modificará la cuenta de <strong>{pending.user.correo}</strong>. Sus sesiones activas serán invalidadas.</p><label htmlFor="admin-reason">Motivo registrado en auditoría</label><input id="admin-reason" className="input-control" value={reason} onChange={(event) => setReason(event.target.value)} /><div className="submodal-actions"><button className="btn btn-secondary" onClick={() => setPending(null)} disabled={loading}>Cancelar</button><button className="btn btn-danger" onClick={confirmAction} disabled={loading || !reason.trim()}>Confirmar</button></div></div></div>}
      </div>
    </div>
  );
}
