import api from '../api/axios';

export async function listAdminUsers(params = {}) {
  const response = await api.get('/admin/users', { params });
  return response.data;
}

export async function listAdminRoles() {
  const response = await api.get('/admin/roles');
  return response.data;
}

export async function updateAdminUserStatus(userId, estado, motivo) {
  const response = await api.put(`/admin/users/${userId}/status`, { estado, motivo });
  return response.data;
}

export async function assignAdminUserRole(userId, idRol, motivo) {
  const response = await api.post(`/admin/users/${userId}/roles`, { id_rol: idRol, motivo });
  return response.data;
}

export async function removeAdminUserRole(userId, roleId, motivo) {
  const response = await api.delete(`/admin/users/${userId}/roles/${roleId}`, { params: { motivo } });
  return response.data;
}
