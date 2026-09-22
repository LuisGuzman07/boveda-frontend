import React, { useRef, useState } from 'react';
import { LifeBuoy, X, AlertTriangle, Lock } from 'lucide-react';
import {
  createEmergencyKit,
  importEmergencyKit,
  revokeEmergencyKit,
} from '../services/vaultService';

function downloadKit(kit, vaultId) {
  const blob = new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `emergency-kit-${vaultId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function EmergencyKitModal({ isOpen, vault, onClose, onRecovered }) {
  const fileRef = useRef(null);
  const [password, setPassword] = useState('');
  const [kitFile, setKitFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message || 'No se pudo completar la operación del Emergency Kit.');
    } finally {
      setBusy(false);
    }
  };

  const create = () => run(async () => {
    if (!vault) throw new Error('Selecciona una bóveda desbloqueada para crear un kit.');
    const kit = await createEmergencyKit(vault.id_boveda, password);
    downloadKit(kit, vault.id_boveda);
    setPassword('');
  });

  const recover = () => run(async () => {
    if (!kitFile) throw new Error('Selecciona un archivo JSON de Emergency Kit.');
    const kit = JSON.parse(await kitFile.text());
    const vaultId = vault?.id_boveda || kit.id_boveda;
    if (!vaultId) throw new Error('El kit no contiene un identificador de bóveda.');
    const recovered = await importEmergencyKit(vaultId, kit, password);
    setPassword('');
    onRecovered?.(recovered);
  });

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal-card" style={{ maxWidth: '560px' }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon"><LifeBuoy size={20} /></span>
            <div>
              <h3>{vault ? 'Emergency Kit' : 'Importar Emergency Kit'}</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Recuperación local en un dispositivo confiable
              </p>
            </div>
          </div>
          {!busy && <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>}
        </div>
        {error && <div className="alert-banner error"><AlertTriangle size={18} style={{ flexShrink: 0 }} /><p>{error}</p></div>}
        <div className="device-zk-banner">
          <div className="zk-icon"><Lock size={20} color="#60a5fa" /></div>
          <div className="zk-text">El archivo contiene solo un sobre AES-256-GCM autenticado y metadatos Argon2id. Nunca incluye la clave de bóveda ni archivos originales.</div>
        </div>
        <div className="form-field" style={{ marginBottom: '1rem' }}>
          <label htmlFor="kit-password">Contraseña del kit</label>
          <input
            id="kit-password"
            className="input-control"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            minLength={12}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {vault && <button className="btn btn-primary" onClick={create} disabled={busy || password.length < 12}>Crear y exportar</button>}
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>Seleccionar kit</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => setKitFile(event.target.files?.[0] || null)} />
          <button className="btn btn-secondary" onClick={recover} disabled={busy || !kitFile || password.length < 12}>Recuperar aquí</button>
          {vault && <button className="btn btn-secondary" onClick={() => run(() => revokeEmergencyKit(vault.id_boveda))} disabled={busy}>Revocar kit</button>}
        </div>
        {kitFile && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Archivo: {kitFile.name}</p>}
      </div>
    </div>
  );
}
