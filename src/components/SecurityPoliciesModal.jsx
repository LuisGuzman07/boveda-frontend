import React, { useEffect, useRef, useState } from 'react';
import { listPolicies, updatePolicy } from '../services/policyService';

function parseStrictInteger(value) {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function focusableElements(container) {
  return container?.querySelectorAll(
    'button:not(:disabled), input:not(:disabled), [href], select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
  );
}

export default function SecurityPoliciesModal({ isOpen, onClose, onPoliciesChanged, canWrite }) {
  const [policies, setPolicies] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingCode, setSavingCode] = useState(null);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listPolicies();
      setPolicies(items);
      setDrafts(Object.fromEntries(items.map((policy) => [policy.codigo, String(policy.valor)])));
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          requestError.message ||
          'No se pudieron consultar las políticas de seguridad.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    lastFocusedElementRef.current = document.activeElement;
    loadPolicies();
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      lastFocusedElementRef.current?.focus?.();
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !savingCode) {
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements(modalRef.current);
      if (!elements?.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, savingCode]);

  const closeModal = () => {
    if (!savingCode) {
      onClose();
    }
  };

  const setDraft = (code, value) => {
    setDrafts((currentDrafts) => ({ ...currentDrafts, [code]: value }));
  };

  const savePolicy = async (policy) => {
    const rawValue = drafts[policy.codigo] ?? '';
    const value = parseStrictInteger(rawValue);
    if (value === null || value < policy.minimo || value > policy.maximo) {
      setError(
        `${policy.codigo} debe ser un entero entre ${policy.minimo} y ${policy.maximo}.`
      );
      return;
    }
    if (value === policy.valor) {
      return;
    }

    setSavingCode(policy.codigo);
    setError(null);
    try {
      const updated = await updatePolicy(policy.codigo, { valor: value, version: policy.version });
      setPolicies((currentPolicies) =>
        currentPolicies.map((currentPolicy) =>
          currentPolicy.codigo === updated.codigo ? updated : currentPolicy
        )
      );
      setDrafts((currentDrafts) => ({ ...currentDrafts, [updated.codigo]: String(updated.valor) }));
      await onPoliciesChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          requestError.message ||
          'No se pudo guardar la política. Actualiza la lista e inténtalo nuevamente.'
      );
      if (requestError.response?.status === 409) {
        await loadPolicies();
      }
    } finally {
      setSavingCode(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop policy-modal-backdrop" onMouseDown={closeModal}>
      <section
        ref={modalRef}
        className="modal-card policy-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-policies-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon" aria-hidden="true">⚙</span>
            <div>
              <h3 id="security-policies-title">Políticas de seguridad</h3>
              <p className="policy-modal-subtitle">Los cambios se validan y auditan en el servidor.</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="modal-close-btn"
            aria-label="Cerrar políticas de seguridad"
            onClick={closeModal}
            disabled={Boolean(savingCode)}
          >
            ×
          </button>
        </header>

        {error && (
          <div className="alert-banner error" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="policy-loading">Consultando la configuración vigente...</div>
        ) : (
          <div className="policy-list">
            {policies.map((policy) => {
              const draft = drafts[policy.codigo] ?? '';
              const parsedDraft = parseStrictInteger(draft);
              const isChanged = parsedDraft !== policy.valor;
              const isInvalid =
                parsedDraft === null || parsedDraft < policy.minimo || parsedDraft > policy.maximo;
              const isSaving = savingCode === policy.codigo;

              return (
                <article className="policy-row" key={policy.codigo}>
                  <div className="policy-copy">
                    <div className="policy-code-row">
                      <code>{policy.codigo}</code>
                      <span className={`policy-status ${policy.aplicada ? 'applied' : 'configured'}`}>
                        {policy.aplicada ? 'Aplicada' : 'Configurada'}
                      </span>
                    </div>
                    <p>{policy.descripcion}</p>
                    {!policy.aplicada && (
                      <p className="policy-notice">
                        Esta política no activa borrado automático; la conservación requiere archivo y revisión legal.
                      </p>
                    )}
                  </div>
                  <div className="policy-control">
                    <label htmlFor={`policy-${policy.codigo}`}>
                      Valor ({policy.minimo}–{policy.maximo})
                    </label>
                    <div className="policy-input-row">
                      <input
                        id={`policy-${policy.codigo}`}
                        className="input-control"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={draft}
                        disabled={!canWrite || isSaving}
                        aria-invalid={isChanged && isInvalid ? 'true' : undefined}
                        onChange={(event) => setDraft(policy.codigo, event.target.value.trim())}
                      />
                      {canWrite && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!isChanged || isInvalid || Boolean(savingCode)}
                          onClick={() => savePolicy(policy)}
                        >
                          {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                      )}
                    </div>
                    {!canWrite && <span className="policy-read-only">Lectura autorizada</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
