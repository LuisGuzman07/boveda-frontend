import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function InactivityLockModal({ timeoutMinutes }) {
  const { isLocked, resumeFromInactivityLock } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isLocked) {
      return undefined;
    }
    const focusTimer = window.setTimeout(() => buttonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isLocked]);

  if (!isLocked) {
    return null;
  }

  const reauthenticate = () => {
    resumeFromInactivityLock();
    navigate('/login', { replace: true });
  };

  return (
    <div className="inactivity-lock-backdrop" role="presentation">
      <section
        className="inactivity-lock-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inactivity-lock-title"
        aria-describedby="inactivity-lock-description"
      >
        <span className="inactivity-lock-mark" aria-hidden="true">⌁</span>
        <p className="inactivity-lock-eyebrow">Sesión protegida</p>
        <h2 id="inactivity-lock-title">La sesión fue bloqueada por inactividad</h2>
        <p id="inactivity-lock-description">
          Se invalidaron la sesión web y las capacidades activas. Vuelve a autenticarte para continuar.
        </p>
        <p className="inactivity-lock-detail">
          Política vigente: {timeoutMinutes} minuto{timeoutMinutes === 1 ? '' : 's'} de inactividad.
        </p>
        <button ref={buttonRef} type="button" className="btn btn-primary btn-block" onClick={reauthenticate}>
          Reautenticarme
        </button>
      </section>
    </div>
  );
}
