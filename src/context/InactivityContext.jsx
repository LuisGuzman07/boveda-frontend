import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getEffectivePolicies } from '../services/policyService';
import InactivityLockModal from '../components/InactivityLockModal';

const InactivityContext = createContext(null);
// Policy reads must fail to the strictest supported timeout, never a weaker default.
const FALLBACK_TIMEOUT_MINUTES = 1;
const CHANNEL_NAME = 'boveda-session-security';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

function readTimeoutMinutes(response) {
  const value = response?.policies?.INACTIVITY_TIMEOUT_MINUTES;
  return Number.isInteger(value) && value > 0 ? value : FALLBACK_TIMEOUT_MINUTES;
}

export function InactivityProvider({ children }) {
  const { isAuthenticated, isLocked, lockForInactivity } = useAuth();
  const [timeoutMinutes, setTimeoutMinutes] = useState(FALLBACK_TIMEOUT_MINUTES);
  const [isWarning, setIsWarning] = useState(false);
  const lastActivityRef = useRef(0);
  const wasAuthenticatedRef = useRef(false);
  const lockTriggeredRef = useRef(false);
  const lockForInactivityRef = useRef(lockForInactivity);
  const triggerLockRef = useRef(() => {});
  const channelRef = useRef(null);

  lockForInactivityRef.current = lockForInactivity;

  const refreshInactivityPolicy = async () => {
    if (!isAuthenticated || isLocked) {
      return FALLBACK_TIMEOUT_MINUTES;
    }
    try {
      const response = await getEffectivePolicies();
      const nextTimeout = readTimeoutMinutes(response);
      setTimeoutMinutes(nextTimeout);
      return nextTimeout;
    } catch {
      // A failed policy read must not disable automatic locking.
      setTimeoutMinutes(FALLBACK_TIMEOUT_MINUTES);
      return FALLBACK_TIMEOUT_MINUTES;
    }
  };

  triggerLockRef.current = async ({ notifyServer } = { notifyServer: true }) => {
    if (lockTriggeredRef.current || !isAuthenticated || isLocked) {
      return;
    }
    lockTriggeredRef.current = true;
    setIsWarning(false);
    await lockForInactivityRef.current({ notifyServer });
    if (notifyServer) {
      channelRef.current?.postMessage({ type: 'lock' });
    }
  };

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      lastActivityRef.current = Date.now();
      lockTriggeredRef.current = false;
    }
    if (!isAuthenticated) {
      setIsWarning(false);
      if (!isLocked) {
        lastActivityRef.current = 0;
        lockTriggeredRef.current = false;
      }
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, isLocked]);

  useEffect(() => {
    if (!isAuthenticated || isLocked) {
      return undefined;
    }
    refreshInactivityPolicy();
    return undefined;
  }, [isAuthenticated, isLocked]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return undefined;
    }
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === 'lock') {
        triggerLockRef.current({ notifyServer: false });
      }
    };
    return () => {
      channel.close();
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLocked) {
      return undefined;
    }

    const timeoutMilliseconds = timeoutMinutes * 60 * 1000;
    const warningMilliseconds = Math.min(60 * 1000, Math.max(5 * 1000, Math.floor(timeoutMilliseconds / 5)));
    let warningTimer;
    let lockTimer;

    const clearTimers = () => {
      window.clearTimeout(warningTimer);
      window.clearTimeout(lockTimer);
    };

    const scheduleLock = () => {
      clearTimers();
      const elapsed = Math.max(0, Date.now() - lastActivityRef.current);
      const remaining = timeoutMilliseconds - elapsed;
      if (remaining <= 0) {
        triggerLockRef.current({ notifyServer: true });
        return;
      }
      const warningDelay = Math.max(0, remaining - warningMilliseconds);
      warningTimer = window.setTimeout(() => setIsWarning(true), warningDelay);
      lockTimer = window.setTimeout(() => triggerLockRef.current({ notifyServer: true }), remaining);
    };

    const recordActivity = () => {
      if (lockTriggeredRef.current) {
        return;
      }
      lastActivityRef.current = Date.now();
      setIsWarning(false);
      scheduleLock();
    };

    scheduleLock();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    return () => {
      clearTimers();
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, recordActivity);
      }
    };
  }, [isAuthenticated, isLocked, timeoutMinutes]);

  return (
    <InactivityContext.Provider value={{ timeoutMinutes, isWarning, refreshInactivityPolicy }}>
      {children}
      {isAuthenticated && isWarning && (
        <div className="inactivity-warning" role="status">
          La sesión se bloqueará por inactividad en menos de un minuto. Interactúa para continuar.
        </div>
      )}
      <InactivityLockModal timeoutMinutes={timeoutMinutes} />
    </InactivityContext.Provider>
  );
}

export function useInactivity() {
  const context = useContext(InactivityContext);
  if (!context) {
    throw new Error('useInactivity debe usarse dentro de InactivityProvider');
  }
  return context;
}
