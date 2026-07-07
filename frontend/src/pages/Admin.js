import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService, dashboardService } from '../services/api';
import {
  ShieldAlert, ShieldCheck, Inbox, Users, LayoutGrid, Scale,
  Search, CheckCircle2, XCircle, ClipboardList, CircleDot, Building2, Landmark, User as UserIcon,
} from 'lucide-react';

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

const ROLE_META = {
  citizen:    { label: 'Citoyen',     color: '#1B3A6B', icon: UserIcon },
  enterprise: { label: 'Entreprise',  color: '#007A5E', icon: Building2 },
  authority:  { label: 'Autorité',    color: '#E07B39', icon: Landmark },
  admin:      { label: 'Admin',       color: '#CE1126', icon: ShieldCheck },
};

function statutMeta(v) { return STATUT_OPTIONS.find(s => s.value === v) || STATUT_OPTIONS[0]; }
function roleMeta(v) { return ROLE_META[v] || { label: v, color: '#64748b', icon: UserIcon }; }

const NAV = [
  { id: 'overview',      icon: <LayoutGrid size={16} />, label: 'Vue d’ensemble' },
  { id: 'users',         icon: <Users size={16} />, label: 'Utilisateurs' },
  { id: 'reclamations',  icon: <Scale size={16} />, label: 'Réclamations' },
];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/connexion', { state: { from: '/admin' } });
  }, [user, authLoading, navigate]);

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
    <div style={s.root} className="admin-root">
      <style>{`
        @media (max-width: 900px) {
          .admin-root { flex-direction: column !important; }
          .admin-sidebar { width: 100% !important; flex-direction: row !important; overflow-x: auto !important; padding: 10px 12px !important; }
          .admin-nav-item { white-space: nowrap; }
          .admin-main { padding: 18px 14px !important; }
          .admin-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .admin-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 600; color: #64748b; border: none; background: none; width: 100%; text-align: left; transition: all .18s; }
        .admin-nav-item:hover { background: #f1f5f9; color: #1B3A6B; }
        .admin-nav-item.active { background: #1B3A6B; color: #fff; }
      `}</style>

      <aside style={s.sidebar} className="admin-sidebar">
        <div style={s.brand}>
          <ShieldCheck size={20} color="#CE1126" />
          <div>
            <div style={s.brandTitle}>Administration</div>
            <div style={s.brandSub}>{user.full_name}</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(n => (
            <button key={n.id} className={`admin-nav-item${active === n.id ? ' active' : ''}`} onClick={() => setActive(n.id)}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={s.main} className="admin-main">
        {toast && <div style={s.toast}>{toast}</div>}
        {active === 'overview' && <Overview />}
        {active === 'users' && <UsersPanel onToast={setToast} />}
        {active === 'reclamations' && <ReclamationsPanel onToast={setToast} />}
      </main>
    </div>
  );
}

/* ══════════════════════ VUE D'ENSEMBLE ══════════════════════ */
function Overview() {
  const [stats, setStats] = useState(null);
  const [usersCount, setUsersCount] = useState(null);
  const [reclCount, setReclCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.stats().catch(() => null),
      adminService.usersCount().catch(() => null),
      adminService.reclamations({ limit: 1 }).catch(() => null),
    ]).then(([s, u, r]) => {
      setStats(s?.data || null);
      setUsersCount(u?.data?.total ?? null);
      setReclCount(Array.isArray(r?.data) ? r.data.length : null);
    }).finally(() => setLoading(false));
  }, []);

  const kpis = [
    { icon: <ClipboardList size={20} />, label: 'Marchés publiés', value: stats?.total_tenders, color: '#1B3A6B' },
    { icon: <CircleDot size={20} />, label: 'Marchés ouverts', value: stats?.open_tenders, color: '#007A5E' },
    { icon: <Users size={20} />, label: 'Comptes utilisateurs', value: usersCount, color: '#E07B39' },
    { icon: <Scale size={20} />, label: 'Réclamations (page)', value: reclCount, color: '#CE1126' },
  ];

  return (
    <div>
      <PageHeader title="Vue d'ensemble" sub="Indicateurs clés de la plateforme" />
      {loading ? (
        <div className="admin-kpi-grid" style={s.kpiGrid}>
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />)}
        </div>
      ) : (
        <div className="admin-kpi-grid" style={s.kpiGrid}>
          {kpis.map(k => (
            <div key={k.label} style={s.kpiCard}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: k.color + '14', color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{k.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value != null ? Number(k.value).toLocaleString('fr-FR') : '—'}</div>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ ...s.panel, marginTop: 18 }}>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
          Utilise l'onglet <strong>Utilisateurs</strong> pour gérer les comptes (activer/désactiver) et
          <strong> Réclamations</strong> pour traiter les recours soumis par les usagers (Article 74).
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════ UTILISATEURS ══════════════════════ */
function UsersPanel({ onToast }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (roleFilter) params.role = roleFilter;
    adminService.users(params)
      .then(r => setUsers(r.data || []))
      .catch(() => onToast('Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false));
  }, [search, roleFilter, onToast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const toggleActive = async (u) => {
    setBusyId(u.id);
    try {
      await adminService.setUserActive(u.id, !u.is_active);
      onToast(!u.is_active ? `Compte ${u.email} réactivé.` : `Compte ${u.email} désactivé.`);
      load();
    } catch (e) {
      onToast(e.response?.data?.detail || 'Action impossible.');
    } finally {
      setBusyId(null);
      setTimeout(() => onToast(''), 3000);
    }
  };

  return (
    <div>
      <PageHeader title="Utilisateurs" sub={`${users.length} compte${users.length > 1 ? 's' : ''} affiché${users.length > 1 ? 's' : ''}`} />

      <div style={s.toolbar}>
        <div style={s.searchBox}>
          <Search size={14} color="#94a3b8" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..." style={s.searchInput}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setRoleFilter('')} style={{ ...s.filterPill, ...(!roleFilter ? s.filterPillActive : {}) }}>Tous</button>
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <button key={key} onClick={() => setRoleFilter(key)}
              style={{ ...s.filterPill, ...(roleFilter === key ? { background: meta.color, borderColor: meta.color, color: '#fff' } : {}) }}>
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
        </div>
      ) : users.length === 0 ? (
        <div style={s.empty}><Inbox size={30} color="#94a3b8" /><p>Aucun utilisateur ne correspond à ces critères.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => {
            const meta = roleMeta(u.role);
            const Icon = meta.icon;
            const isMe = u.id === me.id;
            return (
              <div key={u.id} style={{ ...s.userRow, opacity: u.is_active ? 1 : 0.55 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + '14', color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>{u.full_name}{isMe && <span style={{ color: '#94a3b8', fontWeight: 500 }}> (toi)</span>}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{u.email}{u.organization ? ` · ${u.organization}` : ''}{u.region ? ` · ${u.region}` : ''}</div>
                </div>
                <span style={{ ...s.badge, background: meta.color + '18', color: meta.color }}>{meta.label}</span>
                <span style={{ ...s.badge, background: u.is_active ? '#007A5E18' : '#fef2f2', color: u.is_active ? '#007A5E' : '#b91c1c' }}>
                  {u.is_active ? <CheckCircle2 size={11} style={{ verticalAlign: '-2px', marginRight: 3 }} /> : <XCircle size={11} style={{ verticalAlign: '-2px', marginRight: 3 }} />}
                  {u.is_active ? 'Actif' : 'Désactivé'}
                </span>
                <button
                  disabled={isMe || busyId === u.id}
                  onClick={() => toggleActive(u)}
                  title={isMe ? 'Tu ne peux pas désactiver ton propre compte' : ''}
                  style={{ ...s.toggleBtn, opacity: isMe ? 0.4 : 1, cursor: isMe ? 'not-allowed' : 'pointer' }}
                >
                  {u.is_active ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ RÉCLAMATIONS ══════════════════════ */
function ReclamationsPanel({ onToast }) {
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminService.reclamations(statutFilter ? { statut: statutFilter } : {})
      .then(r => setReclamations(r.data || []))
      .catch(() => setError('Impossible de charger les réclamations.'))
      .finally(() => setLoading(false));
  }, [statutFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id, statut) => {
    setSavingId(id);
    try {
      await adminService.updateReclamation(id, { statut, decision: decision || undefined });
      onToast('Réclamation mise à jour.');
      setSelected(null);
      setDecision('');
      load();
    } catch (e) {
      onToast(e.response?.data?.detail || 'Erreur lors de la mise à jour.');
    } finally {
      setSavingId(null);
      setTimeout(() => onToast(''), 3000);
    }
  };

  return (
    <div>
      <PageHeader title="Réclamations" sub="Traitement des recours (Article 74)" />

      <div style={s.filters}>
        <button onClick={() => setStatutFilter('')} style={{ ...s.filterPill, ...(!statutFilter ? s.filterPillActive : {}) }}>Toutes</button>
        {STATUT_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setStatutFilter(opt.value)}
            style={{ ...s.filterPill, ...(statutFilter === opt.value ? { background: opt.color, borderColor: opt.color, color: '#fff' } : {}) }}>
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
                      value={decision} onChange={e => setDecision(e.target.value)}
                      placeholder="Décision / motif (visible dans l'historique de traitement)"
                      style={s.textarea} rows={3}
                    />
                    <div style={s.actionsRow}>
                      {STATUT_OPTIONS.map(opt => (
                        <button key={opt.value} disabled={savingId === r.id} onClick={() => handleUpdate(r.id, opt.value)}
                          style={{ ...s.actionBtn, borderColor: opt.color, color: r.statut === opt.value ? '#fff' : opt.color, background: r.statut === opt.value ? opt.color : '#fff' }}>
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

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1B3A6B', margin: 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

const s = {
  root: { display: 'flex', minHeight: 'calc(100vh - 80px)', background: '#f8faff' },
  sidebar: { width: 240, flexShrink: 0, background: '#fff', borderRight: '1px solid #e8eef8', display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 14px' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 14px', borderBottom: '1px solid #f0f4f8' },
  brandTitle: { fontSize: 14, fontWeight: 800, color: '#1B3A6B' },
  brandSub: { fontSize: 11, color: '#94a3b8' },
  main: { flex: 1, padding: '28px 32px', minWidth: 0 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 },
  kpiCard: { background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 14, padding: '18px 18px 16px' },
  panel: { background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 12, padding: '16px 18px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #dde3f0', borderRadius: 9, padding: '8px 12px', minWidth: 240, flex: '1 1 240px' },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, flex: 1 },
  filters: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  filterPill: { padding: '6px 14px', borderRadius: 20, border: '1.5px solid #dde3f0', background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#475569', cursor: 'pointer' },
  filterPillActive: { background: '#1B3A6B', borderColor: '#1B3A6B', color: '#fff' },
  errorBox: { background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  userRow: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 10, padding: '12px 16px' },
  toggleBtn: { border: '1.5px solid #dde3f0', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#1B3A6B' },
  card: { background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 12, overflow: 'hidden' },
  cardTop: { padding: '16px 18px', cursor: 'pointer' },
  reference: { fontSize: 13, fontWeight: 800, color: '#1B3A6B' },
  badge: { fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' },
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
