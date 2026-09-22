import React, { useState, useEffect } from 'react';
import {
  Archive,
  Lock,
  Plus,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  LockKeyhole,
  LockOpen,
  FolderOpen,
  X,
  Share2,
} from 'lucide-react';
import {
  listVaults,
  hasActiveVaultSession,
  getVaultSessionData,
  clearVaultSession,
  openVaultSession,
} from '../services/vaultService';
import CreateVaultModal from '../components/CreateVaultModal';
import UnlockVaultModal from '../components/UnlockVaultModal';
import ShareAccessModal from '../components/ShareAccessModal';

export default function VaultsPage() {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  const [sessionRemainingMin, setSessionRemainingMin] = useState(0);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Quick TOTP Session Modal
  const [totpModalOpen, setTotpModalOpen] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState(null);

  // Cache en memoria para bóvedas descifradas localmente durante la sesión
  const [unlockedMap, setUnlockedMap] = useState({});

  const checkSessionStatus = () => {
    const active = hasActiveVaultSession();
    setHasSession(active);
    if (active) {
      const { expiresAt } = getVaultSessionData();
      const diffMs = expiresAt - Date.now();
      const mins = Math.max(0, Math.ceil(diffMs / (60 * 1000)));
      setSessionRemainingMin(mins);
    } else {
      setSessionRemainingMin(0);
    }
  };

  const fetchVaults = async () => {
    setLoading(true);
    setError(null);
    try {
      if (hasActiveVaultSession()) {
        const items = await listVaults();
        setVaults(items);
      } else {
        setVaults([]);
      }
    } catch (err) {
      console.error('Error al listar bóvedas:', err);
      if (err.code === 'VAULT_SESSION_EXPIRED' || err.status === 401) {
        setHasSession(false);
        setError('La sesión de bóvedas requiere autenticación con TOTP.');
      } else {
        setError(err.message || 'Error al consultar las bóvedas.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSessionStatus();
    const interval = setInterval(checkSessionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasSession) {
      fetchVaults();
    } else {
      setLoading(false);
    }
  }, [hasSession]);

  const handleOpenTotpSession = async (e) => {
    e.preventDefault();
    setTotpError(null);
    if (!totpCode || totpCode.trim().length !== 6) {
      setTotpError('Ingresa un código de 6 dígitos válido.');
      return;
    }
    setTotpLoading(true);
    try {
      await openVaultSession(totpCode);
      setTotpModalOpen(false);
      setTotpCode('');
      checkSessionStatus();
      setHasSession(true);
    } catch (err) {
      console.error('Error al abrir sesión de bóvedas:', err);
      setTotpError(err.message || 'Código TOTP incorrecto o dispositivo no autorizado.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleLockSession = () => {
    clearVaultSession();
    setUnlockedMap({});
    checkSessionStatus();
    setVaults([]);
  };

  const handleVaultUnlocked = (decrypted) => {
    setUnlockedMap((prev) => ({
      ...prev,
      [decrypted.id_boveda]: decrypted,
    }));
  };

  const handleLockSingleVault = (vaultId) => {
    setUnlockedMap((prev) => {
      const copy = { ...prev };
      delete copy[vaultId];
      return copy;
    });
  };

  return (
    <div className="container">
      {/* Header de Bóvedas */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--primary)' }}>
              <Archive size={28} />
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Bóvedas Cifradas
            </h2>
            <span
              className="chip-count chip-success"
              style={{ fontSize: '0.72rem', padding: '0.15rem 0.6rem' }}
            >
              Cero Conocimiento (CU-06)
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Almacenamiento de archivos y secretos con cifrado del lado del cliente (AES-256-GCM + Argon2id).
          </p>
        </div>

        {/* Acciones principales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {hasSession ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLockSession}
                title="Cierra la sesión criptográfica de este dispositivo"
              >
                <Lock size={16} /> Bloquear Sesión
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreateModalOpen(true)}
              >
                + Nueva Bóveda
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTotpModalOpen(true)}
              >
                <KeyRound size={16} /> Abrir Sesión con TOTP
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreateModalOpen(true)}
              >
                + Crear Bóveda
              </button>
            </>
          )}
        </div>
      </div>

      {/* Barra de Estado de la Sesión Criptográfica */}
      <div
        style={{
          background: hasSession ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${hasSession ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          borderRadius: '0.65rem',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {hasSession ? <ShieldCheck size={20} color="#34d399" /> : <AlertTriangle size={20} color="#fbbf24" />}
          </span>
          <div>
            <strong style={{ fontSize: '0.88rem', color: hasSession ? '#34d399' : '#fbbf24' }}>
              {hasSession
                ? `Sesión Criptográfica Activa (~${sessionRemainingMin} min restantes)`
                : 'Sesión de Bóvedas Bloqueada'}
            </strong>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {hasSession
                ? 'El hardware local está firmado con Ed25519 para operaciones seguras de bóveda.'
                : 'Se requiere validación TOTP con tu app móvil para consultar o descifrar bóvedas.'}
            </p>
          </div>
        </div>

        {!hasSession && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setTotpModalOpen(true)}
          >
            Desbloquear con TOTP
          </button>
        )}
      </div>

      {/* Error si ocurrió */}
      {error && (
        <div className="alert-banner error" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <p>{error}</p>
        </div>
      )}

      {/* Contenido Principal / Listado de Bóvedas */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '4rem 1rem',
            color: 'var(--text-muted)',
            gap: '0.75rem',
          }}
        >
          <div className="spinner" />
          <span>Consultando bóvedas cifradas autorizadas...</span>
        </div>
      ) : !hasSession ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
            <LockKeyhole size={52} />
          </div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Acceso Protegido por Doble Factor
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Para garantizar la máxima seguridad en la arquitectura de Conocimiento Cero, las operaciones con bóvedas requieren una sesión autenticada con TOTP vinculada a este dispositivo.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setTotpModalOpen(true)}
            >
              <KeyRound size={16} /> Abrir Sesión con TOTP
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateModalOpen(true)}
            >
              + Crear Nueva Bóveda
            </button>
          </div>
        </div>
      ) : vaults.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            maxWidth: '620px',
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            <Archive size={52} />
          </div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Aún no tienes bóvedas cifradas
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Crea tu primera bóveda de Conocimiento Cero. Tus datos y metadatos se cifrarán localmente con AES-256-GCM y Argon2id.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} /> Crear Mi Primera Bóveda
          </button>
        </div>
      ) : (
        /* Grid de Bóvedas */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {vaults.map((vault) => {
            const isUnlocked = Boolean(unlockedMap[vault.id_boveda]);
            const unlockedData = unlockedMap[vault.id_boveda];

            return (
              <div
                key={vault.id_boveda}
                className="panel-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isUnlocked
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : '1px solid var(--border-subtle)',
                  background: isUnlocked
                    ? 'rgba(16, 185, 129, 0.04)'
                    : 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  {/* Top Bar de la Tarjeta */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {isUnlocked ? <LockOpen size={20} color="#34d399" /> : <Archive size={20} color="#94a3b8" />}
                      </span>
                      <span
                        className={`chip-count ${isUnlocked ? 'chip-success' : 'chip-warning'}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {isUnlocked ? 'Descifrada Localmente' : 'Cifrada (AES-256)'}
                      </span>
                    </div>

                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        color: 'var(--text-dim)',
                      }}
                    >
                      v{vault.version_criptografica || 1}
                    </span>
                  </div>

                  {/* Título y Descripción */}
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 600,
                      color: isUnlocked ? '#34d399' : 'var(--text-main)',
                      marginBottom: '0.4rem',
                      wordBreak: 'break-word',
                    }}
                  >
                    {isUnlocked ? unlockedData.name : `Bóveda ${vault.id_boveda.slice(0, 8)}...`}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.84rem',
                      color: isUnlocked ? 'var(--text-main)' : 'var(--text-muted)',
                      marginBottom: '1.25rem',
                      lineHeight: 1.45,
                      minHeight: '2.5rem',
                    }}
                  >
                    {isUnlocked
                      ? unlockedData.description || '(Sin descripción)'
                      : 'Contenido y metadatos protegidos con cifrado de cero conocimiento. Desbloquea con tu contraseña maestra para visualizar.'}
                  </p>

                  {/* Metadatos */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '0.45rem',
                      padding: '0.65rem 0.85rem',
                      marginBottom: '1.25rem',
                      fontSize: '0.76rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rol de Membresía:</span>
                      <span style={{ color: '#93c5fd', fontWeight: 500 }}>
                        {vault.rol || 'PROPIETARIO'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Derivación:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        Argon2id (64MB)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Creada:</span>
                      <span style={{ color: 'var(--text-dim)' }}>
                        {vault.fecha_creacion
                          ? new Date(vault.fecha_creacion).toLocaleDateString()
                          : 'Reciente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelectedVault(vault); setShareModalOpen(true); }} title="Compartir acceso cifrado"><Share2 size={14} /> Compartir</button>
                  {isUnlocked ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-block btn-sm"
                        onClick={() => {
                          setSelectedVault(vault);
                          setUnlockModalOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <FolderOpen size={14} /> Abrir Bóveda / Archivos
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleLockSingleVault(vault.id_boveda)}
                        title="Bloquear y purgar de memoria"
                      >
                        <Lock size={14} /> Bloquear
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-block btn-sm"
                      onClick={() => {
                        setSelectedVault(vault);
                        setUnlockModalOpen(true);
                      }}
                    >
                      <LockOpen size={14} /> Desbloquear y Descifrar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Crear Bóveda */}
      <CreateVaultModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          checkSessionStatus();
          fetchVaults();
        }}
      />

      {/* Modal de Desbloquear y Gestionar Archivos de Bóveda */}
      <UnlockVaultModal
        isOpen={unlockModalOpen}
        vault={selectedVault}
        initialUnlockedData={selectedVault ? unlockedMap[selectedVault.id_boveda] : null}
        onClose={() => setUnlockModalOpen(false)}
        onUnlocked={handleVaultUnlocked}
        onLock={handleLockSingleVault}
      />
      <ShareAccessModal isOpen={shareModalOpen} vault={selectedVault} onClose={() => setShareModalOpen(false)} />

      {/* Modal Rápido de Apertura de Sesión TOTP */}
      {totpModalOpen && (
        <div className="modal-backdrop" onClick={() => !totpLoading && setTotpModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon">
                  <KeyRound size={20} />
                </span>
                <div>
                  <h3>Abrir Sesión de Bóvedas</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Autorización con código TOTP de 6 dígitos
                  </p>
                </div>
              </div>
              {!totpLoading && (
                <button
                  className="modal-close-btn"
                  onClick={() => setTotpModalOpen(false)}
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {totpError && (
              <div className="alert-banner error" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <p>{totpError}</p>
              </div>
            )}

            <form onSubmit={handleOpenTotpSession}>
              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label className="input-label">Código TOTP (Bóveda Authenticator) *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={totpLoading}
                  autoFocus
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.4rem',
                    textAlign: 'center',
                    letterSpacing: '0.35em',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setTotpModalOpen(false)}
                  disabled={totpLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={totpLoading || totpCode.length !== 6}
                >
                  {totpLoading ? 'Validando...' : 'Autorizar Hardware'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
