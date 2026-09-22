import api from '../api/axios';

export const getAuditEvents = async (params = {}) => {
  const response = await api.get('/audit/events', { params });
  return response.data;
};

export const getAuditStats = async () => {
  const response = await api.get('/audit/stats');
  return response.data;
};

export const verifyAuditChain = async () => {
  const response = await api.get('/audit/integrity');
  return response.data;
};

export const runLocalAnomalyAnalysis = async () => {
  const response = await api.post('/audit/anomalies/runs');
  return response.data;
};

export const getLocalAnomalyRuns = async () => {
  const response = await api.get('/audit/anomalies/runs');
  return response.data;
};

export const getLatestAnomalyRun = async () => {
  const response = await api.get('/audit/anomalies/latest');
  return response.data;
};

export const getAnomalyStats = async () => {
  const response = await api.get('/audit/anomalies/stats');
  return response.data;
};

export const getAnomalyRunDetails = async (runId) => {
  const response = await api.get(`/audit/anomalies/runs/${runId}`);
  return response.data;
};

export const createComplianceReport = async (payload) => {
  const response = await api.post('/audit/reports', payload);
  return response.data;
};

export const getComplianceReports = async () => {
  const response = await api.get('/audit/reports');
  return response.data;
};

export const downloadComplianceReport = async (reportId, format) => {
  const response = await api.get(`/audit/reports/${reportId}/download`, {
    params: { formato: format },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
  const link = document.createElement('a');
  link.href = url;
  const filename = `reporte_cumplimiento_${reportId}.${format}`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
