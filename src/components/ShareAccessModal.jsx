import React, { useEffect, useState } from 'react';
import { AlertTriangle, Share2, X } from 'lucide-react';
import { createShare, listShares, revokeShare } from '../services/vaultService';

const emptyEnvelope = { id_dispositivo_destinatario: '', algoritmo: 'X25519-AES-256-GCM', ciphertext: '', nonce: '', tag: '' };

export default function ShareAccessModal({ isOpen, vault, onClose }) {
  const [recipient, setRecipient] = useState('');
  const [scope, setScope] = useState('vault');
  const [fileId, setFileId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [envelope, setEnvelope] = useState(emptyEnvelope);
  const [reason, setReason] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const reload = async () => {
    if (!vault) return;
    setLoading(true);
    try {
      setItems(await listShares(vault.id_boveda));
    } catch (err) {
      setError(err.message || 'No se pudieron consultar los accesos compartidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConfirming(null);
      reload();
    }
  }, [isOpen, vault?.id_boveda]);

  if (!isOpen || !vault) return null;

  const updateEnvelope = (key, value) => setEnvelope((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (scope === 'file' && !fileId) {
      setError('Indica el ID del archivo para un acceso limitado a ese archivo.');
      return;
    }
    setLoading(true);
    try {
      await createShare({
        correo_destinatario: recipient,
        ...(scope === 'vault' ? { id_boveda: vault.id_boveda } : { id_archivo: fileId }),
        expira_en: expiresAt ? new Date(expiresAt).toISOString() : null,
        sobres: [envelope],
      });
      setRecipient(''); setFileId(''); setExpiresAt(''); setEnvelope(emptyEnvelope);
      await reload();
    } catch (err) {
      setError(err.message || 'No se pudo crear el acceso compartido.');
    } finally {
      setLoading(false);
    }
  };
  const revoke = async () => {
    setLoading(true);
    try {
      await revokeShare(confirming.id_acceso_compartido, reason || undefined);
      setConfirming(null); setReason(''); await reload();
    } catch (err) {
      setError(err.message || 'No se pudo revocar el acceso.');
    } finally { setLoading(false); }
  };

  return <div className="modal-backdrop" onClick={loading ? undefined : onClose}>
    <div className="modal-card" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(event) => event.stopPropagation()}>
      <div className="modal-header"><div className="modal-title-group"><span className="modal-icon"><Share2 size={20} /></span><div><h3>Compartir acceso cifrado</h3><p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>CU-18/CU-19: sobres dirigidos a dispositivos confiables</p></div></div>{!loading && <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>}</div>
      <div className="alert-banner" style={{ marginBottom: '1rem', background: 'rgba(245, 158, 11, .08)' }}><AlertTriangle size={18} /><p>Revocar bloquea futuros accesos y sesiones. No puede retirar ciphertext ni texto ya obtenido fuera de línea.</p></div>
      {error && <div className="alert-banner error" style={{ marginBottom: '1rem' }}><AlertTriangle size={18} /><p>{error}</p></div>}
      <form onSubmit={submit}>
        <div className="input-group"><label className="input-label">Correo del destinatario *</label><input className="input-field" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} disabled={loading} required /></div>
        <div className="input-group"><label className="input-label">Alcance *</label><select className="input-field" value={scope} onChange={(e) => setScope(e.target.value)} disabled={loading}><option value="vault">Toda la bóveda</option><option value="file">Un archivo</option></select></div>
        {scope === 'file' && <div className="input-group"><label className="input-label">ID de archivo *</label><input className="input-field" value={fileId} onChange={(e) => setFileId(e.target.value)} disabled={loading} required /></div>}
        <div className="input-group"><label className="input-label">Expira el</label><input className="input-field" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={loading} /></div>
        <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Pegá el sobre cifrado creado localmente para la identidad pública del dispositivo destinatario. El servidor solo lo conserva y valida la identidad del dispositivo.</p>
        {Object.entries(envelope).map(([key, value]) => <div className="input-group" key={key}><label className="input-label">{key.replaceAll('_', ' ')}</label><input className="input-field" value={value} onChange={(e) => updateEnvelope(key, e.target.value)} disabled={loading} required /></div>)}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear acceso temporal'}</button></div>
      </form>
      <h4 style={{ marginTop: '1.5rem' }}>Accesos otorgados</h4>
      {loading && !items.length ? <p style={{ color: 'var(--text-muted)' }}>Consultando accesos...</p> : !items.length ? <p style={{ color: 'var(--text-muted)' }}>No hay accesos compartidos para esta bóveda.</p> : items.map((item) => <div key={item.id_acceso_compartido} className="panel-card" style={{ marginBottom: '.75rem', padding: '.8rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}><div><strong>{item.id_archivo ? 'Archivo específico' : 'Bóveda completa'}</strong><p style={{ margin: '.25rem 0', fontSize: '.78rem', color: 'var(--text-muted)' }}>{item.estado} | Expira: {item.expira_en ? new Date(item.expira_en).toLocaleString() : 'Sin vencimiento'}</p></div>{item.estado === 'ACTIVO' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(item)} disabled={loading}>Revocar</button>}</div></div>)}
      {confirming && <div className="alert-banner error" style={{ marginTop: '1rem' }}><div><strong>Confirmar revocación</strong><p>El acceso y sus sobres quedarán revocados. Las sesiones del destinatario se cerrarán inmediatamente.</p><input className="input-field" placeholder="Motivo opcional" value={reason} onChange={(e) => setReason(e.target.value)} disabled={loading} /></div><button type="button" className="btn btn-primary" onClick={revoke} disabled={loading}>Confirmar</button><button type="button" className="btn btn-secondary" onClick={() => setConfirming(null)} disabled={loading}>Cancelar</button></div>}
    </div>
  </div>;
}
