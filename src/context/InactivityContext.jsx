import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getEffectivePolicies, recordInactivityLock } from '../services/policyService';
import { clearVaultSession } from '../services/vaultService';
import { loginUser } from '../services/authService';

const InactivityContext = createContext(null);

export function InactivityProvider({ children }) {
  const { isAuthenticated, user, login } = useAuth();

  const [timeoutMinutes, setTimeoutMinutes] = useState(15);
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);
  const [isWarning, setIsWarning] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const isLockedRef = useRef(false);

  // Mantener referencia sincronizada para eventos
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // Cargar política de inactividad vigente
  const fetchTimeoutPolicy = useCallback(async () => {
    try {
      const policies = await getEffectivePolicies();
      if (policies?.inactivity_timeout_minutes) {
        setTimeoutMinutes(policies.inactivity_timeout_minutes);
        setRemainingSeconds(policies.inactivity_timeout_minutes * 60);
      }
    } catch (err) {
      console.warn('Usando timeout de inactividad por defecto (15 min):', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTimeoutPolicy();
    }
  }, [isAuthenticated, fetchTimeoutPolicy]);

  const resetTimer = useCallback(() => {
    if (!isLockedRef.current) {
      lastActivityRef.current = Date.now();
      setIsWarning(false);
    }
  }, []);

  const triggerLock = useCallback(async (motivo = 'Bloqueo automático de terminal por inactividad prolongada (CU-12)') => {
    setIsLocked(true);
    setIsWarning(false);
    isLockedRef.current = true;

    // Purga de claves maestras y tokens de sesión de bóvedas en memoria local (CU-12)
    clearVaultSession();

    // Notificar al servidor para auditar en bitácora inmutable
    await recordInactivityLock(motivo);
  }, []);

  // Escuchadores de actividad del usuario (teclado, ratón, toques, scroll)
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    let throttleTimer = null;
    const handleUserActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        resetTimer();
        throttleTimer = null;
      }, 1000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [isAuthenticated, isLocked, resetTimer]);

  // Temporizador principal de cuenta regresiva
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLocked(false);
      setIsWarning(false);
      return;
    }

    const interval = setInterval(() => {
      if (isLockedRef.current) return;

      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const totalAllowed = timeoutMinutes * 60;
      const left = Math.max(0, totalAllowed - elapsed);

      setRemainingSeconds(left);

      // Mostrar advertencia si faltan 60 segundos o menos
      if (left <= 60 && left > 0) {
        setIsWarning(true);
      } else if (left > 60) {
        setIsWarning(false);
      }

      // Bloquear al agotar el tiempo
      if (left === 0 && !isLockedRef.current) {
        triggerLock();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, timeoutMinutes, triggerLock]);

  // Reanudar sesión tras reingresar contraseña
  const unlockSession = async (password) => {
    if (!user?.correo) {
      throw new Error('No se encontró el correo del usuario activo.');
    }

    const loginData = await loginUser(user.correo, password, true);
    if (loginData.mfa_required) {
      throw new Error('Se requiere segundo factor; inicia sesión desde la pantalla principal.');
    }

    login(loginData.access_token, loginData.refresh_token, loginData.usuario);

    setIsLocked(false);
    isLockedRef.current = false;
    resetTimer();
    return true;
  };

  const lockManually = () => {
    triggerLock('Bloqueo manual de terminal por el usuario');
  };

  return (
    <InactivityContext.Provider
      value={{
        isLocked,
        isWarning,
        remainingSeconds,
        timeoutMinutes,
        resetTimer,
        lockManually,
        unlockSession,
        refreshPolicy: fetchTimeoutPolicy,
      }}
    >
      {children}
    </InactivityContext.Provider>
  );
}

export function useInactivity() {
  const context = useContext(InactivityContext);
  if (!context) {
    throw new Error('useInactivity debe usarse dentro de un InactivityProvider');
  }
  return context;
}
