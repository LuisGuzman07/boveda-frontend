import api from '../api/axios';

export async function getEffectivePolicies() {
  const response = await api.get('/policies/effective');
  return response.data;
}

export async function listPolicies() {
  const response = await api.get('/policies');
  return response.data?.items || [];
}

export async function updatePolicy(code, payload) {
  const response = await api.put(`/policies/${encodeURIComponent(code)}`, payload);
  return response.data;
}
