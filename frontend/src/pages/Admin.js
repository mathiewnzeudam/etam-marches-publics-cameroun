import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/api';
import { ShieldAlert, ShieldCheck, RefreshCw, Inbox } from 'lucide-react';

const TYPE_LABELS = {
  exclusion: 'Exclusion injustifiée',
  specification: 'Spécifications discriminatoires',
  evaluation: 'Évaluation irrégulière',
  attribution: 'Attribution irrégulière',
  corruption: 'Corruption / Favoritisme',
  delai: 'Délais non respectés',
  autre: 'Autre irrégularité',
};

const STATUT_OPTIONS = [
  { value: 'soumise', label: 'Soumise', color: '#64748b' },
  { value: 'en_instruction', label: 'En instruction', color: '#d97706' },
  { value: 'resolue', label: 'Résolue', color: '#007A5E' },
  { value: 'rejetee', label: 'Rejetée', color: '#CE1126' },
  { value: 'classee', label: 'Classée', color: '#8892a4' },
];

function statutMeta(v) {
  return STATUT_OPTIONS.find(s => s.value === v) || STATUT_OPTIONS[0];
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/connexion', { state: { from: '/admin' } }); return; }
    if (user.role !== 'admin') return;
  }, [user, authLoading, navigate]);

  const load = useCallback(() => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    setError('');
    adminService.reclamations(statutFilter ? { statut: statutFilter } : {})
      .then(r => setReclamations(r.data || []))
      .catch(() => setError("Impossible de charger les réclamations."))
      .finally(() => setLoading(false));
  }, [user, statutFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id, statut) => {
    setSavingId(id);
    try {
      await adminService.updateReclamation(id, { statut, decision: decision || undefined });
      setToast('Réclamation mise à jour.');
      setSelected(null);
      setDecision('');
      load();
    } catch (e) {
      setToast(e.response?.data?.detail || 'Erreur lors de la mise à jour.');
    } finally {
      setSavingId(null);
      setTimeout(() => setToast(''), 3500);
    }
  };

  if (authLoading) return null;

  if (!user || user.role !== 'admin') {
    return (
      <div style={s.forbidden}>
        <ShieldAlert size={40} color="#CE1126" />
        <h2 style={{ margin: '14px 0 6px' }}>Accès réservé aux administrateurs</h2>
        <p style={{ color: '#64748b' }}>Ton compte ({user?.role || 'invité'}) n'a pas les droits nécessaires pour consulter cette page.</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} color="#007A5E" />
          <div>
            <h1 style={s.title}>Administration</h1>
            <p style={s.sub}>Traitement des réclamations et recours (Article 74)</p>
          </div>
        </div>
        <button onClick={load} style={s.refreshBtn}><RefreshCw size={14} /> Actualiser</button>
      </div>

      {toast && <div style={s.toast}>{toast}</div>}

      <div style={s.filters}>
        <button
          className={!statutFilter ? 'active' : ''}
          onClick={() => setStatutFilter('')}
          style={{ ...s.filterPill, ...(!statutFilter ? s.filterPillActive : {}) }}
        >
          Toutes
        </button>
        {STATUT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatutFilter(opt.value)}
            style={{ ...s.filterPill, ...(statutFilter === opt.value ? { ...s.filterPillActive, background: opt.color, borderColor: opt.color } : {}) }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 12 }} />)}
        </div>
      ) : reclamations.length === 0 ? (
        <div style={s.empty}>
          <Inbox size={32} color="#94a3b8" />
          <p>Aucune réclamation {statutFilter ? `avec le statut « ${statutMeta(statutFilter).label} »` : ''} pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reclamations.map(r => {
            const meta = statutMeta(r.statut);
            const isOpen = selected === r.id;
            return (
              <div key={r.id} style={s.card}>
                <div style={s.cardTop} onClick={() => { setSelected(isOpen ? null : r.id); setDecision(r.decision || ''); }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={s.reference}>{r.reference}</span>
                      <span style={{ ...s.badge, background: meta.color + '18', color: meta.color }}>{meta.label}</span>
                      <span style={s.typeLabel}>{TYPE_LABELS[r.type] || r.type}</span>
                    </div>
                    <p style={s.desc}>{r.description}</p>
                    <div style={s.metaRow}>
                      {r.marche_reference && <span>Marché : {r.marche_reference}</span>}
                      {r.autorite_name && <span>Autorité : {r.autorite_name}</span>}
                      {r.region && <span>{r.region}</span>}
                      <span>{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                      {r.is_anonyme && <span style={{ fontStyle: 'italic' }}>Anonyme</span>}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div style={s.detail}>
                    {!r.is_anonyme && (r.plaignant_nom || r.plaignant_email) && (
                      <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 10 }}>
                        Plaignant : {r.plaignant_nom || '—'} {r.plaignant_email ? `· ${r.plaignant_email}` : ''} {r.plaignant_phone ? `· ${r.plaignant_phone}` : ''}
                      </div>
                    )}
                    <textarea
                      value={decision}
                      onChange={e => setDecision(e.target.value)}
                      placeholder="Décision / motif (visible dans l'historique de traitement)"
                      style={s.textarea}
                      rows={3}
                    />
                    <div style={s.actionsRow}>
                      {STATUT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          disabled={savingId === r.id}
                          onClick={() => handleUpdate(r.id, opt.value)}
                          style={{
                            ...s.actionBtn,
                            borderColor: opt.color,
                            color: r.statut === opt.value ? '#fff' : opt.color,
                            background: r.statut === opt.value ? opt.color : '#fff',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { maxWidth: 980, margin: '0 auto', padding: '28px 20px 60px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#1B3A6B', margin: 0 },
  sub: { fontSize: 13, color: '#64748b', margin: '2px 0 0' },
  refreshBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #dde3f0', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#1B3A6B', cursor: 'pointer' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  filterPill: { padding: '6px 14px', borderRadius: 20, border: '1.5px solid #dde3f0', background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#475569', cursor: 'pointer' },
  filterPillActive: { background: '#1B3A6B', borderColor: '#1B3A6B', color: '#fff' },
  errorBox: { background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  card: { background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 12, overflow: 'hidden' },
  cardTop: { padding: '16px 18px', cursor: 'pointer' },
  reference: { fontSize: 13, fontWeight: 800, color: '#1B3A6B' },
  badge: { fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '3px 10px' },
  typeLabel: { fontSize: 12, color: '#64748b' },
  desc: { fontSize: 13, color: '#334155', margin: '8px 0 6px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  metaRow: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5, color: '#94a3b8' },
  detail: { borderTop: '1px solid #f0f4f8', padding: '14px 18px 18px', background: '#f8faff' },
  textarea: { width: '100%', border: '1.5px solid #dde3f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 12 },
  actionsRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  actionBtn: { border: '1.5px solid', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fff' },
  toast: { background: '#1B3A6B', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, marginBottom: 16 },
  forbidden: { maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 20px' },
};
