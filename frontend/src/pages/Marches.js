import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { tenderService } from '../services/api';
import {
  Landmark, MapPin, Calendar, Coins, AlertTriangle, Clock, ArrowRight, ArrowUpRight,
  Download, Search, RefreshCw, Bot, HardHat, Package, Settings, Laptop, Shield, ClipboardList,
} from 'lucide-react';

const exportCSV = async (filters) => {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.sector) params.set('sector', filters.sector);
    if (filters.region) params.set('region', filters.region);
    const url = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1'}/tenders/export?${params.toString()}`;
    const token = localStorage.getItem('token');
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `marches_armp_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  } catch {}
};

/* ── Constantes ── */
const REGIONS = ['Centre','Littoral','Ouest','Nord','Sud','Est','Adamaoua','Extrême-Nord','Nord-Ouest','Sud-Ouest'];
const SECTORS = ['travaux','fournitures','services','informatique','assurance'];
const PROCEDURE_TYPES = [
  "Appel d'Offres National Ouvert",
  "Appel d'Offres International",
  "Demande de Cotation",
  "Appel à Manifestation d'Intérêt",
  "Additif / Rectificatif",
  "Décision d'Attribution",
  "Décision d'Infructuosité",
  "Décision d'Annulation",
  "Communiqué",
];
const SORT_OPTIONS = [
  { val: 'publication_date:desc', label: 'Plus récents' },
  { val: 'publication_date:asc',  label: 'Plus anciens' },
  { val: 'deadline:asc',          label: 'Clôture proche' },
  { val: 'estimated_amount:desc', label: 'Montant décroissant' },
  { val: 'estimated_amount:asc',  label: 'Montant croissant' },
];
const STATUS_MAP = {
  open:      { label: 'Ouvert',     bg: '#007A5E', dot: '#4ade80' },
  closed:    { label: 'Fermé',      bg: '#64748b', dot: '#94a3b8' },
  awarded:   { label: 'Attribué',   bg: '#d97706', dot: '#fbbf24' },
  cancelled: { label: 'Annulé',     bg: '#CE1126', dot: '#f87171' },
};
const SECTOR_ICONS = { travaux: HardHat, fournitures: Package, services: Settings, informatique: Laptop, assurance: Shield };
const TYPE_COLORS = {
  "Appel d'Offres National Ouvert": '#1B3A6B',
  "Appel d'Offres International":   '#0e7490',
  "Demande de Cotation":            '#7c3aed',
  "Appel à Manifestation d'Intérêt":'#0891b2',
  "Additif / Rectificatif":         '#ea580c',
  "Décision d'Infructuosité":       '#dc2626',
  "Communiqué":                     '#64748b',
};

function SectorIcon({ sector, size = 12 }) {
  const Icon = SECTOR_ICONS[sector] || ClipboardList;
  return <Icon size={size} />;
}

function fmt_amount(n) {
  if (!n) return null;
  const v = Number(n);
  if (v >= 1_000_000_000) return `${(v/1_000_000_000).toFixed(1)} Mds FCFA`;
  if (v >= 1_000_000)     return `${(v/1_000_000).toFixed(1)} M FCFA`;
  return `${v.toLocaleString('fr-FR')} FCFA`;
}

function days_left(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  return diff;
}

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div style={s.card}>
      <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 8, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 16, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '55%', marginBottom: 6, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '45%', marginBottom: 20, borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 34, flex: 1, borderRadius: 7 }} />
        <div className="skeleton" style={{ height: 34, flex: 1, borderRadius: 7 }} />
      </div>
    </div>
  );
}

/* ── Carte marché ── */
function TenderCard({ tender, onClick }) {
  const st = STATUS_MAP[tender.status] || STATUS_MAP.closed;
  const dl = days_left(tender.deadline);
  const typeColor = TYPE_COLORS[tender.procedure_type] || '#1B3A6B';
  const urgent = dl !== null && dl >= 0 && dl <= 7;

  return (
    <article style={{ ...s.card, borderTop: `3px solid ${typeColor}` }} className="card-hover" onClick={onClick}>
      {/* En-tête statut + type */}
      <div style={s.cardHead}>
        <span style={{ ...s.statusBadge, background: st.bg }}>
          <span style={{ ...s.statusDot, background: st.dot }} />
          {st.label}
        </span>
        {tender.procedure_type && (
          <span style={{ ...s.typeBadge, color: typeColor, borderColor: typeColor + '33', background: typeColor + '0d' }}>
            {tender.procedure_type}
          </span>
        )}
      </div>

      {/* Titre */}
      <h3 style={s.cardTitle}>{tender.title}</h3>

      {/* Autorité */}
      <div style={s.cardAuth}>
        <span style={s.authIcon}><Landmark size={14} /></span>
        {tender.authority || '—'}
      </div>

      {/* Méta-données */}
      <div style={s.metaGrid}>
        {tender.region && (
          <div style={s.metaItem}>
            <span style={s.metaIcon}><MapPin size={12} /></span>
            <span>{tender.region}</span>
          </div>
        )}
        {tender.sector && (
          <div style={s.metaItem}>
            <span style={s.metaIcon}><SectorIcon sector={tender.sector} size={12} /></span>
            <span style={{ textTransform: 'capitalize' }}>{tender.sector}</span>
          </div>
        )}
        {tender.publication_date && (
          <div style={s.metaItem}>
            <span style={s.metaIcon}><Calendar size={12} /></span>
            <span>{new Date(tender.publication_date).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
        {tender.estimated_amount && (
          <div style={s.metaItem}>
            <span style={s.metaIcon}><Coins size={12} /></span>
            <span style={{ fontWeight: 700, color: '#007A5E' }}>{fmt_amount(tender.estimated_amount)}</span>
          </div>
        )}
      </div>

      {/* Deadline */}
      {tender.deadline && (
        <div style={{ ...s.deadline, background: urgent ? '#fef2f2' : '#f0fdf4', borderColor: urgent ? '#fecaca' : '#bbf7d0' }}>
          <span style={{ color: urgent ? '#CE1126' : '#007A5E', fontWeight: 700, fontSize: 11 }}>
            {urgent
              ? <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              : <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
            Clôture : {new Date(tender.deadline).toLocaleDateString('fr-FR')}
            {dl !== null && dl >= 0 && (
              <span style={{ marginLeft: 6, opacity: 0.8 }}>
                ({dl === 0 ? "aujourd'hui" : `${dl} j restants`})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={s.cardActions}>
        <button style={s.btnPrimary} className="btn-hover" onClick={e => { e.stopPropagation(); onClick(); }}>
          Voir les détails <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
        </button>
        {tender.source_url && (
          <a href={tender.source_url} target="_blank" rel="noreferrer"
             style={s.btnOutline} className="btn-hover" onClick={e => e.stopPropagation()}>
            ARMP <ArrowUpRight size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
          </a>
        )}
      </div>
    </article>
  );
}

/* ══════════════════ PAGE MARCHÉS ══════════════════ */
export default function Marches() {
  const [tenders, setTenders]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('grid'); // 'grid' | 'list'
  const [sort, setSort]         = useState('publication_date:desc');
  const [filters, setFilters]   = useState({
    search: '', status: '', sector: '', region: '',
    procedure_type: '', min_amount: '', max_amount: '',
  });
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const LIMIT = 12;

  // Initialiser filtres depuis URL
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const sector = searchParams.get('sector') || '';
    setFilters(f => ({ ...f, search, sector }));
  }, [searchParams]);

  const load = useCallback(() => {
    setLoading(true);
    const [sort_by, sort_dir] = sort.split(':');
    tenderService.list({
      ...filters,
      min_amount: filters.min_amount ? Number(filters.min_amount) * 1_000_000 : undefined,
      max_amount: filters.max_amount ? Number(filters.max_amount) * 1_000_000 : undefined,
      page, limit: LIMIT, sort_by, sort_dir,
    })
      .then(r => { setTenders(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(() => { setTenders([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [filters, page, sort]);

  useEffect(() => { load(); }, [load]);

  const handle = e => { setFilters(f => ({ ...f, [e.target.name]: e.target.value })); setPage(1); };
  const reset  = () => {
    setFilters({ search: '', status: '', sector: '', region: '', procedure_type: '', min_amount: '', max_amount: '' });
    setSort('publication_date:desc');
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);
  const activeFilterCount = [
    filters.search, filters.status, filters.sector, filters.region,
    filters.procedure_type, filters.min_amount, filters.max_amount,
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  return (
    <div style={s.page}>
      <style>{`
        .filter-input { transition: border-color .2s, box-shadow .2s; }
        .filter-input:focus { border-color: #1B3A6B !important; box-shadow: 0 0 0 3px rgba(27,58,107,0.1); outline: none; }
        .view-btn { padding: 7px 12px; border: 1.5px solid #dde3f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all .15s; }
        .view-btn.active { background: #1B3A6B; color: #fff; border-color: #1B3A6B; }
        .page-btn { min-width: 36px; height: 36px; border: 1.5px solid #dde3f0; background: #fff; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all .15s; display:flex; align-items:center; justify-content:center; }
        .page-btn:hover:not(:disabled) { background: #1B3A6B; color: #fff; border-color: #1B3A6B; }
        .page-btn.current { background: #1B3A6B; color: #fff; border-color: #1B3A6B; }
        .page-btn:disabled { opacity: .35; cursor: not-allowed; }
        .sector-pill { padding: 5px 12px; border-radius: 20px; border: 1.5px solid #dde3f0; background: #fff; font-size: 12px; cursor: pointer; transition: all .15s; font-weight: 500; }
        .sector-pill.active { background: #1B3A6B; color: #fff; border-color: #1B3A6B; }
        .sector-pill:hover:not(.active) { border-color: #1B3A6B; color: #1B3A6B; }
        .list-card { display: flex; gap: 16px; align-items: flex-start; background: #fff; border-radius: 10px; padding: 16px 20px; border: 1.5px solid #e8eef8; cursor: pointer; transition: box-shadow .2s, transform .2s; }
        .list-card:hover { box-shadow: 0 4px 16px rgba(27,58,107,0.1); transform: translateX(3px); }

        @media (max-width: 768px) {
          .marches-header { padding: 24px 16px 0 !important; }
          .marches-header-inner { flex-direction: column !important; align-items: stretch !important; }
          .marches-header-stats { justify-content: space-between !important; }
          .marches-body { flex-direction: column !important; padding: 20px 16px !important; gap: 16px !important; }
          .marches-sidebar { width: 100% !important; }
          .marches-toolbar { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .marches-toolbar-controls { justify-content: space-between !important; flex-wrap: wrap !important; }
          .marches-grid { grid-template-columns: 1fr !important; }
          .list-card { flex-direction: column !important; align-items: stretch !important; }
          .list-card > div:last-child { text-align: left !important; margin-top: 10px; }
          .list-card > div:last-child > div:last-child { justify-content: flex-start !important; }
        }
      `}</style>

      {/* ── En-tête ── */}
      <div style={s.header} className="animate-fadeIn marches-header">
        <div style={s.headerInner} className="marches-header-inner">
          <div>
            <div style={s.headerBreadcrumb}>
              <Link to="/" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: 13 }}>Accueil</Link>
              <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 8px' }}>›</span>
              <span style={{ color: '#FCD116', fontSize: 13, fontWeight: 600 }}>Marchés Publics</span>
            </div>
            <h1 style={s.headerTitle}>Marchés Publics</h1>
            <p style={s.headerSub}>
              {loading ? 'Chargement...' : `${total.toLocaleString('fr-FR')} publication${total > 1 ? 's' : ''} officielle${total > 1 ? 's' : ''} ARMP`}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <div style={s.headerStats} className="marches-header-stats">
              {[
                { label: 'Ouverts', val: tenders.filter(t => t.status === 'open').length, color: '#4ade80' },
                { label: 'Cette page', val: tenders.length, color: '#FCD116' },
                { label: 'Total', val: total, color: '#93c5fd' },
              ].map(st => (
                <div key={st.label} style={s.headerStat}>
                  <div style={{ ...s.headerStatVal, color: st.color }}>{st.val}</div>
                  <div style={s.headerStatLabel}>{st.label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => exportCSV(filters)}
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Download size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Exporter CSV
            </button>
          </div>
        </div>

        {/* Pills secteurs rapides */}
        <div style={s.sectorPills}>
          <button className={`sector-pill${!filters.sector ? ' active' : ''}`} onClick={() => { setFilters(f => ({...f, sector:''})); setPage(1); }}>
            Tous
          </button>
          {SECTORS.map(sec => (
            <button key={sec} className={`sector-pill${filters.sector === sec ? ' active' : ''}`}
              onClick={() => { setFilters(f => ({...f, sector: filters.sector === sec ? '' : sec})); setPage(1); }}>
              <SectorIcon sector={sec} size={13} /> {sec.charAt(0).toUpperCase() + sec.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Corps ── */}
      <div style={s.body} className="marches-body">
        {/* ── Sidebar filtres ── */}
        <aside style={s.sidebar} className="animate-slideLeft marches-sidebar">
          <div style={s.sideCard}>
            <div style={s.sideHead}>
              <h3 style={s.sideTitle}>
                <Search size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Filtres
                {activeFilterCount > 0 && (
                  <span style={{ marginLeft: 7, background: '#CE1126', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, verticalAlign: 'middle' }}>
                    {activeFilterCount}
                  </span>
                )}
              </h3>
              {hasFilters && (
                <button onClick={reset} style={s.clearBtn}>Effacer</button>
              )}
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Recherche</label>
              <div style={s.searchWrap}>
                <span style={s.searchIcon2}><Search size={14} /></span>
                <input name="search" value={filters.search} onChange={handle}
                  placeholder="Titre, référence, autorité..." style={s.searchInput} className="filter-input" />
              </div>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Statut</label>
              <div style={s.statusButtons}>
                {[{v:'',l:'Tous'}, ...Object.entries(STATUS_MAP).map(([v,d]) => ({v, l:d.label}))].map(({v,l}) => (
                  <button key={v} onClick={() => { setFilters(f=>({...f,status:v})); setPage(1); }}
                    style={{ ...s.statusBtn, ...(filters.status===v ? s.statusBtnActive : {}) }}>
                    {v && <span style={{ ...s.dot, background: STATUS_MAP[v]?.dot }} />}{l}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Région</label>
              <select name="region" value={filters.region} onChange={handle} style={s.select} className="filter-input">
                <option value="">Toutes les régions</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Secteur</label>
              <select name="sector" value={filters.sector} onChange={handle} style={s.select} className="filter-input">
                <option value="">Tous les secteurs</option>
                {SECTORS.map(sec => (
                  <option key={sec} value={sec}>{sec.charAt(0).toUpperCase() + sec.slice(1)}</option>
                ))}
              </select>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Type de procédure</label>
              <select name="procedure_type" value={filters.procedure_type} onChange={handle} style={s.select} className="filter-input">
                <option value="">Tous les types</option>
                {PROCEDURE_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
              </select>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Montant estimé (millions FCFA)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number" name="min_amount" value={filters.min_amount} onChange={handle}
                  placeholder="Min" min="0" style={{ ...s.select, width: '50%', padding: '8px 10px' }}
                  className="filter-input" />
                <input
                  type="number" name="max_amount" value={filters.max_amount} onChange={handle}
                  placeholder="Max" min="0" style={{ ...s.select, width: '50%', padding: '8px 10px' }}
                  className="filter-input" />
              </div>
              {(filters.min_amount || filters.max_amount) && (
                <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>
                  {filters.min_amount ? `≥ ${Number(filters.min_amount).toLocaleString('fr-FR')}M` : ''}{filters.min_amount && filters.max_amount ? ' · ' : ''}{filters.max_amount ? `≤ ${Number(filters.max_amount).toLocaleString('fr-FR')}M` : ''} FCFA
                </p>
              )}
            </div>

            {hasFilters && (
              <button onClick={reset} style={s.resetBtn} className="btn-hover">
                <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Réinitialiser les filtres
              </button>
            )}
          </div>

          {/* Encart IA */}
          <div style={s.iaCard}>
            <div style={s.iaEmoji}><Bot size={28} /></div>
            <h4 style={s.iaTitle}>Besoin d'aide ?</h4>
            <p style={s.iaDesc}>Notre assistant IA peut vous aider à analyser ces marchés et préparer vos dossiers.</p>
            <button style={s.iaBtn} className="btn-hover" onClick={() => navigate('/chat')}>
              Demander à l'IA <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
            </button>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <main style={s.main}>
          {/* Barre d'actions */}
          <div style={s.toolbar} className="marches-toolbar">
            <span style={s.toolbarCount}>
              {loading ? '…' : (
                <>
                  <strong style={{ color: '#1B3A6B' }}>{total.toLocaleString('fr-FR')}</strong>
                  {' '}résultat{total > 1 ? 's' : ''}
                  {activeFilterCount > 0 && (
                    <span style={s.filterTag}>
                      &nbsp;·&nbsp;
                      <span style={{ background: '#CE1126', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{activeFilterCount}</span>
                      &nbsp;filtre{activeFilterCount > 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="marches-toolbar-controls">
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
                style={{ border: '1.5px solid #dde3f0', borderRadius: 7, padding: '6px 10px', fontSize: 12, cursor: 'pointer', background: '#fff', color: '#1B3A6B', fontWeight: 600 }}
                className="filter-input">
                {SORT_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              </select>
              <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Vue grille">⊞</button>
              <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="Vue liste">≡</button>
            </div>
          </div>

          {/* Grille / Liste */}
          {loading ? (
            <div style={s.grid} className="marches-grid">
              {Array.from({length: 6}).map((_,i) => <SkeletonCard key={i} />)}
            </div>
          ) : tenders.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}><Search size={48} /></div>
              <h3 style={s.emptyTitle}>Aucun marché trouvé</h3>
              <p style={s.emptySub}>Essayez d'ajuster vos filtres ou d'élargir votre recherche.</p>
              {hasFilters && <button onClick={reset} style={s.resetBtn} className="btn-hover">Effacer les filtres</button>}
            </div>
          ) : view === 'grid' ? (
            <div style={s.grid} className="animate-slideUp marches-grid">
              {tenders.map(t => (
                <TenderCard key={t.id} tender={t} onClick={() => navigate(`/marches/${t.id}`)} />
              ))}
            </div>
          ) : (
            <div style={s.listWrap} className="animate-slideUp">
              {tenders.map(t => {
                const st = STATUS_MAP[t.status] || STATUS_MAP.closed;
                const dl = days_left(t.deadline);
                return (
                  <div key={t.id} className="list-card" onClick={() => navigate(`/marches/${t.id}`)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ ...s.statusBadge, background: st.bg, fontSize: 10 }}>
                          <span style={{ ...s.statusDot, background: st.dot }} />{st.label}
                        </span>
                        {t.procedure_type && <span style={{ fontSize: 11, color: '#64748b' }}>{t.procedure_type}</span>}
                      </div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1B3A6B', margin: '0 0 4px', lineHeight: 1.4 }}>{t.title}</h4>
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <Landmark size={12} /> {t.authority} {t.region && <>· <MapPin size={12} /> {t.region}</>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {t.estimated_amount && <div style={{ fontSize: 13, fontWeight: 700, color: '#007A5E' }}>{fmt_amount(t.estimated_amount)}</div>}
                      {t.deadline && <div style={{ fontSize: 11, color: dl !== null && dl <= 7 ? '#CE1126' : '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}><Clock size={11} /> {new Date(t.deadline).toLocaleDateString('fr-FR')}</div>}
                      <button style={{ ...s.btnPrimary, marginTop: 8, fontSize: 11, padding: '6px 12px' }} onClick={e => { e.stopPropagation(); navigate(`/marches/${t.id}`); }}>
                        Voir <ArrowRight size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={s.pagination}>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}>‹</button>

              {Array.from({length: Math.min(totalPages, 7)}).map((_, i) => {
                let p;
                if (totalPages <= 7) { p = i + 1; }
                else if (page <= 4) { p = i + 1; if (i === 6) p = totalPages; }
                else if (page >= totalPages - 3) { p = totalPages - 6 + i; if (i === 0) p = 1; }
                else { const mid = [1, page-2, page-1, page, page+1, page+2, totalPages]; p = mid[i]; }
                return (
                  <button key={i} className={`page-btn${p === page ? ' current' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}

              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>›</button>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>

              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                Page {page} / {totalPages}
              </span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ════════════════ STYLES ════════════════ */
const s = {
  page: { minHeight: '100vh', background: '#f1f5f9' },

  /* Header */
  header: { background: 'linear-gradient(135deg, #0f1e3d 0%, #1B3A6B 60%, #0d2a1a 100%)', padding: '32px 40px 0', color: '#fff' },
  headerInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 24 },
  headerBreadcrumb: { marginBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: 900, margin: '0 0 6px', letterSpacing: -.5 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 },
  headerStats: { display: 'flex', gap: 24 },
  headerStat: { textAlign: 'center' },
  headerStatVal: { fontSize: 28, fontWeight: 900, lineHeight: 1 },
  headerStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  sectorPills: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, paddingTop: 4, scrollbarWidth: 'none' },

  /* Body */
  body: { display: 'flex', gap: 24, padding: '28px 40px', maxWidth: 1400, margin: '0 auto' },

  /* Sidebar */
  sidebar: { width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 },
  sideCard: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e8eef8' },
  sideHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sideTitle: { fontSize: 15, fontWeight: 800, color: '#1B3A6B', margin: 0 },
  clearBtn: { fontSize: 11, color: '#CE1126', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 },
  filterGroup: { marginBottom: 16 },
  filterLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 },
  searchWrap: { position: 'relative' },
  searchIcon2: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none' },
  searchInput: { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px 9px 32px', fontSize: 13, boxSizing: 'border-box', background: '#f8faff' },
  statusButtons: { display: 'flex', flexDirection: 'column', gap: 5 },
  statusBtn: { width: '100%', textAlign: 'left', background: '#f8faff', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '7px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 },
  statusBtnActive: { background: '#1B3A6B', color: '#fff', borderColor: '#1B3A6B' },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  select: { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', background: '#f8faff', cursor: 'pointer' },
  resetBtn: { width: '100%', background: '#CE1126', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 13, marginTop: 4 },

  /* IA card */
  iaCard: { background: 'linear-gradient(135deg, #0f1e3d, #1B3A6B)', borderRadius: 14, padding: 20, color: '#fff' },
  iaEmoji: { fontSize: 28, marginBottom: 8 },
  iaTitle: { fontSize: 14, fontWeight: 800, margin: '0 0 6px' },
  iaDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 14px' },
  iaBtn: { width: '100%', background: '#CE1126', color: '#fff', border: 'none', borderRadius: 7, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 },

  /* Main */
  main: { flex: 1, minWidth: 0 },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  toolbarCount: { fontSize: 14, color: '#64748b', fontWeight: 500 },
  filterTag: { color: '#CE1126', fontWeight: 700 },

  /* Grid */
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 },
  listWrap: { display: 'flex', flexDirection: 'column', gap: 10 },

  /* Card */
  card: { background: '#fff', borderRadius: 12, padding: 18, border: '1.5px solid #e8eef8', cursor: 'pointer' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  statusDot: { width: 6, height: 6, borderRadius: '50%' },
  typeBadge: { fontSize: 10, borderRadius: 4, padding: '2px 8px', border: '1px solid', fontWeight: 600, textAlign: 'right', maxWidth: 160, lineHeight: 1.4 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#1B3A6B', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardAuth: { fontSize: 12, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  authIcon: { flexShrink: 0 },
  metaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginBottom: 12 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' },
  metaIcon: { fontSize: 12, flexShrink: 0 },
  deadline: { border: '1px solid', borderRadius: 7, padding: '6px 10px', marginBottom: 12 },
  cardActions: { display: 'flex', gap: 8 },
  btnPrimary: { flex: 1, background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 7, padding: '9px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  btnOutline: { background: '#fff', color: '#1B3A6B', border: '1.5px solid #1B3A6B', borderRadius: 7, padding: '9px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' },

  /* Empty */
  empty: { textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 14, border: '1.5px solid #e8eef8' },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: 800, color: '#1B3A6B', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },

  /* Pagination */
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 36, flexWrap: 'wrap' },
};
