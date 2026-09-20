import api from '../api/axios';
import { getOrCreateDeviceId } from './deviceService';

/**
 * Consulta los valores vigentes de seguridad (inactividad, longitud mín., umbrales).
 */
export async function getEffectivePolicies() {
  const response = await api.get('/policies/effective');
  return response.data;
}

/**
 * CU-17: Consulta el catálogo completo de políticas globales (solo Administrador).
 */
export async function listPolicies() {
  const response = await api.get('/policies');
  return response.data;
}

/**
 * CU-17: Actualiza el valor de una política de seguridad individual (solo Administrador).
 */
export async function updatePolicy(codigo, valor, activa = null) {
  const payload = { valor: String(valor) };
  if (activa !== null) {
    payload.activa = activa;
  }
  const response = await api.put(`/policies/${codigo}`, payload);
  return response.data;
}

/**
 * CU-17: Actualiza un lote de políticas de seguridad (solo Administrador).
 */
export async function batchUpdatePolicies(politicas) {
  const response = await api.post('/policies/batch', { politicas });
  return response.data;
}

/**
 * CU-12: Registra en auditoría el evento de bloqueo automático por inactividad.
 */
export async function recordInactivityLock(motivo = 'Bloqueo automático de terminal por inactividad prolongada (CU-12)') {
  const deviceId = getOrCreateDeviceId();
  try {
    const response = await api.post(
      '/auth/inactivity-lock',
      { motivo },
      {
        headers: {
          'X-Device-Id': deviceId,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.warn('No se pudo auditar el bloqueo por inactividad en backend:', err);
    return null;
  }
}
