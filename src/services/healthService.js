import api from '../api/axios';

export const checkBackendHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const checkDatabaseHealth = async () => {
  const response = await api.get('/health/database');
  return response.data;
};
