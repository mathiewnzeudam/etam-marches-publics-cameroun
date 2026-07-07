import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const armoiriesCameroun = '/assets/armoiries-cameroun.svg';

function CamFlag({ width = 36, height = 24 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 24" style={{ borderRadius: 2, flexShrink: 0 }}>
      <rect width="12" height="24" fill="#007A5E" />
      <rect x="12" width="12" height="24" fill="#CE1126" />
      <rect x="24" width="12" height="24" fill="#FCD116" />
      <polygon
        points="18,8 19.1,11.4 22.7,11.4 19.8,13.5 20.9,16.9 18,14.8 15.1,16.9 16.2,13.5 13.3,11.4 16.9,11.4"
        fill="#FCD116"
      />
    </svg>
  );
}

function CoatOfArms({ size = 44 }) {
  return (
    <img src={armoiriesCameroun} alt="Armoiries de la République du Cameroun" width={size} height={size}
      style={{ flexShrink: 0, objectFit: 'contain' }} />
  );
}

const COL_LINKS = [
  {
    title: 'Plateforme',
    links: [
      { label: 'Marchés Publics', to: '/marches' },
      { label: 'Assistant IA', to: '/chat' },
      { label: 'Mon Espace', to: '/dashboard' },
      { label: 'Créer un compte', to: '/inscription' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Code des marchés publics', to: '/a-propos' },
      { label: 'À propos du projet', to: '/a-propos' },
      { label: 'Mentions légales', to: '/mentions-legales' },
      { label: 'Politique de confidentialité', to: '/a-propos' },
    ],
  },
  {
    title: 'Liens officiels',
    links: [
      { label: 'ARMP Cameroun', href: 'https://armp.cm' },
      { label: 'Présidence de la République', href: 'https://prc.cm' },
      { label: 'Ministère des Finances', href: '#' },
      { label: 'COLEPS', href: '#' },
    ],
  },
];

const SOCIALS = [
  { bg: '#3b5998', icon: 'f', title: 'Facebook' },
  { bg: '#0077b5', icon: 'in', title: 'LinkedIn' },
  { bg: '#1da1f2', icon: '𝕏', title: 'Twitter/X' },
  { bg: '#c4302b', icon: '▶', title: 'YouTube' },
];

export default function Footer() {
  return (
    <footer style={s.footer}>
      <style>{`
        .footer-link {
          display: block;
          font-size: 12px;
          color: #8892a4;
          text-decoration: none;
          margin-bottom: 8px;
          transition: color .2s, padding-left .2s;
        }
        .footer-link:hover { color: #FCD116; padding-left: 5px; }
        .social-btn {
          width: 32px; height: 32px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform .2s, opacity .2s;
          text-decoration: none;
        }
        .social-btn:hover { transform: translateY(-3px); opacity: .85; }
        .signal-btn {
          display: block;
          background: #fff;
          color: #CE1126;
          text-align: center;
          border-radius: 6px;
          padding: 9px 0;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: background .2s, transform .15s;
          margin-top: 12px;
        }
        .signal-btn:hover { background: #FCD116; transform: translateY(-1px); }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
            padding: 28px 20px 22px !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            align-items: flex-start !important;
            text-align: left !important;
            padding: 14px 20px !important;
          }
        }
      `}</style>

      {/* Bande tricolore décorative */}
      <div style={{ display: 'flex', height: 4 }}>
        <div style={{ flex: 1, background: '#007A5E' }} />
        <div style={{ flex: 1, background: '#CE1126' }} />
        <div style={{ flex: 1, background: '#FCD116' }} />
      </div>

      <div style={s.inner} className="footer-grid">
        {/* Col Brand */}
        <div style={s.brandCol}>
          <div style={s.brandRow}>
            <CoatOfArms size={48} />
            <div>
              <div style={s.brandName}>
                <span style={{ color: '#007A5E' }}>E</span>
                <span style={{ color: '#CE1126' }}>-</span>
                <span style={{ color: '#fff' }}>TAM</span>
              </div>
              <div style={s.brandSub}>Plateforme des Marchés Publics<br />du Cameroun</div>
            </div>
          </div>
          <p style={s.brandDesc}>
            Transparence · Équité · Performance<br />
            Une initiative de l'ARMP sous l'égide du<br />
            Gouvernement de la République du Cameroun.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {SOCIALS.map(sc => (
              <span key={sc.title} title={`${sc.title} — bientôt disponible`} className="social-btn"
                style={{ background: sc.bg, opacity: 0.5, cursor: 'default' }}>
                {sc.icon}
              </span>
            ))}
          </div>
        </div>

        {/* Colonnes de liens */}
        {COL_LINKS.map(col => (
          <div key={col.title}>
            <h4 style={s.colTitle}>{col.title}</h4>
            {col.links.map(l => (
              l.href && l.href !== '#'
                ? <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="footer-link">{l.label}</a>
                : <Link key={l.label} to={l.to || '/marches'} className="footer-link">{l.label}</Link>
            ))}
          </div>
        ))}

        {/* Col Signalement */}
        <div>
          <div style={s.signalBox}>
            <div style={s.signalIcon}><AlertTriangle size={22} /></div>
            <h4 style={s.signalTitle}>Signalez une irrégularité</h4>
            <p style={s.signalDesc}>
              Contribuez à la transparence des marchés publics en signalant toute pratique irrégulière.
            </p>
            <Link to="/reclamations" className="signal-btn">Faire un signalement</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={s.bottom} className="footer-bottom">
        <div style={s.bottomLeft}>
          <CamFlag width={22} height={15} />
          <span style={s.bottomTxt}>République du Cameroun — Paix · Travail · Patrie</span>
        </div>
        <span style={s.bottomTxt}>
          © 2026 E-TAM ·{' '}
          <Link to="/a-propos" style={{ color: '#6b7280', textDecoration: 'none' }}>À propos</Link>
          {' · '}
          <Link to="/mentions-legales" style={{ color: '#6b7280', textDecoration: 'none' }}>Mentions légales</Link>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={s.armpBadge}>ARMP <CheckCircle2 size={10} style={{ marginLeft: 2, verticalAlign: '-2px' }} /></div>
          <span style={s.bottomTxt}>Plateforme certifiée</span>
        </div>
      </div>
    </footer>
  );
}

const s = {
  footer: { background: '#111827', paddingBottom: 0 },
  inner: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.4fr',
    gap: 32,
    padding: '36px 32px 28px',
    maxWidth: 1300,
    margin: '0 auto',
  },
  brandCol: {},
  brandRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  brandName: { fontSize: 22, fontWeight: 900, letterSpacing: 1 },
  brandSub: { fontSize: 10, color: '#8892a4', lineHeight: 1.5, marginTop: 2 },
  brandDesc: { fontSize: 11, color: '#6b7280', lineHeight: 1.7, margin: 0 },
  colTitle: {
    fontSize: 11, fontWeight: 700, color: '#e5e7eb',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 14, paddingBottom: 8,
    borderBottom: '1px solid #1f2937',
  },
  signalBox: {
    background: 'linear-gradient(135deg, #7f1d1d, #CE1126)',
    borderRadius: 10,
    padding: '18px 16px',
  },
  signalIcon: { fontSize: 22, marginBottom: 8 },
  signalTitle: { color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 8 },
  signalDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 1.6, margin: 0 },
  bottom: {
    borderTop: '1px solid #1f2937',
    padding: '14px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    maxWidth: 1300,
    margin: '0 auto',
  },
  bottomLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  bottomTxt: { fontSize: 11, color: '#4b5563' },
  armpBadge: {
    background: '#1B3A6B', color: '#fff',
    fontSize: 9, fontWeight: 700,
    padding: '3px 8px', borderRadius: 4,
    letterSpacing: 0.5,
  },
};
