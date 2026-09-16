import api from '../api/axios';

export const getAuditEvents = async (params = {}) => {
  const response = await api.get('/audit/events', { params });
  return response.data;
};

export const getAuditStats = async () => {
  const response = await api.get('/audit/stats');
  return response.data;
};

export const downloadAuditCsv = async (params = {}) => {
  const response = await api.get('/audit/export', {
    params,
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  const filename = `bitacora_auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
