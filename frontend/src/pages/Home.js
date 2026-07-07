import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tenderService, dashboardService } from '../services/api';
import {
  HardHat, Package, Settings, Laptop, Shield, ClipboardList, AlertTriangle,
  Landmark, MapPin, Clock, ArrowRight, CheckCircle2, Trophy, Map, Search,
  Bot, BarChart3, Coins, Upload, Inbox, Scale, FileText, Lock, Zap, BookOpen,
} from 'lucide-react';
import heroBgImage from '../assets/hero-bg.jpg';

/* ── InView hook ── */
function useInView(threshold = 0.12) {
  const ref = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── CountUp ── */
function CountUp({ target, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useInView();
  useEffect(() => {
    if (!visible || !target) return;
    const n = parseInt(String(target).replace(/\D/g, '')) || 0;
    let i = 0; const steps = 45; const dur = 1400;
    const t = setInterval(() => {
      i++;
      setVal(Math.round(n * i / steps));
      if (i >= steps) { setVal(n); clearInterval(t); }
    }, dur / steps);
    return () => clearInterval(t);
  }, [visible, target]);
  return <span ref={ref}>{prefix}{val.toLocaleString('fr-FR')}{suffix}</span>;
}

/* ── Helpers ── */
function fmtAmount(n) {
  if (!n) return null;
  const v = Number(n);
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Mds FCFA`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)} M FCFA`;
  return `${v.toLocaleString('fr-FR')} FCFA`;
}

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

const SECTOR_COLORS = {
  travaux:      { bg: '#e8f5f2', color: '#007A5E', icon: HardHat },
  fournitures:  { bg: '#fff7e6', color: '#d97706', icon: Package },
  services:     { bg: '#eff6ff', color: '#1B3A6B', icon: Settings },
  informatique: { bg: '#f5f3ff', color: '#7c3aed', icon: Laptop },
  assurance:    { bg: '#fef2f2', color: '#CE1126', icon: Shield },
};

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div style={s.card}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 22, width: 90, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ height: 16, width: '95%', marginBottom: 7, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 16, width: '75%', marginBottom: 14, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 6, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '50%', marginBottom: 16, borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 34, flex: 1, borderRadius: 7 }} />
      </div>
    </div>
  );
}

/* ── Carte marché ── */
function TenderCard({ tender, onClick }) {
  const STATUS = {
    open:      { label: 'Ouvert',    bg: '#f0fdf4', color: '#007A5E', dot: '#007A5E' },
    closed:    { label: 'Fermé',     bg: '#f8fafc', color: '#64748b', dot: '#64748b' },
    awarded:   { label: 'Attribué',  bg: '#fffbeb', color: '#d97706', dot: '#d97706' },
    cancelled: { label: 'Annulé',    bg: '#fff0f0', color: '#CE1126', dot: '#CE1126' },
  };
  const st = STATUS[tender.status] || STATUS.closed;
  const dl = daysLeft(tender.deadline);
  const urgent = dl !== null && dl >= 0 && dl <= 7;
  const sectorInfo = SECTOR_COLORS[tender.sector?.toLowerCase()] || { bg: '#f0f4ff', color: '#1B3A6B', icon: ClipboardList };
  const amount = fmtAmount(tender.estimated_amount);

  return (
    <div style={{ ...s.card, ...(urgent ? s.cardUrgent : {}) }} className="card-hover" onClick={onClick}>
      {urgent && <div style={s.urgentBar}><AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />Clôture dans {dl === 0 ? "aujourd'hui" : `${dl}j`}</div>}
      <div style={s.cardTop}>
        <span style={{ ...s.statusBadge, background: st.bg, color: st.color, border: `1px solid ${st.color}33` }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0, display: 'inline-block' }} />
          {st.label}
        </span>
        {tender.sector && (
          <span style={{ ...s.sectorBadge, background: sectorInfo.bg, color: sectorInfo.color }}>
            <sectorInfo.icon size={11} style={{ marginRight: 3, verticalAlign: '-2px' }} />{tender.sector}
          </span>
        )}
      </div>

      <h3 style={s.cardTitle}>{tender.title}</h3>
      <p style={s.cardAuth}><Landmark size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />{tender.authority || '—'}</p>

      <div style={s.cardMeta}>
        <span><MapPin size={12} style={{ marginRight: 3, verticalAlign: '-2px' }} />{tender.region || 'Cameroun'}</span>
        {tender.procedure_type && <span style={s.procBadge}>{tender.procedure_type.replace('Appel d\'Offres', 'AO').replace('National Ouvert', 'National')}</span>}
      </div>

      <div style={s.cardFooter}>
        <div style={s.cardFooterLeft}>
          {amount && <div style={s.amountBadge}>{amount}</div>}
          <span style={{ fontSize: 11, color: '#888' }}>
            <Clock size={12} style={{ marginRight: 3, verticalAlign: '-2px' }} />{tender.deadline ? new Date(tender.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </span>
        </div>
        <button style={s.cardBtn} onClick={onClick}>Détails <ArrowRight size={12} style={{ verticalAlign: '-2px' }} /></button>
      </div>
    </div>
  );
}

/* ── Step card ── */
function StepCard({ num, icon: Icon, title, desc, delay, color }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} style={{ ...s.hcard, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transition: `opacity .5s ${delay}s ease, transform .5s ${delay}s ease` }} className="card-hover">
      <div style={{ ...s.hnum, background: color }}>{num}</div>
      <div style={{ marginBottom: 12, color }}>{Icon && <Icon size={34} />}</div>
      <h4 style={s.hTitle}>{title}</h4>
      <p style={s.hDesc}>{desc}</p>
    </div>
  );
}

/* ═══════════════════════════ PAGE HOME ═══════════════════════════ */
export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tenders, setTenders] = useState([]);
  const [urgentTenders, setUrgentTenders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingTenders, setLoadingTenders] = useState(true);
  const [statsRef, statsVisible] = useInView();

  useEffect(() => {
    /* marchés ouverts récents */
    tenderService.list({ limit: 6, status: 'open', sort_by: 'publication_date', sort_dir: 'desc' })
      .then(r => setTenders(r.data.items || []))
      .catch(() => setTenders([]))
      .finally(() => setLoadingTenders(false));

    /* marchés urgents (deadline proche) — on prend les ouverts triés par deadline ASC */
    tenderService.list({ limit: 4, status: 'open', sort_by: 'deadline', sort_dir: 'asc' })
      .then(r => {
        const items = (r.data.items || []).filter(t => {
          const dl = daysLeft(t.deadline);
          return dl !== null && dl >= 0 && dl <= 14;
        });
        setUrgentTenders(items);
      })
      .catch(() => {});

    /* stats KPIs */
    dashboardService.stats()
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    navigate(`/marches${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  };

  const STAT_ITEMS = [
    { val: stats?.total_tenders,    suffix: '',  label: 'Marchés publiés',    icon: ClipboardList, color: '#FCD116' },
    { val: stats?.open_tenders,     suffix: '',  label: 'Ouverts actuellement',icon: CheckCircle2, color: '#4ade80' },
    { val: stats?.awarded_tenders,  suffix: '',  label: 'Marchés attribués',   icon: Trophy, color: '#f59e0b' },
    { val: 10,                      suffix: '',  label: 'Régions couvertes',   icon: Map, color: '#60a5fa' },
  ];

  return (
    <div style={{ background: '#f0f2f5', color: '#1a1a2e' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4}50%{opacity:1} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0}to{opacity:1} }
        .animate-fadeIn   { animation: fadeIn .6s ease forwards }
        .animate-slideDown{ animation: slideDown .5s ease forwards }
        .animate-slideUp  { animation: slideUp .6s ease forwards }
        .delay-1{ animation-delay:.1s; opacity:0 }
        .delay-2{ animation-delay:.25s; opacity:0 }
        .delay-3{ animation-delay:.4s; opacity:0 }
        .delay-4{ animation-delay:.55s; opacity:0 }
        .delay-5{ animation-delay:.7s; opacity:0 }
        .card-hover { transition: transform .2s, box-shadow .2s; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(27,58,107,0.12) !important; }
        .btn-hover { transition: transform .15s, opacity .15s; }
        .btn-hover:hover { transform: translateY(-1px); opacity: .9; }
        .skeleton { background: linear-gradient(90deg,#f0f2f5 25%,#e2e8f0 50%,#f0f2f5 75%); background-size:200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
        @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        .urgent-ticker { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .urgent-ticker::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .hero-content { padding: 40px 16px !important; }
          .search-bar { flex-direction: column !important; border-radius: 10px !important; }
          .search-bar input { width: 100% !important; padding: 12px 14px !important; }
          .search-bar button { width: 100% !important; padding: 12px !important; }
          .ai-banner { grid-template-columns: 1fr !important; padding: 32px 20px !important; gap: 28px !important; }
          .urgent-header { flex-wrap: wrap !important; gap: 8px !important; }
          .action-banner { grid-template-columns: 1fr !important; }
          .action-card { border-right: none !important; border-bottom: 1px solid #f0f4ff !important; }
          .cards-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .stats-band { grid-template-columns: repeat(2, 1fr) !important; }
          .badges-bar { justify-content: flex-start !important; }
          .badge-item { padding: 14px 16px !important; flex: 1 1 45% !important; border-right: none !important; }
        }
        @media (max-width: 420px) {
          .stats-band { grid-template-columns: 1fr !important; }
          .badge-item { flex: 1 1 100% !important; }
        }
      `}</style>

      {/* ══ HERO ══ */}
      <div style={s.hero}>
        <div style={{ ...s.heroBgImage, backgroundImage: `url(${heroBgImage})` }} />
        <div style={s.heroBg} />
        <svg style={s.heroPattern} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="rg1" cx="70%" cy="40%">
              <stop offset="0%" stopColor="#CE1126" stopOpacity=".18" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="rg2" cx="20%" cy="70%">
              <stop offset="0%" stopColor="#007A5E" stopOpacity=".15" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="800" height="400" fill="url(#rg1)" />
          <rect width="800" height="400" fill="url(#rg2)" />
          {[0,1,2,3,4,5].map(i => <line key={i} x1={i*160} y1="0" x2={i*160} y2="400" stroke="rgba(255,255,255,.04)" strokeWidth="1" />)}
          {[0,1,2,3].map(i => <line key={i} x1="0" y1={i*100} x2="800" y2={i*100} stroke="rgba(255,255,255,.04)" strokeWidth="1" />)}
          <circle cx="650" cy="80"  r="120" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
          <circle cx="650" cy="80"  r="80"  fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
          <circle cx="100" cy="300" r="90"  fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
        </svg>

        <div style={s.heroContent} className="animate-fadeIn hero-content">
          <h1 style={s.heroH1} className="animate-slideUp delay-1">
            Trouvez et remportez<br />
            <span style={{ color: '#FCD116' }}>des marchés publics</span><br />
            au Cameroun
          </h1>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} style={s.searchBar} className="animate-slideUp delay-3 search-bar">
            <span style={{ padding: '0 14px', fontSize: 16, display: 'flex', alignItems: 'center' }}><Search size={16} /></span>
            <input style={s.searchInput} type="text" placeholder="Rechercher un marché, une autorité, un secteur..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <button type="submit" style={s.searchBtn} className="btn-hover">Rechercher</button>
          </form>

          {/* Filtres rapides */}
          <div style={s.pills} className="animate-slideUp delay-4">
            {[
              { label: 'Travaux',      sector: 'travaux', icon: HardHat },
              { label: 'Fournitures',  sector: 'fournitures', icon: Package },
              { label: 'Services',     sector: 'services', icon: Settings },
              { label: 'Informatique', sector: 'informatique', icon: Laptop },
              { label: 'Assurance',    sector: 'assurance', icon: Shield },
            ].map(c => (
              <button key={c.sector} style={s.pill} className="btn-hover"
                onClick={() => navigate(`/marches?sector=${c.sector}`)}>
                <c.icon size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />{c.label}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div style={s.heroCtas} className="animate-slideUp delay-5">
            <button style={s.ctaPrimary} className="btn-hover" onClick={() => navigate('/marches')}>
              <ClipboardList size={14} style={{ marginRight: 6, verticalAlign: '-3px' }} />Voir tous les marchés
            </button>
            <button style={s.ctaSecondary} className="btn-hover" onClick={() => navigate('/chat')}>
              <Bot size={14} style={{ marginRight: 6, verticalAlign: '-3px' }} />Poser une question à l'IA
            </button>
            <Link to="/transparence" style={{ ...s.ctaOutline }} className="btn-hover">
              <BarChart3 size={14} style={{ marginRight: 6, verticalAlign: '-3px' }} />Tableau de bord
            </Link>
          </div>
        </div>
      </div>

      {/* ══ BANDEAU STATS LIVE ══ */}
      <div ref={statsRef} style={s.statsBand} className="stats-band">
        {STAT_ITEMS.map((st, i) => (
          <div key={i} style={{ ...s.statItem, borderRight: i < STAT_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
            <div style={{ marginBottom: 4, color: st.color }}><st.icon size={22} /></div>
            <div style={{ ...s.statVal, color: st.color }}>
              {statsVisible && st.val != null
                ? <CountUp target={st.val} suffix={st.suffix} />
                : <span>—</span>
              }
            </div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
        {stats?.total_amount_fcfa && (
          <div style={{ ...s.statItem, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ marginBottom: 4, color: '#FCD116' }}><Coins size={22} /></div>
            <div style={{ ...s.statVal, color: '#FCD116', fontSize: 20 }}>
              {statsVisible ? fmtAmount(stats.total_amount_fcfa) : '—'}
            </div>
            <div style={s.statLabel}>Volume engagé ({new Date().getFullYear()})</div>
          </div>
        )}
      </div>

      {/* ══ MARCHÉS URGENTS (clôture < 14 jours) ══ */}
      {urgentTenders.length > 0 && (
        <div style={s.urgentSection}>
          <div style={s.urgentHeader} className="urgent-header">
            <span style={s.urgentPill}><AlertTriangle size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />Clôture imminente</span>
            <button style={s.urgentMoreBtn} onClick={() => navigate('/marches?status=open')}>
              Voir tous les ouverts <ArrowRight size={13} style={{ verticalAlign: '-2px' }} />
            </button>
          </div>
          <div className="urgent-ticker">
            {urgentTenders.map(t => {
              const dl = daysLeft(t.deadline);
              return (
                <div key={t.id} style={s.urgentCard} className="card-hover" onClick={() => navigate(`/marches/${t.id}`)}>
                  <div style={s.urgentDays}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: dl <= 3 ? '#CE1126' : '#d97706' }}>{dl === 0 ? '!' : dl}</span>
                    <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' }}>{dl === 0 ? "auj." : "jour" + (dl > 1 ? "s" : "")}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1B3A6B', margin: '0 0 4px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.title}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: 0 }}><Landmark size={11} style={{ marginRight: 3, verticalAlign: '-2px' }} />{t.authority?.slice(0, 35) || '—'}</p>
                    {t.estimated_amount && <p style={{ fontSize: 11, fontWeight: 700, color: '#007A5E', margin: '4px 0 0' }}>{fmtAmount(t.estimated_amount)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ MARCHÉS RÉCENTS ══ */}
      <SectionWrap title="Derniers appels d'offres ouverts" action="Tous les marchés" onAction={() => navigate('/marches')}>
        {loadingTenders ? (
          <div style={s.cardsGrid} className="cards-grid">{[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}</div>
        ) : tenders.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ marginBottom: 16 }}><Inbox size={48} /></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1B3A6B', marginBottom: 8 }}>Synchronisation en cours</h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Les marchés ARMP sont en cours de chargement.</p>
            <button style={s.ctaPrimary} className="btn-hover" onClick={() => navigate('/chat')}>Poser une question à l'IA</button>
          </div>
        ) : (
          <div style={s.cardsGrid} className="cards-grid">
            {tenders.map(t => (
              <TenderCard key={t.id} tender={t} onClick={() => navigate(`/marches/${t.id}`)} />
            ))}
          </div>
        )}
      </SectionWrap>

      {/* ══ COMMENT ÇA MARCHE ══ */}
      <div style={s.howSection}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={s.sectionPill}>Guide</span>
          <h2 style={s.sectionTitle}>Comment ça marche ?</h2>
          <p style={{ fontSize: 14, color: '#666' }}>En 3 étapes simples, accédez aux marchés publics camerounais</p>
        </div>
        <div style={s.stepsGrid} className="steps-grid">
          {[
            { num: '01', icon: Search, title: 'Recherchez un marché', desc: "Utilisez nos filtres avancés — région, secteur, budget, statut — pour trouver les appels d'offres qui correspondent à votre activité.", color: '#1B3A6B', delay: 0 },
            { num: '02', icon: Bot, title: 'Analysez avec l\'IA', desc: "Notre assistant IA spécialisé vous aide à comprendre les exigences, préparer vos documents et évaluer vos chances de succès.", color: '#007A5E', delay: 0.15 },
            { num: '03', icon: Upload, title: 'Soumettez votre dossier', desc: "Préparez et déposez votre offre en toute conformité avec le Code des marchés publics camerounais.", color: '#CE1126', delay: 0.3 },
          ].map(step => <StepCard key={step.num} {...step} />)}
        </div>
      </div>

      {/* ══ BANNIÈRE IA ══ */}
      <AiBanner navigate={navigate} />

      {/* ══ BANNIÈRE TRANSPARENCE + RÉCLAMATIONS ══ */}
      <div style={s.actionBanner} className="action-banner">
        <ActionCard
          icon={BarChart3}
          color="#1B3A6B"
          title="Tableau de bord Transparence"
          desc="Visualisez la répartition des marchés publics par région, secteur, procédure et évolution mensuelle."
          cta="Accéder au tableau"
          link="/transparence"
          navigate={navigate}
        />
        <ActionCard
          icon={Scale}
          color="#CE1126"
          title="Réclamations & Signalements"
          desc="Signalez une irrégularité dans la passation des marchés. Droit de recours garanti par l'Article 74 ARMP."
          cta="Faire un signalement"
          link="/reclamations"
          navigate={navigate}
        />
        <ActionCard
          icon={FileText}
          color="#007A5E"
          title="Documents IA"
          desc="Générez automatiquement vos lettres de soumission, offres techniques, requêtes de recours et plus encore."
          cta="Générer un document"
          link="/documents"
          navigate={navigate}
        />
      </div>

      {/* ══ LABELS / PARTENAIRES ══ */}
      <div style={s.badgesBar} className="badges-bar">
        {[
          { icon: Landmark, label: 'ARMP Cameroun',     sub: 'Données officielles' },
          { icon: Lock, label: 'Données sécurisées', sub: 'Chiffrement SSL' },
          { icon: Zap, label: 'Temps réel',          sub: 'Sync toutes les heures' },
          { icon: Bot, label: 'IA intégrée',         sub: 'Powered by Claude AI' },
          { icon: '🇨🇲', label: 'Made in Cameroun',   sub: 'Plateforme nationale' },
        ].map(b => (
          <div key={b.label} style={s.badgeItem} className="badge-item">
            <span style={{ fontSize: 22, display: 'flex', alignItems: 'center' }}>{typeof b.icon === 'string' ? b.icon : <b.icon size={20} />}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A6B' }}>{b.label}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{b.sub}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ── Section wrapper ── */
function SectionWrap({ title, action, onAction, children }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} style={{ ...s.section, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)', transition: 'opacity .6s ease, transform .6s ease' }}>
      <div style={s.secHeader}>
        <h2 style={s.secTitle}>{title}</h2>
        {action && <button style={s.secBtn} className="btn-hover" onClick={onAction}>{action} <ArrowRight size={13} style={{ verticalAlign: '-2px' }} /></button>}
      </div>
      {children}
    </div>
  );
}

/* ── Action Card ── */
function ActionCard({ icon: Icon, color, title, desc, cta, link, navigate }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} style={{ ...s.actionCard, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: 'opacity .5s ease, transform .5s ease', borderTop: `4px solid ${color}` }} className="card-hover action-card">
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 14 }}>
        <Icon size={24} />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1B3A6B', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 16, flex: 1 }}>{desc}</p>
      <button style={{ ...s.actionBtn, background: color }} className="btn-hover" onClick={() => navigate(link)}>
        {cta} <ArrowRight size={13} style={{ verticalAlign: '-2px' }} />
      </button>
    </div>
  );
}

/* ── Bannière IA ── */
function AiBanner({ navigate }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} style={{ ...s.aiBanner, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)', transition: 'opacity .6s ease, transform .6s ease' }} className="ai-banner">
      <div>
        <div style={s.aiPill}><Bot size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />Intelligence Artificielle</div>
        <h2 style={s.aiTitle}>Assistant IA spécialisé en marchés publics camerounais</h2>
        <p style={s.aiDesc}>
          Posez vos questions sur le Code des marchés, les procédures ARMP, les délais de recours,
          les documents requis… et obtenez des réponses précises avec les sources officielles.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          <button style={s.aiBtnPrimary} className="btn-hover" onClick={() => navigate('/chat')}>Essayer gratuitement <ArrowRight size={13} style={{ verticalAlign: '-2px' }} /></button>
          <button style={s.aiBtnSecondary} className="btn-hover" onClick={() => navigate('/inscription')}>Créer un compte</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {['Conditions pour soumissionner ?', 'Documents requis pour un DAO ?', 'Délais de recours ARMP ?'].map(q => (
            <span key={q} style={s.aiExample} onClick={() => navigate('/chat')}>{q}</span>
          ))}
        </div>
      </div>
      <div style={s.aiChatPreview}>
        <div style={s.aiChatMsg}>
          <div style={s.aiChatAvatar}>IA</div>
          <div style={s.aiChatBubble}>Bonjour ! Je suis votre assistant spécialisé dans les marchés publics camerounais. Comment puis-je vous aider ?</div>
        </div>
        <div style={{ ...s.aiChatMsg, justifyContent: 'flex-end', margin: '12px 0' }}>
          <div style={s.aiChatBubbleUser}>Quels documents fournir pour soumissionner ?</div>
        </div>
        <div style={s.aiChatMsg}>
          <div style={s.aiChatAvatar}>IA</div>
          <div style={s.aiChatBubble}>
            Le dossier comprend 3 volumes : <strong>Administratif</strong>, <strong>Technique</strong> et <strong>Financier</strong>.
            Le volume administratif inclut notamment la déclaration sur l'honneur, les attestations fiscales…
            <div style={{ marginTop: 6, fontSize: 10, color: '#1B3A6B', background: 'rgba(27,58,107,0.1)', borderRadius: 4, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}><BookOpen size={11} />Source : DTAO Art. 13</div>
          </div>
        </div>
        <div style={{ marginTop: 12, marginLeft: 40, fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, animation: 'pulse 1.4s infinite' }}>● ● ●</div>
      </div>
    </div>
  );
}

/* ════════════════ STYLES ════════════════ */
const s = {
  hero: { position: 'relative', minHeight: 490, display: 'flex', alignItems: 'center', overflow: 'hidden' },
  heroBgImage: { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' },
  heroBg: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,30,61,0.25) 0%, rgba(27,58,107,0.2) 50%, rgba(13,42,26,0.25) 100%)' },
  heroPattern: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  heroContent: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 800, margin: '0 auto', padding: '60px 24px', textAlign: 'center', color: '#fff' },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.9)', marginBottom: 20 },
  heroH1: { fontSize: 'clamp(26px,4.5vw,42px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 16, letterSpacing: -.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, marginBottom: 28 },
  searchBar: { display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 10, overflow: 'hidden', maxWidth: 620, margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  searchInput: { flex: 1, border: 'none', padding: '14px 0', fontSize: 13, outline: 'none', color: '#333', background: 'transparent' },
  searchBtn: { background: '#CE1126', color: '#fff', border: 'none', padding: '14px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' },
  pills: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 },
  pill: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.9)', padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer' },
  heroCtas: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  ctaPrimary:   { background: '#CE1126', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(206,17,38,0.35)', textDecoration: 'none', display: 'inline-block' },
  ctaSecondary: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  ctaOutline:   { background: 'transparent', color: '#FCD116', border: '1px solid #FCD116', padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },

  statsBand: { background: '#1B3A6B', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', borderBottom: '3px solid #FCD116' },
  statItem:  { textAlign: 'center', padding: '20px 12px' },
  statVal:   { fontSize: 26, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Urgents */
  urgentSection: { background: '#fff7ed', borderTop: '3px solid #f59e0b', borderBottom: '1px solid #fde68a', padding: '16px 28px' },
  urgentHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  urgentPill:    { background: '#fef3c7', color: '#d97706', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, border: '1px solid #fde68a' },
  urgentMoreBtn: { background: 'none', border: 'none', color: '#d97706', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  urgentCard:    { display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fff', borderRadius: 12, border: '1.5px solid #fde68a', padding: '12px 14px', minWidth: 260, maxWidth: 300, flexShrink: 0, cursor: 'pointer' },
  urgentDays:    { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0, textAlign: 'center' },

  /* Cards */
  section: { background: '#fff', padding: '36px 28px', marginBottom: 8 },
  secHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  secTitle: { fontSize: 20, fontWeight: 800, color: '#1B3A6B' },
  secBtn:   { border: '1.5px solid #1B3A6B', color: '#1B3A6B', background: 'transparent', padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 18 },
  card: { background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 12, padding: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 },
  cardUrgent: { border: '1.5px solid #fde68a', background: '#fffcf5' },
  urgentBar: { background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700, borderRadius: '8px 8px 0 0', padding: '5px 10px', margin: '-18px -18px 12px', letterSpacing: 0.3 },
  cardTop: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 },
  sectorBadge: { borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#1B3A6B', marginBottom: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardAuth: { fontSize: 11.5, color: '#666', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#888', marginBottom: 10, flexWrap: 'wrap', gap: 4 },
  procBadge: { background: '#f0f4ff', color: '#1B3A6B', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0f4ff', gap: 8 },
  cardFooterLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  amountBadge: { fontSize: 12, fontWeight: 800, color: '#007A5E' },
  cardBtn: { background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },

  /* Empty */
  emptyState: { textAlign: 'center', padding: '48px 24px' },

  /* How */
  howSection: { background: '#f8faff', padding: '52px 32px', marginBottom: 8 },
  sectionPill: { display: 'inline-block', background: '#e8f5e9', color: '#007A5E', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, marginBottom: 10 },
  sectionTitle: { fontSize: 26, fontWeight: 900, color: '#1B3A6B', marginBottom: 8 },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 24, maxWidth: 960, margin: '0 auto' },
  hcard: { background: '#fff', borderRadius: 14, padding: 28, textAlign: 'center', border: '1.5px solid #e8eef8' },
  hnum: { width: 48, height: 48, borderRadius: '50%', color: '#fff', fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  hTitle: { fontSize: 15, fontWeight: 800, color: '#1B3A6B', marginBottom: 10 },
  hDesc: { fontSize: 13, color: '#666', lineHeight: 1.65 },

  /* AI banner */
  aiBanner: { background: 'linear-gradient(135deg,#0f1e3d 0%,#1B3A6B 100%)', padding: '52px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44, alignItems: 'center', marginBottom: 8 },
  aiPill: { display: 'inline-block', background: 'rgba(252,209,22,0.2)', color: '#FCD116', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, marginBottom: 14 },
  aiTitle: { fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.35, marginBottom: 12 },
  aiDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75 },
  aiBtnPrimary:   { background: '#CE1126', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  aiBtnSecondary: { background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', padding: '12px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  aiExample: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer' },
  aiChatPreview: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 20 },
  aiChatMsg: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  aiChatAvatar: { width: 30, height: 30, background: '#CE1126', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 },
  aiChatBubble: { background: 'rgba(255,255,255,0.1)', borderRadius: '4px 12px 12px 12px', padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, maxWidth: '80%' },
  aiChatBubbleUser: { background: '#CE1126', borderRadius: '12px 4px 12px 12px', padding: '10px 14px', fontSize: 12, color: '#fff', lineHeight: 1.6, maxWidth: '80%' },

  /* Action banner */
  actionBanner: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 0, background: '#fff', borderTop: '1px solid #e8eef8', marginBottom: 0 },
  actionCard: { background: '#fff', padding: '32px 28px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #f0f4ff' },
  actionBtn: { color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' },

  /* Badges */
  badgesBar: { background: '#f8faff', borderTop: '1px solid #e8eef8', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 },
  badgeItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 28px', borderRight: '1px solid #eef1f8' },
};
