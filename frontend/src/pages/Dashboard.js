import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService, chatService, alertService, profileService, documentService, reclamationService } from '../services/api';
import {
  FileText, MessageCircle, Bell, Scale, User, ClipboardList, Bot, BarChart3,
  PartyPopper, Hand, CircleDot, CheckCircle2, XCircle, ArrowRight, AlertTriangle,
  Search, Settings, MapPin, Trash2, Building2, Landmark, X, Lock,
} from 'lucide-react';

const NAV = [
  { id: 'overview',      icon: '▦',  label: 'Tableau de bord' },
  { id: 'documents',     icon: <FileText size={16} />, label: 'Mes documents' },
  { id: 'chat',          icon: <MessageCircle size={16} />, label: 'Conversations' },
  { id: 'alerts',        icon: <Bell size={16} />, label: 'Mes alertes' },
  { id: 'reclamations',  icon: <Scale size={16} />, label: 'Mes réclamations' },
  { id: 'profile',       icon: <User size={16} />, label: 'Mon profil' },
];

const DOC_TYPE_LABELS = {
  submission_letter:  'Lettre de soumission',
  technical_offer:    'Offre technique',
  financial_offer:    'Offre financière',
  qualification_file: 'Dossier de qualification',
  recourse:           'Requête de recours',
  contract_draft:     'Projet de marché',
};
const DOC_TYPE_COLORS = {
  submission_letter: '#1B3A6B', technical_offer: '#007A5E', financial_offer: '#E07B39',
  qualification_file: '#6B4C9A', recourse: '#CE1126', contract_draft: '#2E86AB',
};

/* ── Mini graphique barres SVG ── */
function MiniBarChart({ data, color = '#1B3A6B', h = 48 }) {
  const ref = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value || 0), 1);
  const W = 180;
  const barW = Math.floor(W / data.length) - 2;
  return (
    <svg ref={ref} width="100%" viewBox={`0 0 ${W} ${h}`} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const bh = visible ? Math.max(2, ((d.value || 0) / max) * (h - 14)) : 0;
        const x = i * (W / data.length) + 1;
        return (
          <g key={i}>
            <rect x={x} y={h - 10 - bh} width={barW} height={bh} rx={2}
              fill={color} fillOpacity={0.15 + (i / data.length) * 0.7}
              style={{ transition: `height 0.6s ease ${i * 0.04}s, y 0.6s ease ${i * 0.04}s` }}>
              <title>{d.label}: {d.value}</title>
            </rect>
            {i % 2 === 0 && <text x={x + barW / 2} y={h - 1} textAnchor="middle" fontSize={7} fill="#aaa">{String(d.label).slice(-3)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Mini donut SVG ── */
function MiniDonut({ pct, color, size = 56, label }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f8" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1 }}>{pct}%</span>
      {label && <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>}
    </div>
  );
}

/* ════════════════ COMPOSANT PRINCIPAL ════════════════ */
export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState('overview');
  const [stats, setStats] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (authLoading) return; // attendre la vérification du token avant de décider
    if (!user) { navigate('/connexion', { state: { from: '/dashboard' } }); return; }
    dashboardService.full().then(r => setStats(r.data)).catch(() => {});
    /* pré-charger les documents dès l'ouverture du dashboard */
    setLoadingDocs(true);
    documentService.list().then(r => setDocuments(r.data || [])).catch(() => {}).finally(() => setLoadingDocs(false));
  }, [user, authLoading, navigate]);

  /* Message de bienvenue depuis inscription */
  const welcomeMsg = location.state?.message;

  useEffect(() => {
    if (active === 'chat' && chatHistory.length === 0) {
      setLoadingChat(true);
      chatService.history(20).then(r => setChatHistory(r.data || [])).catch(() => {}).finally(() => setLoadingChat(false));
    }
    if (active === 'alerts' && alerts.length === 0) {
      setLoadingAlerts(true);
      alertService.list().then(r => setAlerts(r.data || [])).catch(() => {}).finally(() => setLoadingAlerts(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (authLoading || !user) return null;

  const initials = (user.full_name || user.email).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const firstName = user.full_name?.split(' ')[0] || 'vous';

  /* Données dérivées pour les graphiques */
  const byMonth = (stats?.by_month || []).slice(-8).map(d => ({ label: d.month, value: d.total || 0 }));
  const openRate  = stats?.stats?.total_tenders ? Math.round((stats.stats.open_tenders / stats.stats.total_tenders) * 100) : 0;
  const awardRate = stats?.stats?.total_tenders ? Math.round((stats.stats.awarded_tenders / stats.stats.total_tenders) * 100) : 0;

  return (
    <div style={s.root} className="dash-root">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .dash-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 600; color: #64748b; border: none; background: none; width: 100%; text-align: left; transition: all .18s; }
        .dash-nav-item:hover { background: #f1f5f9; color: #1B3A6B; }
        .dash-nav-item.active { background: #1B3A6B; color: #fff; }
        .nav-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .stat-card { background: #fff; border-radius: 14px; padding: 20px 20px 16px; border: 1.5px solid #e8eef8; transition: box-shadow .2s, transform .2s; }
        .stat-card:hover { box-shadow: 0 4px 18px rgba(27,58,107,0.10); transform: translateY(-1px); }
        .conv-row { background: #fff; border: 1.5px solid #e8eef8; border-radius: 10px; padding: 13px 16px; cursor: pointer; transition: all .18s; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .conv-row:hover { border-color: #1B3A6B; box-shadow: 0 3px 12px rgba(27,58,107,0.08); }
        .alert-row { background: #fff; border: 1.5px solid #e8eef8; border-radius: 10px; padding: 13px 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; transition: box-shadow .18s; }
        .alert-row:hover { box-shadow: 0 3px 12px rgba(27,58,107,0.08); }
        .toggle { width: 44px; height: 26px; border-radius: 13px; border: none; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
        .toggle .knob { position: absolute; top: 4px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: left .2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .form-input:focus { border-color: #1B3A6B !important; box-shadow: 0 0 0 3px rgba(27,58,107,0.09); outline: none; }
        .quick-card { display: flex; align-items: center; gap: 14px; background: #fff; border: 1.5px solid #e8eef8; border-radius: 12px; padding: 14px 18px; cursor: pointer; text-decoration: none; transition: all .18s; }
        .quick-card:hover { border-color: currentColor; box-shadow: 0 4px 16px rgba(27,58,107,0.10); transform: translateY(-1px); }
        .doc-row { background: #fff; border: 1.5px solid #e8eef8; border-radius: 10px; padding: 13px 16px; display: flex; align-items: center; gap: 14px; transition: all .18s; cursor: pointer; }
        .doc-row:hover { border-color: #1B3A6B; box-shadow: 0 3px 12px rgba(27,58,107,0.08); }
        .activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        @media (max-width: 900px) {
          .dash-root { flex-direction: column !important; }
          .dash-sidebar { width: 100% !important; position: static !important; height: auto !important; top: auto !important; flex-direction: row !important; flex-wrap: nowrap !important; overflow-x: auto !important; padding: 10px 12px !important; align-items: center !important; }
          .dash-sidebar .sideProfile-hide { display: none !important; }
          .dash-sidebar .sideDivider-hide { display: none !important; }
          .dash-side-nav { flex-direction: row !important; gap: 4px !important; overflow-x: auto !important; }
          .dash-nav-item { white-space: nowrap !important; padding: 8px 12px !important; }
          .dash-main { padding: 18px 14px !important; }
          .dash-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-two-col { grid-template-columns: 1fr !important; }
          .dash-form-row3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .dash-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ═══ SIDEBAR ═══ */}
      <aside style={s.sidebar} className="dash-sidebar">
        <div style={s.sideProfile} className="sideProfile-hide">
          <div style={s.avatar}>{initials}</div>
          <div style={s.sideProfileInfo}>
            <div style={s.sideProfileName}>{user.full_name || 'Utilisateur'}</div>
            <div style={s.sideProfileEmail}>{user.email}</div>
          </div>
        </div>

        {/* Badge rôle */}
        <div className="sideProfile-hide" style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 4px' }}>
          <span style={{ background: '#f0f4ff', color: '#1B3A6B', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '3px 12px', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {user.role === 'enterprise' ? <><Building2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Entreprise</> : user.role === 'authority' ? <><Landmark size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Autorité</> : <><User size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Citoyen</>}
          </span>
        </div>

        <div style={s.sideDivider} className="sideDivider-hide" />

        <nav style={s.sideNav} className="dash-side-nav">
          {NAV.map(item => (
            <button key={item.id} className={`dash-nav-item${active === item.id ? ' active' : ''}`}
              onClick={() => setActive(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'documents' && documents.length > 0 && (
                <span style={{ marginLeft: 'auto', background: active === item.id ? 'rgba(255,255,255,0.25)' : '#f0f4ff', color: active === item.id ? '#fff' : '#1B3A6B', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>
                  {documents.length}
                </span>
              )}
              {item.id === 'alerts' && alerts.length > 0 && (
                <span style={{ marginLeft: 'auto', background: active === item.id ? 'rgba(255,255,255,0.25)' : '#fef9c3', color: active === item.id ? '#fff' : '#d97706', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>
                  {alerts.filter(a => a.active).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={s.sideDivider} className="sideDivider-hide" />

        <div style={s.sideNav} className="sideProfile-hide">
          <button className="dash-nav-item" onClick={() => navigate('/marches')}><span className="nav-icon"><ClipboardList size={16} /></span> Marchés</button>
          <button className="dash-nav-item" onClick={() => navigate('/chat')}><span className="nav-icon"><Bot size={16} /></span> Assistant IA</button>
          <button className="dash-nav-item" onClick={() => navigate('/transparence')}><span className="nav-icon"><BarChart3 size={16} /></span> Transparence</button>
        </div>

        <div className="sideProfile-hide" style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button className="dash-nav-item" style={{ color: '#CE1126' }}
            onClick={() => { logout(); navigate('/'); }}>
            <span className="nav-icon">⎋</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* ═══ CONTENU ═══ */}
      <main style={s.main} className="dash-main">

        {/* Message de bienvenue post-inscription */}
        {welcomeMsg && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#166534', animation: 'fadeIn .3s ease' }}>
            <span style={{ fontSize: 20 }}><PartyPopper size={20} /></span>
            <span>{welcomeMsg}</span>
          </div>
        )}

        {/* ── VUE D'ENSEMBLE ── */}
        {active === 'overview' && (
          <div style={s.content} key="overview">
            <PageHeader title={<>Bonjour, {firstName} <Hand size={20} style={{ verticalAlign: 'middle' }} /></>} sub="Voici votre espace marchés publics personnalisé" />

            {/* 4 KPIs */}
            <div style={s.statsGrid} className="dash-stats-grid">
              {[
                { icon: <ClipboardList size={20} />, label: 'Total marchés',     value: stats?.stats?.total_tenders,     color: '#1B3A6B', sub: 'Base ARMP' },
                { icon: <CircleDot size={20} />, label: 'Marchés ouverts',   value: stats?.stats?.open_tenders,      color: '#007A5E', sub: `Taux ${openRate}%` },
                { icon: <CheckCircle2 size={20} />, label: 'Attribués',          value: stats?.stats?.awarded_tenders,   color: '#2E86AB', sub: `Taux ${awardRate}%` },
                { icon: <XCircle size={20} />, label: 'Annulés',            value: stats?.stats?.cancelled_tenders, color: '#CE1126', sub: 'Infructueux' },
              ].map(({ icon, label, value, color, sub }) => (
                <div key={label} className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: color + '14', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>
                    {value != null ? Number(value).toLocaleString('fr-FR') : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Graphique mensuel + taux visuels */}
            {stats?.stats && (
              <div style={{ ...s.panel, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <SectionTitle>Évolution mensuelle des publications</SectionTitle>
                  <Link to="/transparence" style={{ fontSize: 11, color: '#1B3A6B', fontWeight: 700, textDecoration: 'none' }}>Voir détails <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
                  <MiniBarChart data={byMonth} color="#1B3A6B" h={60} />
                  <div style={{ display: 'flex', gap: 16 }}>
                    <MiniDonut pct={openRate}  color="#007A5E" label="Ouverts" />
                    <MiniDonut pct={awardRate} color="#2E86AB" label="Attribués" />
                  </div>
                </div>
              </div>
            )}

            {/* 2 colonnes */}
            <div style={s.twoCol} className="dash-two-col">
              {/* Accès rapide */}
              <div style={s.panel}>
                <SectionTitle>Accès rapide</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <QuickCard icon={<Bot size={18} />} title="Assistant IA"     desc="Questions juridiques sur les marchés"   color="#1B3A6B" link="/chat" />
                  <QuickCard icon={<ClipboardList size={18} />} title="Marchés publics"  desc="Tous les appels d'offres en cours"      color="#007A5E" link="/marches" />
                  <QuickCard icon={<FileText size={18} />} title="Générer un document" desc="Lettres, offres, recours ARMP"       color="#0891b2" link="/documents" />
                  <QuickCard icon={<AlertTriangle size={18} />} title="Réclamations"     desc="Signaler une irrégularité"              color="#CE1126" link="/reclamations" />
                </div>
              </div>

              {/* Documents récents + répartition */}
              <div style={s.panel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <SectionTitle>Documents récents</SectionTitle>
                  <button onClick={() => setActive('documents')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#1B3A6B', cursor: 'pointer', fontWeight: 700 }}>Tous <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></button>
                </div>
                {loadingDocs ? (
                  <Skeleton rows={3} />
                ) : documents.length === 0 ? (
                  <div style={s.emptySmall}>
                    <div style={{ marginBottom: 8 }}><FileText size={28} /></div>
                    <div>Aucun document généré</div>
                    <button onClick={() => navigate('/documents')} style={{ ...s.primaryBtn, marginTop: 10, padding: '6px 14px', fontSize: 11 }}>Générer un document</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {documents.slice(0, 4).map(doc => {
                      const color = DOC_TYPE_COLORS[doc.type] || '#1B3A6B';
                      return (
                        <div key={doc.id} className="doc-row" onClick={() => navigate('/documents')}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '14', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={16} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                              <span style={{ fontSize: 10, background: color + '18', color, borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>{DOC_TYPE_LABELS[doc.type] || doc.type}</span>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          <span style={{ color: '#cbd5e1', display: 'inline-flex' }}><ArrowRight size={14} /></span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Répartition secteurs + alertes actives */}
            <div style={{ ...s.twoCol, marginTop: 20 }} className="dash-two-col">
              <div style={s.panel}>
                <SectionTitle>Répartition par secteur</SectionTitle>
                {stats?.by_sector?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {stats.by_sector.slice(0, 6).map((item, i) => {
                      const colors = ['#1B3A6B', '#007A5E', '#CE1126', '#F39C12', '#7c3aed', '#0891b2'];
                      const c = colors[i % colors.length];
                      return (
                        <div key={i} style={s.sectorRow} onClick={() => navigate(`/marches?sector=${item.sector}`)}>
                          <span style={{ ...s.sectorLabel, color: c }}>{item.sector}</span>
                          <div style={s.sectorBar}>
                            <div style={{ ...s.sectorFill, width: `${Math.min(100, item.pct || 0)}%`, background: c }} />
                          </div>
                          <span style={{ ...s.sectorCount, color: c }}>{item.total}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : <div style={s.emptySmall}>Chargement…</div>}
              </div>

              <div style={s.panel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <SectionTitle>Alertes de veille</SectionTitle>
                  <button onClick={() => setActive('alerts')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#1B3A6B', cursor: 'pointer', fontWeight: 700 }}>Gérer <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></button>
                </div>
                {alerts.length === 0 ? (
                  <div style={s.emptySmall}>
                    <div style={{ marginBottom: 8 }}><Bell size={28} /></div>
                    <div>Aucune alerte configurée</div>
                    <button onClick={() => setActive('alerts')} style={{ ...s.primaryBtn, marginTop: 10, padding: '6px 14px', fontSize: 11 }}>Créer une alerte</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {alerts.slice(0, 4).map(alert => (
                      <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fafbfe', borderRadius: 9, border: '1px solid #e8eef8' }}>
                        <span style={{ flexShrink: 0 }}><Bell size={16} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                            {alert.keywords?.length > 0 && <><Search size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />{alert.keywords.join(', ')}</>}
                            {alert.sectors?.length  > 0 && <> · <Settings size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />{alert.sectors.join(', ')}</>}
                          </div>
                        </div>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: alert.active ? '#22c55e' : '#cbd5e1', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {active === 'documents' && (
          <div style={s.content} key="documents">
            <PageHeader title="Mes documents" sub="Tous les documents générés par l'IA">
              <button style={s.primaryBtn} onClick={() => navigate('/documents')}>+ Nouveau document</button>
            </PageHeader>

            {loadingDocs ? <Skeleton rows={5} /> : documents.length === 0 ? (
              <EmptyState icon={<FileText size={40} />} title="Aucun document généré" desc="Utilisez le générateur IA pour créer vos lettres de soumission, offres techniques et recours ARMP." action="Générer mon premier document" onAction={() => navigate('/documents')} />
            ) : (
              <>
                {/* Compteurs par type */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {Object.entries(
                    documents.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {})
                  ).map(([type, count]) => {
                    const color = DOC_TYPE_COLORS[type] || '#1B3A6B';
                    return (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, background: color + '12', border: `1.5px solid ${color}30`, borderRadius: 20, padding: '5px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{DOC_TYPE_LABELS[type] || type}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color, background: color + '20', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {documents.map(doc => {
                    const color = DOC_TYPE_COLORS[doc.type] || '#1B3A6B';
                    const statusColors = { draft: ['#f8fafc', '#64748b'], final: ['#f0fdf4', '#166534'], archived: ['#f8f8f8', '#94a3b8'] };
                    const [bgS, fgS] = statusColors[doc.status] || statusColors.draft;
                    return (
                      <div key={doc.id} className="doc-row" onClick={() => navigate('/documents')}>
                        <div style={{ width: 42, height: 42, borderRadius: 11, background: color + '14', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={20} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, background: color + '18', color, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>{DOC_TYPE_LABELS[doc.type] || doc.type}</span>
                            <span style={{ fontSize: 10, background: bgS, color: fgS, borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>{doc.status}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>v{doc.version} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); navigate('/documents'); }}
                          style={{ background: '#f0f4ff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 11, color: '#1B3A6B', cursor: 'pointer', fontWeight: 700 }}>
                          Ouvrir <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CONVERSATIONS ── */}
        {active === 'chat' && (
          <div style={s.content} key="chat">
            <PageHeader title="Conversations IA" sub="Historique de vos échanges avec l'assistant">
              <button style={s.primaryBtn} onClick={() => navigate('/chat')}>+ Nouvelle conversation</button>
            </PageHeader>
            {loadingChat ? <Skeleton rows={4} /> : chatHistory.length === 0 ? (
              <EmptyState icon={<MessageCircle size={40} />} title="Aucune conversation" desc="Vous n'avez pas encore posé de questions à l'assistant IA." action="Démarrer une conversation" onAction={() => navigate('/chat')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatHistory.map((conv, i) => (
                  <div key={conv.id || i} className="conv-row" onClick={() => navigate('/chat')}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, background: '#f0f4ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MessageCircle size={18} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={s.convTitle}>{conv.title || 'Conversation sans titre'}</p>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ ...s.convMeta }}>
                            {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                          <span style={{ fontSize: 10, background: conv.status === 'active' ? '#f0fdf4' : '#f8fafc', color: conv.status === 'active' ? '#166534' : '#64748b', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>
                            {conv.status === 'active' ? '● En cours' : '○ Archivée'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span style={{ color: '#cbd5e1', display: 'inline-flex' }}><ArrowRight size={18} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ALERTES ── */}
        {active === 'alerts' && (
          <AlertsTab alerts={alerts} setAlerts={setAlerts} loading={loadingAlerts} />
        )}

        {/* ── RÉCLAMATIONS ── */}
        {active === 'reclamations' && <ReclamationsTab />}

        {/* ── PROFIL ── */}
        {active === 'profile' && <ProfileTab user={user} />}
      </main>
    </div>
  );
}

/* ── Helpers ── */
function PageHeader({ title, sub, children }) {
  return (
    <div style={s.pageHeader}>
      <div>
        <h1 style={s.pageTitle}>{title}</h1>
        {sub && <p style={s.pageSub}>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10 }}>{children}</div>}
    </div>
  );
}
function SectionTitle({ children }) {
  return <h3 style={s.sectionTitle}>{children}</h3>;
}
function Skeleton({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 12, width: '55%', borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function EmptyState({ icon, title, desc, action, onAction }) {
  return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>{icon}</div>
      <h3 style={s.emptyTitle}>{title}</h3>
      <p style={s.emptyDesc}>{desc}</p>
      {action && <button onClick={onAction} style={s.primaryBtn}>{action}</button>}
    </div>
  );
}
function QuickCard({ icon, title, desc, color, link, onClick }) {
  const inner = (
    <div className="quick-card" style={{ color }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '14', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{desc}</div>
      </div>
      <span style={{ opacity: 0.45, display: 'inline-flex' }}><ArrowRight size={14} /></span>
    </div>
  );
  if (link) return <Link to={link} style={{ textDecoration: 'none' }}>{inner}</Link>;
  return <div onClick={onClick}>{inner}</div>;
}

/* ════════════ ONGLET ALERTES ════════════ */
function AlertsTab({ alerts, setAlerts, loading }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keywords: '', sector: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const SECTORS = ['travaux', 'fournitures', 'services', 'informatique', 'assurance'];
  const REGIONS = ['Centre', 'Littoral', 'Ouest', 'Nord', 'Sud', 'Est', 'Adamaoua', 'Extrême-Nord', 'Nord-Ouest', 'Sud-Ouest'];

  const toggle = async (alert) => {
    try {
      await alertService.toggle(alert.id);
      setAlerts(p => p.map(a => a.id === alert.id ? { ...a, active: !a.active } : a));
    } catch {}
  };
  const remove = async (id) => {
    try { await alertService.remove(id); setAlerts(p => p.filter(a => a.id !== id)); } catch {}
  };
  const save = async (e) => {
    e.preventDefault();
    if (!form.keywords && !form.sector && !form.region) { setError('Renseignez au moins un critère.'); return; }
    setSaving(true); setError('');
    try {
      const r = await alertService.create({
        name: form.keywords || form.sector || form.region || 'Ma veille',
        keywords: form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        sectors:  form.sector  ? [form.sector]  : [],
        regions:  form.region  ? [form.region]  : [],
        channel: 'in_app',
      });
      setAlerts(p => [r.data, ...p]);
      setShowForm(false);
      setForm({ keywords: '', sector: '', region: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création.');
    } finally { setSaving(false); }
  };

  const activeCount = alerts.filter(a => a.active).length;

  return (
    <div style={s.content}>
      <PageHeader title="Mes alertes de veille" sub="Soyez notifié dès qu'un marché correspond à vos critères">
        <button style={s.primaryBtn} onClick={() => setShowForm(v => !v)}>
          {showForm ? <><X size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Annuler</> : '+ Nouvelle alerte'}
        </button>
      </PageHeader>

      {/* Stats alertes */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { val: alerts.length, lbl: 'Alertes totales', color: '#1B3A6B' },
            { val: activeCount, lbl: 'Alertes actives', color: '#007A5E' },
            { val: alerts.length - activeCount, lbl: 'Alertes inactives', color: '#94a3b8' },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} style={{ background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 10, padding: '12px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color }}>{val}</span>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{lbl}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ ...s.panel, marginBottom: 20, animation: 'fadeIn .2s ease', borderLeft: '4px solid #1B3A6B' }}>
          <SectionTitle>Créer une alerte</SectionTitle>
          {error && <div style={s.formError}>{error}</div>}
          <form onSubmit={save}>
            <div style={s.formRow3} className="dash-form-row3">
              <div style={s.formGroup}>
                <label style={s.formLabel}>Mots-clés</label>
                <input className="form-input" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                  placeholder="construction, route, pont…" style={s.formInput} />
                <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Séparés par des virgules</span>
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Secteur</label>
                <select className="form-input" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} style={s.formInput}>
                  <option value="">Tous les secteurs</option>
                  {SECTORS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Région</label>
                <select className="form-input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} style={s.formInput}>
                  <option value="">Toutes les régions</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" style={s.primaryBtn} disabled={saving}>
              {saving ? 'Enregistrement…' : <><Bell size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Créer l'alerte</>}
            </button>
          </form>
        </div>
      )}

      {loading ? <Skeleton rows={3} /> : alerts.length === 0 ? (
        <EmptyState icon={<Bell size={40} />} title="Aucune alerte configurée" desc="Créez des alertes pour être notifié automatiquement des nouveaux marchés." action="Créer ma première alerte" onAction={() => setShowForm(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map(alert => (
            <div key={alert.id} className="alert-row">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{ width: 40, height: 40, background: alert.active ? '#fef9e7' : '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bell size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1B3A6B', marginBottom: 5 }}>{alert.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {alert.keywords?.length > 0 && <span style={s.alertTag}><Search size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{alert.keywords.join(', ')}</span>}
                    {alert.sectors?.length  > 0 && <span style={s.alertTag}><Settings size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{alert.sectors.join(', ')}</span>}
                    {alert.regions?.length  > 0 && <span style={s.alertTag}><MapPin size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{alert.regions.join(', ')}</span>}
                    {!alert.keywords?.length && !alert.sectors?.length && !alert.regions?.length && (
                      <span style={{ ...s.alertTag, background: '#fef3c7', color: '#d97706' }}>Toutes catégories</span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                    Créée le {alert.created_at ? new Date(alert.created_at).toLocaleDateString('fr-FR') : '—'}
                    {alert.last_fired && ` · Dernier déclenchement : ${new Date(alert.last_fired).toLocaleDateString('fr-FR')}`}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: alert.active ? '#007A5E' : '#94a3b8', minWidth: 44, textAlign: 'right' }}>
                  {alert.active ? 'Actif' : 'Inactif'}
                </span>
                <button className="toggle" style={{ background: alert.active ? '#007A5E' : '#cbd5e1' }} onClick={() => toggle(alert)}>
                  <span className="knob" style={{ left: alert.active ? '22px' : '4px' }} />
                </button>
                <button onClick={() => remove(alert.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#cbd5e1', borderRadius: 6 }} title="Supprimer"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════ ONGLET RÉCLAMATIONS ════════════ */
function ReclamationsTab() {
  const [reclamations, setReclamations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  const STATUT_MAP = {
    soumise:        { label: 'Soumise',        color: '#1B3A6B', bg: '#eef1f8' },
    en_instruction: { label: 'En instruction', color: '#E07B39', bg: '#fff7f0' },
    resolue:        { label: 'Résolue',        color: '#007A5E', bg: '#f0fdf4' },
    rejetee:        { label: 'Rejetée',        color: '#CE1126', bg: '#fff0f0' },
    classee:        { label: 'Classée',        color: '#64748b', bg: '#f8fafc' },
  };

  const TYPE_LABELS = {
    exclusion:     'Exclusion injustifiée',
    specification: 'Spécifications discriminatoires',
    evaluation:    'Évaluation irrégulière',
    attribution:   'Attribution irrégulière',
    corruption:    'Corruption / Favoritisme',
    delai:         'Délais non respectés',
    autre:         'Autre irrégularité',
  };

  React.useEffect(() => {
    reclamationService.list()
      .then(r => setReclamations(r.data || []))
      .catch(() => setReclamations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Mes réclamations</h2>
          <p style={s.pageSub}>Suivez l'avancement de vos recours et signalements</p>
        </div>
        <button
          onClick={() => navigate('/reclamations')}
          style={{ background: '#CE1126', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Nouvelle réclamation
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>Chargement…</div>
      ) : reclamations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: '#aaa' }}>
          <div style={{ marginBottom: 12 }}><Scale size={40} /></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucune réclamation</div>
          <div style={{ fontSize: 13 }}>Vous n'avez encore soumis aucune réclamation.</div>
          <button
            onClick={() => navigate('/reclamations')}
            style={{ marginTop: 20, background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Soumettre une réclamation
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reclamations.map(r => {
            const st = STATUT_MAP[r.statut] || STATUT_MAP.soumise;
            return (
              <div key={r.id} style={{ background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1B3A6B', fontFamily: 'monospace' }}>{r.reference}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 20, padding: '2px 10px' }}>{st.label}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>{TYPE_LABELS[r.type] || r.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', marginBottom: 4, lineHeight: 1.5 }}>
                    {r.description.length > 140 ? r.description.slice(0, 140) + '…' : r.description}
                  </div>
                  {r.marche_reference && (
                    <div style={{ fontSize: 11, color: '#64748b' }}>Marché : {r.marche_reference}</div>
                  )}
                  {r.decision && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8fffe', borderRadius: 8, border: '1px solid #c3e6dc', fontSize: 12, color: '#1B5E4A' }}>
                      <strong>Décision :</strong> {r.decision}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0, textAlign: 'right' }}>
                  {new Date(r.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


/* ════════════ ONGLET PROFIL ════════════ */
function ProfileTab({ user }) {
  const [form, setForm] = useState({ full_name: user.full_name || '', phone: user.phone || '', organization: user.organization || '' });
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgPwd, setMsgPwd] = useState('');
  const [err, setErr] = useState('');
  const [errPwd, setErrPwd] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true); setErr(''); setMsg('');
    try { await profileService.update(form); setMsg('Profil mis à jour avec succès.'); }
    catch { setErr('Erreur lors de la mise à jour.'); }
    finally { setSaving(false); }
  };
  const savePwd = async (e) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) { setErrPwd('Les mots de passe ne correspondent pas.'); return; }
    if (pwd.new_password.length < 8) { setErrPwd('Minimum 8 caractères.'); return; }
    setSavingPwd(true); setErrPwd(''); setMsgPwd('');
    try {
      await profileService.changePassword({ current_password: pwd.current_password, new_password: pwd.new_password });
      setMsgPwd('Mot de passe modifié avec succès.');
      setPwd({ current_password: '', new_password: '', confirm: '' });
    } catch (e2) { setErrPwd(e2.response?.data?.detail || 'Mot de passe actuel incorrect.'); }
    finally { setSavingPwd(false); }
  };

  const initials = (user.full_name || user.email).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={s.content}>
      <PageHeader title="Mon profil" sub="Gérez vos informations personnelles et votre sécurité" />

      {/* Carte récapitulative */}
      <div style={{ ...s.panel, background: 'linear-gradient(135deg, #1B3A6B, #2a5298)', color: '#fff', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{user.full_name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{user.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#FCD116', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
              {user.role === 'enterprise' ? <><Building2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Entreprise</> : user.role === 'authority' ? <><Landmark size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Autorité</> : <><User size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Citoyen</>}
            </span>
            {user.region && <span style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}><MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{user.region}</span>}
            {user.organization && <span style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}><Building2 size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{user.organization}</span>}
            <span style={{ background: user.is_verified ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)', color: user.is_verified ? '#4ade80' : 'rgba(255,255,255,0.5)', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>
              {user.is_verified ? <><CheckCircle2 size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Vérifié</> : '○ Non vérifié'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
          Membre depuis<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}
          </strong>
        </div>
      </div>

      <div style={s.twoCol} className="dash-two-col">
        <div style={s.panel}>
          <SectionTitle>Informations personnelles</SectionTitle>
          {msg && <div style={s.successMsg}><CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{msg}</div>}
          {err && <div style={s.formError}>{err}</div>}
          <form onSubmit={saveProfile}>
            {[
              { label: 'Nom complet', field: 'full_name', placeholder: 'Jean Dupont' },
              { label: 'Téléphone', field: 'phone', placeholder: '+237 6XX XXX XXX' },
              { label: 'Organisation', field: 'organization', placeholder: 'Nom de votre entreprise' },
            ].map(({ label, field, placeholder }) => (
              <div key={field} style={s.formGroup}>
                <label style={s.formLabel}>{label}</label>
                <input className="form-input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} style={s.formInput} />
              </div>
            ))}
            <div style={s.formGroup}>
              <label style={s.formLabel}>Email (non modifiable)</label>
              <input value={user.email} style={{ ...s.formInput, background: '#f8fafc', color: '#94a3b8' }} disabled />
            </div>
            <button type="submit" style={s.primaryBtn} disabled={saving}>{saving ? 'Enregistrement…' : 'Sauvegarder'}</button>
          </form>
        </div>

        <div style={s.panel}>
          <SectionTitle>Changer le mot de passe</SectionTitle>
          {msgPwd && <div style={s.successMsg}><CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{msgPwd}</div>}
          {errPwd && <div style={s.formError}>{errPwd}</div>}
          <form onSubmit={savePwd}>
            {[
              { label: 'Mot de passe actuel', field: 'current_password', placeholder: '••••••••' },
              { label: 'Nouveau mot de passe', field: 'new_password', placeholder: 'Minimum 8 caractères' },
              { label: 'Confirmer le nouveau mot de passe', field: 'confirm', placeholder: '••••••••' },
            ].map(({ label, field, placeholder }) => (
              <div key={field} style={s.formGroup}>
                <label style={s.formLabel}>{label}</label>
                <input className="form-input" type="password" value={pwd[field]} onChange={e => setPwd(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} style={s.formInput} />
              </div>
            ))}
            <button type="submit" style={{ ...s.primaryBtn, background: '#007A5E' }} disabled={savingPwd}>
              {savingPwd ? 'Enregistrement…' : <><Lock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Modifier le mot de passe</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ STYLES ════════════════ */
const s = {
  root: { display: 'flex', minHeight: 'calc(100vh - 80px)', background: '#f1f5f9', fontFamily: "'Inter', -apple-system, sans-serif" },
  sidebar: { width: 240, flexShrink: 0, background: '#fff', borderRight: '1px solid #e8eef8', display: 'flex', flexDirection: 'column', padding: '20px 14px', position: 'sticky', top: 80, height: 'calc(100vh - 80px)', overflowY: 'auto' },
  sideProfile: { display: 'flex', alignItems: 'center', gap: 11, padding: '0 2px 4px' },
  avatar: { width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#1B3A6B,#CE1126)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, flexShrink: 0 },
  sideProfileInfo: { flex: 1, minWidth: 0 },
  sideProfileName: { fontSize: 12, fontWeight: 700, color: '#1B3A6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sideProfileEmail: { fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 },
  sideDivider: { height: 1, background: '#f1f5f9', margin: '12px 0' },
  sideNav: { display: 'flex', flexDirection: 'column', gap: 2 },
  main: { flex: 1, minWidth: 0, padding: '28px 32px', overflowY: 'auto' },
  content: { animation: 'fadeIn .25s ease', maxWidth: 1000 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: 900, color: '#1B3A6B', margin: 0 },
  pageSub: { fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
  panel: { background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1.5px solid #e8eef8', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: '#1B3A6B', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectorRow: { display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '4px 0' },
  sectorLabel: { fontSize: 11, fontWeight: 600, textTransform: 'capitalize', width: 85, flexShrink: 0 },
  sectorBar: { flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  sectorFill: { height: '100%', borderRadius: 3, transition: 'width .5s ease' },
  sectorCount: { fontSize: 12, fontWeight: 800, width: 26, textAlign: 'right' },
  emptySmall: { fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '24px 0' },
  convTitle: { fontSize: 13, fontWeight: 600, color: '#1B3A6B', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  convMeta: { fontSize: 11, color: '#94a3b8', margin: 0 },
  alertTag: { background: '#f0f4ff', color: '#1B3A6B', borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 600 },
  formRow3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 },
  formLabel: { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  formInput: { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', width: '100%', background: '#fff' },
  formError: { background: '#fff0f0', color: '#CE1126', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: 12, fontWeight: 600 },
  successMsg: { background: '#f0fdf4', color: '#007A5E', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: 12, fontWeight: 600 },
  primaryBtn: { background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  empty: { background: '#fff', borderRadius: 14, padding: '48px 24px', textAlign: 'center', border: '1.5px solid #e8eef8' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: 800, color: '#1B3A6B', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' },
};
