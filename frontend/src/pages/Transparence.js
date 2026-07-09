import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/api';
import {
  BarChart3, Map, HardHat, TrendingUp, TrendingDown, Landmark, Download, Printer,
  ClipboardList, CircleDot, CheckCircle2, XCircle, FileText, Globe,
  PieChart as PieChartIcon, Info, ArrowRight, ArrowUpRight,
} from 'lucide-react';

const MONTH_ABBR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
/* Convertit "2026-06" en "Juin" — un slice() sur la chaîne brute donne un résultat illisible. */
function monthLabel(ym) {
  const m = /^\d{4}-(\d{2})$/.exec(String(ym));
  return m ? MONTH_ABBR[parseInt(m[1], 10) - 1] : String(ym);
}

/* ── Drapeau camerounais ── */
function CamFlag({ w = 28, h = 19 }) {
  return (
    <svg width={w} height={h} viewBox="0 0 36 24" style={{ borderRadius: 2, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
      <rect width="12" height="24" fill="#007A5E" />
      <rect x="12" width="12" height="24" fill="#CE1126" />
      <rect x="24" width="12" height="24" fill="#FCD116" />
      <polygon points="18,8 19.1,11.4 22.7,11.4 19.8,13.5 20.9,16.9 18,14.8 15.1,16.9 16.2,13.5 13.3,11.4 16.9,11.4" fill="#FCD116" />
    </svg>
  );
}

/* ── Hook InView pour animations ── */
function useInView(threshold = 0.1) {
  const ref = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── Compteur animé ── */
function CountUp({ target, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useInView();
  useEffect(() => {
    if (!visible || !target) return;
    const n = parseInt(String(target).replace(/\D/g, '')) || 0;
    const steps = 40;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVal(Math.round((n * i) / steps));
      if (i >= steps) { setVal(n); clearInterval(timer); }
    }, 1200 / steps);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{prefix}{val.toLocaleString('fr-FR')}{suffix}</span>;
}

/* ── Graphique barres horizontal ── */
function BarChart({ data, colorFn, valueLabel = '' }) {
  const [ref, visible] = useInView();
  if (!data || data.length === 0) return <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 120, fontSize: 11, color: '#555', textAlign: 'right', flexShrink: 0, lineHeight: 1.3 }}>
            {item.label}
          </div>
          <div style={{ flex: 1, background: '#eef1f8', borderRadius: 6, overflow: 'hidden', height: 22 }}>
            <div style={{
              height: '100%',
              width: visible ? `${(item.value / max) * 100}%` : '0%',
              background: colorFn ? colorFn(i) : '#1B3A6B',
              borderRadius: 6,
              transition: `width 0.8s ease ${i * 0.05}s`,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
            }}>
              {(item.value / max) > 0.15 && (
                <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{item.value.toLocaleString('fr-FR')}</span>
              )}
            </div>
          </div>
          {(item.value / max) <= 0.15 && (
            <span style={{ fontSize: 11, color: '#333', fontWeight: 600 }}>{item.value.toLocaleString('fr-FR')}</span>
          )}
          {valueLabel && <span style={{ fontSize: 10, color: '#999' }}>{valueLabel}</span>}
        </div>
      ))}
    </div>
  );
}

/* ── Camembert SVG ── */
function PieChart({ data, size = 160 }) {
  const [ref, visible] = useInView();
  const COLORS = ['#1B3A6B', '#007A5E', '#CE1126', '#FCD116', '#6B4C9A', '#E07B39', '#2E86AB', '#A8DADC'];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let angle = -Math.PI / 2;
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;

  const slices = data.map((d, i) => {
    const ratio = d.value / total;
    const startAngle = angle;
    angle += ratio * 2 * Math.PI;
    const endAngle = angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = ratio > 0.5 ? 1 : 0;
    return { d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`, color: COLORS[i % COLORS.length], label: d.label, value: d.value, pct: Math.round(ratio * 100) };
  });

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((sl, i) => (
          <path key={i} d={visible ? sl.d : `M${cx},${cy}`} fill={sl.color} stroke="#fff" strokeWidth={2}
            style={{ transition: `all 0.6s ease ${i * 0.08}s`, cursor: 'default' }}>
            <title>{sl.label} : {sl.value.toLocaleString('fr-FR')} ({sl.pct}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={r * 0.45} fill="#fff" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1B3A6B">{total.toLocaleString('fr-FR')}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="#888">Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map((sl, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: sl.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#444' }}>{sl.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1B3A6B', marginLeft: 'auto', paddingLeft: 8 }}>{sl.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Graphique courbe mensuelle ── */
function LineChart({ data, color = '#1B3A6B' }) {
  const [ref, visible] = useInView();
  if (!data || data.length === 0) return null;
  const W = 400, H = 120, pad = { t: 10, r: 10, b: 30, l: 40 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const maxV = Math.max(...data.map(d => d.count), 1);

  const pts = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * iW,
    y: pad.t + iH - (d.count / maxV) * iH,
    label: d.month,
    val: d.count,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${pad.t + iH} L${pts[0].x},${pad.t + iH} Z`;

  return (
    <div ref={ref} style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 280 }}>
        {/* Grille */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <g key={i}>
            <line x1={pad.l} y1={pad.t + iH * (1 - r)} x2={W - pad.r} y2={pad.t + iH * (1 - r)} stroke="#eef1f8" strokeWidth={1} />
            <text x={pad.l - 6} y={pad.t + iH * (1 - r) + 4} textAnchor="end" fontSize={8} fill="#aaa">{Math.round(maxV * r)}</text>
          </g>
        ))}
        {/* Aire */}
        <path d={visible ? areaD : ''} fill={color} fillOpacity={0.08} style={{ transition: 'all 0.8s ease' }} />
        {/* Ligne */}
        <path d={visible ? pathD : `M${pts[0]?.x},${pad.t + iH}`} fill="none" stroke={color} strokeWidth={2.5}
          strokeLinejoin="round" style={{ transition: 'all 0.8s ease' }} />
        {/* Points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={visible ? p.y : pad.t + iH} r={4} fill={color} stroke="#fff" strokeWidth={2}
              style={{ transition: `all 0.5s ease ${i * 0.03}s` }}>
              <title>{monthLabel(p.label)} : {p.val}</title>
            </circle>
            <text x={p.x} y={H - 6} textAnchor="middle" fontSize={8} fill="#999">{monthLabel(p.label)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── Graphique barres groupées/empilées mensuel ── */
function StackedBarChart({ data, color = '#1B3A6B' }) {
  const [ref, visible] = useInView();
  if (!data || data.length === 0) return null;
  const W = 520, H = 160, pad = { t: 14, r: 10, b: 36, l: 44 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const maxV = Math.max(...data.map(d => d.total || d.count || 0), 1);
  const barW = Math.max(8, (iW / data.length) - 6);

  return (
    <div ref={ref} style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 300 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <g key={i}>
            <line x1={pad.l} y1={pad.t + iH * (1 - r)} x2={W - pad.r} y2={pad.t + iH * (1 - r)} stroke="#eef1f8" strokeWidth={1} />
            <text x={pad.l - 5} y={pad.t + iH * (1 - r) + 4} textAnchor="end" fontSize={8} fill="#aaa">{Math.round(maxV * r)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const total = d.total || d.count || 0;
          const x = pad.l + (i / data.length) * iW + (iW / data.length - barW) / 2;
          const barH = visible ? (total / maxV) * iH : 0;
          const open = d.open || 0;
          const awarded = d.awarded || 0;
          const other = total - open - awarded;
          const openH = visible ? (open / maxV) * iH : 0;
          const awardedH = visible ? (awarded / maxV) * iH : 0;
          const otherH = barH - openH - awardedH;
          return (
            <g key={i}>
              {otherH > 0 && <rect x={x} y={pad.t + iH - barH} width={barW} height={Math.max(0, otherH)} fill="#94a3b8" rx={2} style={{ transition: `all 0.6s ease ${i * 0.04}s` }}><title>{monthLabel(d.month)}: {other} clôturés/autres</title></rect>}
              {awardedH > 0 && <rect x={x} y={pad.t + iH - openH - awardedH} width={barW} height={Math.max(0, awardedH)} fill="#2E86AB" rx={2} style={{ transition: `all 0.6s ease ${i * 0.04 + 0.1}s` }}><title>{monthLabel(d.month)}: {awarded} attribués</title></rect>}
              {openH > 0 && <rect x={x} y={pad.t + iH - openH} width={barW} height={Math.max(0, openH)} fill="#007A5E" rx={2} style={{ transition: `all 0.6s ease ${i * 0.04 + 0.2}s` }}><title>{monthLabel(d.month)}: {open} ouverts</title></rect>}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={7.5} fill="#999">{monthLabel(d.month)}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {[['#007A5E', 'Ouverts'], ['#2E86AB', 'Attribués'], ['#94a3b8', 'Autres']].map(([c, lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 10, color: '#666' }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Carte KPI ── */
function KpiCard({ icon, value, label, sub, color, delay = 0 }) {
  return (
    <div className="card-hover animate-slideUp" style={{ ...s.kpiCard, animationDelay: `${delay}s` }}>
      <div style={{ ...s.kpiIcon, background: color + '18', color }}>{icon}</div>
      <div style={s.kpiVal}><CountUp target={value} /></div>
      <div style={s.kpiLabel}>{label}</div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, icon, children, badge }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHead}>
        <span style={s.sectionIcon}>{icon}</span>
        <h2 style={s.sectionTitle}>{title}</h2>
        {badge && <span style={s.badge}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── Skeleton ── */
function SkeletonBox({ h = 200 }) {
  return <div className="skeleton" style={{ height: h, borderRadius: 10 }} />;
}

/* ── Formatage montants ── */
function fmtAmount(v) {
  if (!v) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Md FCFA`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} M FCFA`;
  return `${v.toLocaleString('fr-FR')} FCFA`;
}

/* ── Export CSV ── */
function exportCSV(filename, headers, rows) {
  const csv = [headers.join(';'), ...rows.map(r => r.map(v => `"${v}"`).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Export CSV global (toutes les données en un seul fichier multi-sections) ── */
function handleExportAll(stats, bySector, byRegion, byProcedure, byMonth, topAuthorities) {
  const lines = [];
  const row = (...cols) => lines.push(cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));

  row('TABLEAU DE BORD — MARCHÉS PUBLICS CAMEROUN');
  row(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`);
  row('Source : armp.cm / Marché-IA Cameroun');
  lines.push('');

  row('── STATISTIQUES GLOBALES ──');
  row('Indicateur', 'Valeur');
  row('Total marchés', stats.total_tenders || 0);
  row('Marchés ouverts', stats.open_tenders || 0);
  row('Marchés attribués', stats.awarded_tenders || 0);
  row('Marchés annulés', stats.cancelled_tenders || 0);
  row('Volume total (FCFA)', stats.total_amount_fcfa || 0);
  row('Montant moyen (FCFA)', stats.avg_amount_fcfa || 0);
  lines.push('');

  row('── RÉPARTITION PAR SECTEUR ──');
  row('Secteur', 'Nb marchés', 'Montant total FCFA');
  bySector.forEach(d => row(d.label, d.value, d.amount || 0));
  lines.push('');

  row('── RÉPARTITION PAR RÉGION ──');
  row('Région', 'Nb marchés', 'Montant total FCFA');
  byRegion.forEach(d => row(d.label, d.value, d.amount || 0));
  lines.push('');

  row('── TYPES DE PROCÉDURES ──');
  row('Type', 'Nb marchés');
  byProcedure.forEach(d => row(d.label, d.value));
  lines.push('');

  row('── ÉVOLUTION MENSUELLE ──');
  row('Mois', 'Total', 'Ouverts', 'Attribués');
  byMonth.forEach(d => row(d.month, d.total || d.count || 0, d.open || 0, d.awarded || 0));
  lines.push('');

  row('── TOP AUTORITÉS CONTRACTANTES ──');
  row('Rang', 'Autorité', 'Nb marchés', 'Montant total FCFA');
  topAuthorities.forEach((a, i) => row(i + 1, a.authority, a.count, a.amount || 0));

  const bom = '﻿';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marches_publics_cameroun_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════ */
export default function Transparence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('vue');

  useEffect(() => {
    dashboardService.full()
      .then(r => setData(r.data))
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false));
  }, []);

  /* Normalisation : l'API utilise "total" au lieu de "count" */
  const stats = data?.stats || {};
  const bySector = data?.by_sector?.map(d => ({ label: SECTOR_LABELS[d.sector] || d.sector, value: d.total || 0, amount: d.total_amount || 0 })) || [];
  const byRegion = (data?.by_region?.map(d => ({ label: d.region || 'Non précisée', value: d.total || 0, amount: d.total_amount || 0 })) || [])
    .sort((a, b) => b.value - a.value);
  const byProcedure = data?.by_procedure?.map(d => ({ label: PROC_SHORT[d.procedure_type] || d.procedure_type, value: d.total || 0 })) || [];
  const byMonth = (data?.by_month || []).map(d => ({ month: d.month, count: d.total || 0, total: d.total || 0, open: d.open || 0, awarded: d.awarded || 0 }));
  const topAuthorities = (data?.top_authorities || []).slice(0, 10).map(d => ({ authority: d.authority, count: d.total || 0, amount: d.total_amount || 0 }));

  /* Taux calculés */
  const openRate  = stats.total_tenders ? Math.round((stats.open_tenders / stats.total_tenders) * 100) : 0;
  const awardRate = stats.total_tenders ? Math.round((stats.awarded_tenders / stats.total_tenders) * 100) : 0;
  const cancelRate = stats.total_tenders ? Math.round((stats.cancelled_tenders / stats.total_tenders) * 100) : 0;

  const sectorColors = i => ['#1B3A6B', '#007A5E', '#CE1126', '#FCD116', '#6B4C9A', '#E07B39'][i % 6];
  const regionColors = i => `hsl(${210 + i * 25}, 55%, ${45 + (i % 3) * 8}%)`;
  const procColors = i => ['#1B3A6B', '#007A5E', '#CE1126', '#FCD116', '#6B4C9A', '#E07B39', '#2E86AB'][i % 7];

  const tabs = [
    { id: 'vue', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'geo', label: 'Géographie', icon: Map },
    { id: 'secteur', label: 'Secteurs', icon: HardHat },
    { id: 'evolution', label: 'Évolution', icon: TrendingUp },
    { id: 'acteurs', label: 'Acteurs', icon: Landmark },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @media print {
          nav, header, footer, .no-print { display: none !important; }
          body { background: #fff !important; }
          .animate-slideUp, .animate-fadeIn { animation: none !important; opacity: 1 !important; }
        }

        @media (max-width: 768px) {
          .transp-hero { padding: 40px 16px 32px !important; }
          .transp-container { padding: 24px 12px 48px !important; }
          .transp-grid2 { grid-template-columns: 1fr !important; }
          .transp-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .transp-amount-banner { flex-direction: column !important; }
          .transp-amount-divider { width: 100% !important; height: 1px !important; }
          .transp-hero-links { flex-direction: column !important; align-items: stretch !important; }
          .transp-hero-links a, .transp-hero-links button { text-align: center !important; justify-content: center !important; }
          .transp-tabs { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .transp-tabs button { flex-shrink: 0; }
        }
        @media (max-width: 420px) {
          .transp-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div style={s.hero} className="transp-hero">
        <div style={s.heroInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <CamFlag w={40} h={27} />
            <div style={s.heroBadge}>Données officielles ARMP</div>
          </div>
          <h1 style={s.heroTitle}>Tableau de Bord de Transparence</h1>
          <p style={s.heroSub}>
            Statistiques publiques des marchés publics camerounais — mise à jour automatique depuis <strong>armp.cm</strong>
          </p>
          <div style={s.heroLinks} className="transp-hero-links">
            <Link to="/marches" style={s.heroBtn}>Consulter les marchés <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></Link>
            <a href="https://armp.cm" target="_blank" rel="noreferrer" style={s.heroBtnOutline}>Site ARMP <ArrowUpRight size={14} style={{ verticalAlign: 'middle' }} /></a>
            {!loading && !error && data && (
              <>
                <button onClick={() => handleExportAll(stats, bySector, byRegion, byProcedure, byMonth, topAuthorities)} style={s.heroBtnExport}>
                  <Download size={14} /> Export CSV
                </button>
                <button onClick={() => window.print()} style={s.heroBtnExport}>
                  <Printer size={14} /> Export PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={s.container} className="transp-container">

        {/* ── KPIs ── */}
        {loading ? (
          <div className="transp-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 32 }}>
            {[...Array(5)].map((_, i) => <SkeletonBox key={i} h={110} />)}
          </div>
        ) : error ? (
          <div style={s.errorBox}>{error}</div>
        ) : (
          <div style={s.kpiGrid} className="transp-kpi-grid">
            <KpiCard icon={<ClipboardList size={20} />} value={stats.total_tenders} label="Total marchés" color="#1B3A6B" delay={0} />
            <KpiCard icon={<CircleDot size={20} />} value={stats.open_tenders} label="Marchés ouverts" sub={`Taux : ${openRate}%`} color="#007A5E" delay={0.05} />
            <KpiCard icon={<CheckCircle2 size={20} />} value={stats.awarded_tenders} label="Marchés attribués" sub={`Taux : ${awardRate}%`} color="#2E86AB" delay={0.1} />
            <KpiCard icon={<XCircle size={20} />} value={stats.cancelled_tenders} label="Annulés / Infructueux" sub={`Taux : ${cancelRate}%`} color="#CE1126" delay={0.15} />
            <KpiCard icon={<Landmark size={20} />} value={topAuthorities.length} label="Autorités contractantes" color="#6B4C9A" delay={0.2} />
          </div>
        )}

        {/* ── Montants ── */}
        {!loading && !error && stats && (
          <div style={s.amountBanner} className="animate-fadeIn transp-amount-banner">
            <div style={s.amountItem}>
              <span style={s.amountVal}>{fmtAmount(stats.total_amount_fcfa)}</span>
              <span style={s.amountLbl}>Volume total engagé</span>
            </div>
            <div style={s.amountDivider} className="transp-amount-divider" />
            <div style={s.amountItem}>
              <span style={s.amountVal}>{fmtAmount(stats.avg_amount_fcfa)}</span>
              <span style={s.amountLbl}>Montant moyen par marché</span>
            </div>
            <div style={s.amountDivider} className="transp-amount-divider" />
            <div style={s.amountItem}>
              <span style={s.amountVal}>{stats.open_tenders?.toLocaleString('fr-FR') || '—'}</span>
              <span style={s.amountLbl}>Marchés ouverts actuellement</span>
            </div>
          </div>
        )}

        {/* ── Onglets ── */}
        {!loading && !error && (
          <>
            <div style={s.tabs} className="transp-tabs">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <t.icon size={14} />
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            {/* ── VUE D'ENSEMBLE ── */}
            {activeTab === 'vue' && (
              <div className="animate-fadeIn">
                {/* Taux en une ligne */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Taux d\'ouverture', rate: openRate, color: '#007A5E' },
                    { label: 'Taux d\'attribution', rate: awardRate, color: '#2E86AB' },
                    { label: 'Taux d\'annulation', rate: cancelRate, color: '#CE1126' },
                  ].map(({ label, rate, color }) => (
                    <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(27,58,107,0.06)' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{rate}%</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 4, fontWeight: 600 }}>{label}</div>
                      <div style={{ height: 4, background: '#eef1f8', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={s.grid2} className="transp-grid2">
                  <Section title="Répartition par statut" icon={<BarChart3 size={18} />}>
                    <PieChart data={[
                      { label: 'Ouverts', value: stats?.open_tenders || 0 },
                      { label: 'Attribués', value: stats?.awarded_tenders || 0 },
                      { label: 'Clôturés', value: (stats?.total_tenders || 0) - (stats?.open_tenders || 0) - (stats?.awarded_tenders || 0) - (stats?.cancelled_tenders || 0) },
                      { label: 'Annulés', value: stats?.cancelled_tenders || 0 },
                    ].filter(d => d.value > 0)} />
                  </Section>
                  <Section title="Répartition par secteur" icon={<HardHat size={18} />}>
                    <PieChart data={bySector} />
                  </Section>
                  <Section title="Top 5 régions" icon={<Map size={18} />}>
                    <BarChart data={byRegion.slice(0, 5)} colorFn={regionColors} />
                  </Section>
                  <Section title="Types de procédures" icon={<FileText size={18} />}>
                    <BarChart data={byProcedure} colorFn={procColors} />
                  </Section>
                </div>
              </div>
            )}

            {/* ── GÉOGRAPHIE ── */}
            {activeTab === 'geo' && (
              <div className="animate-fadeIn">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button onClick={() => exportCSV('repartition_regions.csv',
                    ['Région', 'Nb marchés', 'Montant total FCFA'],
                    byRegion.map(d => [d.label, d.value, d.amount || 0])
                  )} style={s.exportBtn}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <Section title="Marchés par région" icon={<Map size={18} />} badge={`${byRegion.length} régions`}>
                  <BarChart data={byRegion} colorFn={regionColors} />
                </Section>
                <div style={{ height: 24 }} />
                <Section title="Carte de chaleur régionale" icon={<Globe size={18} />}>
                  <RegionHeatmap data={byRegion} total={data?.total_tenders} />
                </Section>
              </div>
            )}

            {/* ── SECTEURS ── */}
            {activeTab === 'secteur' && (
              <div className="animate-fadeIn">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button onClick={() => exportCSV('repartition_secteurs.csv',
                    ['Secteur', 'Nb marchés', 'Montant total FCFA'],
                    bySector.map(d => [d.label, d.value, d.amount || 0])
                  )} style={s.exportBtn}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <div style={s.grid2} className="transp-grid2">
                  <Section title="Volume par secteur" icon={<HardHat size={18} />}>
                    <BarChart data={bySector} colorFn={sectorColors} />
                  </Section>
                  <Section title="Part de marché par secteur" icon={<PieChartIcon size={18} />}>
                    <PieChart data={bySector} size={180} />
                  </Section>
                </div>
                <div style={{ height: 24 }} />
                <Section title="Types de procédures utilisées" icon={<FileText size={18} />} badge={`${byProcedure.length} types`}>
                  <BarChart data={byProcedure} colorFn={procColors} />
                </Section>
              </div>
            )}

            {/* ── ÉVOLUTION ── */}
            {activeTab === 'evolution' && (
              <div className="animate-fadeIn">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button onClick={() => exportCSV('evolution_mensuelle.csv',
                    ['Mois', 'Total', 'Ouverts', 'Attribués'],
                    byMonth.map(d => [d.month, d.total || d.count, d.open || 0, d.awarded || 0])
                  )} style={s.exportBtn}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <Section title="Évolution mensuelle par statut" icon={<TrendingUp size={18} />} badge={`${byMonth.length} mois`}>
                  <StackedBarChart data={byMonth} />
                </Section>
                <div style={{ height: 20 }} />
                <Section title="Courbe de publication" icon={<TrendingDown size={18} />}>
                  <LineChart data={byMonth} color="#1B3A6B" />
                </Section>
                {byMonth.length > 0 && (
                  <div style={{ height: 20 }} />
                )}
                {byMonth.length > 0 && (
                  <Section title="Détail mensuel" icon={<ClipboardList size={18} />}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={s.table}>
                        <thead>
                          <tr style={s.thead}>
                            <th style={s.th}>Mois</th>
                            <th style={s.th}>Total</th>
                            <th style={s.th}>Ouverts</th>
                            <th style={s.th}>Attribués</th>
                            <th style={s.th}>Taux attribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {byMonth.map((d, i) => {
                            const total = d.total || d.count || 0;
                            const rate = total ? Math.round(((d.awarded || 0) / total) * 100) : 0;
                            return (
                              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={s.td}><strong>{d.month}</strong></td>
                                <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: '#1B3A6B' }}>{total.toLocaleString('fr-FR')}</td>
                                <td style={{ ...s.td, textAlign: 'center', color: '#007A5E', fontWeight: 600 }}>{(d.open || 0).toLocaleString('fr-FR')}</td>
                                <td style={{ ...s.td, textAlign: 'center', color: '#2E86AB', fontWeight: 600 }}>{(d.awarded || 0).toLocaleString('fr-FR')}</td>
                                <td style={{ ...s.td, textAlign: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                    <div style={{ width: 60, height: 6, background: '#eef1f8', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${rate}%`, height: '100%', background: '#2E86AB', borderRadius: 3 }} />
                                    </div>
                                    <span style={{ fontSize: 11, color: '#555' }}>{rate}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                )}
              </div>
            )}

            {/* ── ACTEURS ── */}
            {activeTab === 'acteurs' && (
              <div className="animate-fadeIn">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
                  <button onClick={() => exportCSV('autorites_contractantes.csv',
                    ['Rang', 'Autorité', 'Nb marchés', 'Montant total FCFA'],
                    topAuthorities.map((a, i) => [i + 1, a.authority, a.count, a.amount || 0])
                  )} style={s.exportBtn}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <Section title="Top 10 autorités contractantes" icon={<Landmark size={18} />} badge="par volume de marchés">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topAuthorities.map((a, i) => {
                      const barColor = `hsl(${210 + i * 18}, 55%, 45%)`;
                      const pct = topAuthorities[0]?.count ? (a.count / topAuthorities[0].count) * 100 : 0;
                      return (
                        <div key={i} style={s.authorityRow}>
                          <div style={{ ...s.authorityRank, background: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#1B3A6B', color: i < 3 ? '#333' : '#fff' }}>
                            {i + 1}
                          </div>
                          <div style={s.authorityInfo}>
                            <div style={s.authorityName} title={a.authority}>{a.authority}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={s.authorityBar}>
                                <div style={{ ...s.authorityFill, width: `${pct}%`, background: barColor }} />
                              </div>
                              {a.amount > 0 && (
                                <span style={{ fontSize: 10, color: '#888', flexShrink: 0 }}>{fmtAmount(a.amount)}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={s.authorityCount}>{a.count.toLocaleString('fr-FR')}</div>
                            <div style={{ fontSize: 9, color: '#999' }}>marchés</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
                <div style={{ height: 20 }} />
                <Section title="Répartition des autorités par secteur" icon={<BarChart3 size={18} />}>
                  <BarChart data={bySector.map(d => ({ label: d.label, value: d.value }))} colorFn={sectorColors} />
                </Section>
              </div>
            )}
          </>
        )}

        {/* ── Footer info ── */}
        <div style={s.infoBox}>
          <span style={{ fontSize: 18 }}><Info size={18} /></span>
          <div>
            <strong>Source des données</strong> : Ces statistiques sont extraites automatiquement depuis le portail officiel{' '}
            <a href="https://armp.cm" target="_blank" rel="noreferrer" style={{ color: '#1B3A6B' }}>armp.cm</a>{' '}
            (Autorité de Régulation des Marchés Publics du Cameroun). Mise à jour toutes les heures.
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Carte chaleur des régions ── */
function RegionHeatmap({ data, total }) {
  const map = Object.fromEntries(data.map(d => [d.label, d.value]));
  const maxV = Math.max(...data.map(d => d.value), 1);
  const regions = [
    { name: 'Adamaoua', x: 220, y: 120 },
    { name: 'Centre', x: 200, y: 220 },
    { name: 'Est', x: 310, y: 200 },
    { name: 'Extrême-Nord', x: 220, y: 30 },
    { name: 'Littoral', x: 130, y: 230 },
    { name: 'Nord', x: 200, y: 80 },
    { name: 'Nord-Ouest', x: 100, y: 150 },
    { name: 'Ouest', x: 130, y: 190 },
    { name: 'Sud', x: 190, y: 310 },
    { name: 'Sud-Ouest', x: 90, y: 250 },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox="0 0 420 380" style={{ width: '100%', maxWidth: 500 }}>
        {regions.map((r, i) => {
          const v = map[r.name] || 0;
          const intensity = v / maxV;
          const fill = `rgba(27, 58, 107, ${0.1 + intensity * 0.85})`;
          const pct = total ? Math.round((v / total) * 100) : 0;
          return (
            <g key={i}>
              <circle cx={r.x} cy={r.y} r={18 + intensity * 22} fill={fill} stroke="#fff" strokeWidth={2}>
                <title>{r.name} : {v} marchés ({pct}%)</title>
              </circle>
              <text x={r.x} y={r.y - 2} textAnchor="middle" fontSize={9} fontWeight="600" fill="#fff">{r.name.split('-')[0]}</text>
              <text x={r.x} y={r.y + 10} textAnchor="middle" fontSize={9} fill="#ffffffcc">{v}</text>
            </g>
          );
        })}
        {/* Légende */}
        <rect x={10} y={340} width={80} height={12} rx={4}
          fill="url(#grad)" />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%">
            <stop offset="0%" stopColor="rgba(27,58,107,0.1)" />
            <stop offset="100%" stopColor="rgba(27,58,107,0.95)" />
          </linearGradient>
        </defs>
        <text x={10} y={368} fontSize={8} fill="#888">Peu actif</text>
        <text x={90} y={368} textAnchor="end" fontSize={8} fill="#888">Très actif</text>
      </svg>
    </div>
  );
}

/* ── Labels ── */
const SECTOR_LABELS = {
  travaux: 'Travaux', fournitures: 'Fournitures', services: 'Services',
  informatique: 'Informatique', assurance: 'Assurance',
};
const PROC_SHORT = {
  "Appel d'Offres National Ouvert": "AO National Ouvert",
  "Appel d'Offres International": "AO International",
  "Appel d'Offres Restreint": "AO Restreint",
  "Demande de Cotation": "Demande Cotation",
  "Appel à Manifestation d'Intérêt": "AMI",
  "Demande de Proposition": "DP",
  "Additif / Rectificatif": "Additif",
  "Décision d'Infructuosité": "Infructuosité",
};

/* ── Styles ── */
const s = {
  page: { minHeight: '100vh', background: '#f0f2f5' },
  hero: {
    background: 'linear-gradient(135deg, #1B3A6B 0%, #0d2247 60%, #0a1a38 100%)',
    padding: '56px 24px 48px',
    position: 'relative', overflow: 'hidden',
  },
  heroInner: { maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 20, padding: '4px 14px', fontSize: 11, color: '#FCD116', fontWeight: 600,
  },
  heroTitle: { fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, color: '#fff', margin: '12px 0 10px', lineHeight: 1.2 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, maxWidth: 600, lineHeight: 1.6 },
  heroLinks: { display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  heroBtn: {
    background: '#CE1126', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block', transition: 'opacity .2s',
  },
  heroBtnOutline: {
    background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)',
    borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block',
  },
  heroBtnExport: {
    background: 'rgba(255,255,255,0.12)', color: '#FCD116', border: '1.5px solid rgba(252,209,22,0.5)',
    borderRadius: 8, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 16px 64px' },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16, marginBottom: 24,
  },
  kpiCard: {
    background: '#fff', borderRadius: 14, padding: '20px 16px',
    boxShadow: '0 2px 10px rgba(27,58,107,0.07)', textAlign: 'center',
  },
  kpiIcon: { width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 10px' },
  kpiVal: { fontSize: 28, fontWeight: 800, color: '#1B3A6B', lineHeight: 1 },
  kpiLabel: { fontSize: 11, color: '#666', marginTop: 6, fontWeight: 600 },
  kpiSub: { fontSize: 10, color: '#999', marginTop: 3 },
  amountBanner: {
    background: 'linear-gradient(135deg, #1B3A6B, #2a5298)',
    borderRadius: 14, padding: '20px 24px', marginBottom: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    flexWrap: 'wrap', gap: 16,
  },
  amountItem: { textAlign: 'center' },
  amountVal: { display: 'block', fontSize: 22, fontWeight: 800, color: '#FCD116' },
  amountLbl: { display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  amountDivider: { width: 1, height: 40, background: 'rgba(255,255,255,0.2)' },
  tabs: { display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
  tab: {
    padding: '9px 18px', borderRadius: 10, border: '1.5px solid #dde3f0',
    background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    color: '#555', transition: 'all .2s',
  },
  tabActive: { background: '#1B3A6B', color: '#fff', borderColor: '#1B3A6B' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 },
  section: {
    background: '#fff', borderRadius: 14, padding: '22px 20px',
    boxShadow: '0 2px 10px rgba(27,58,107,0.06)', marginBottom: 4,
  },
  sectionHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#1B3A6B', flex: 1 },
  badge: {
    background: '#eef1f8', color: '#1B3A6B', borderRadius: 20,
    padding: '3px 10px', fontSize: 10, fontWeight: 700,
  },
  authorityRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', background: '#fafbfe', borderRadius: 10,
    border: '1px solid #eef1f8',
  },
  authorityRank: {
    width: 28, height: 28, borderRadius: 8, background: '#1B3A6B',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800, flexShrink: 0,
  },
  authorityInfo: { flex: 1, minWidth: 0 },
  authorityName: { fontSize: 12, fontWeight: 600, color: '#1B3A6B', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  authorityBar: { height: 6, background: '#eef1f8', borderRadius: 4, overflow: 'hidden' },
  authorityFill: { height: '100%', borderRadius: 4, transition: 'width 0.8s ease' },
  authorityCount: { fontSize: 14, fontWeight: 800, color: '#1B3A6B', flexShrink: 0 },
  infoBox: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    background: '#eef5ff', border: '1px solid #c5d8f5',
    borderRadius: 12, padding: '16px 20px', marginTop: 32,
    fontSize: 12, color: '#444', lineHeight: 1.6,
  },
  errorBox: {
    background: '#fff0f0', border: '1px solid #fcc', borderRadius: 12,
    padding: '20px', color: '#CE1126', textAlign: 'center', marginBottom: 24,
  },
  exportBtn: {
    background: '#fff', border: '1.5px solid #007A5E', color: '#007A5E',
    borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all .15s',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thead: { background: '#f0f4fb' },
  th: { padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#1B3A6B', fontSize: 11, borderBottom: '2px solid #dde3f0' },
  td: { padding: '9px 14px', borderBottom: '1px solid #f0f4fb', color: '#333', fontSize: 12 },
};
