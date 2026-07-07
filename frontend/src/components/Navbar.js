import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3, AlertTriangle, CheckCircle2, User, Lock } from 'lucide-react';

const armoiriesCameroun = '/assets/armoiries-cameroun.svg';

/* ── Drapeau camerounais officiel avec étoile dorée ── */
function CamFlag({ width = 36, height = 24 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 24" style={{ borderRadius: 2, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>
      <rect width="12" height="24" fill="#007A5E" />
      <rect x="12" width="12" height="24" fill="#CE1126" />
      <rect x="24" width="12" height="24" fill="#FCD116" />
      {/* Étoile dorée centrale à 5 branches */}
      <polygon
        points="18,8 19.1,11.4 22.7,11.4 19.8,13.5 20.9,16.9 18,14.8 15.1,16.9 16.2,13.5 13.3,11.4 16.9,11.4"
        fill="#FCD116"
      />
    </svg>
  );
}

/* ── Armoiries officielles de la République du Cameroun ── */
function CoatOfArms({ size = 34 }) {
  return (
    <img src={armoiriesCameroun} alt="Armoiries de la République du Cameroun" width={size} height={size}
      style={{ flexShrink: 0, objectFit: 'contain' }} />
  );
}

const NAV_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/marches', label: 'Marchés Publics' },
  { to: '/transparence', label: 'Transparence', icon: BarChart3 },
  { to: '/reclamations', label: 'Réclamations', icon: AlertTriangle },
  { to: '/chat', label: 'Assistant IA' },
  { to: '/documents', label: 'Documents IA' },
  { to: '/dashboard', label: 'Mon Espace' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ferme le menu mobile sur changement de route */
  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nav-link {
          position: relative;
          padding: 18px 13px;
          font-size: 13px;
          color: #2d3a5c;
          text-decoration: none;
          font-weight: 500;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          transition: color .2s;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0; left: 13px; right: 13px;
          height: 3px;
          background: #CE1126;
          border-radius: 2px 2px 0 0;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform .25s ease;
        }
        .nav-link:hover { color: #CE1126; }
        .nav-link:hover::after,
        .nav-link.active::after { transform: scaleX(1); }
        .nav-link.active { color: #CE1126; font-weight: 700; }

        .btn-login {
          background: #CE1126;
          color: #fff;
          border: none;
          padding: 9px 18px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background .2s, transform .15s, box-shadow .2s;
          box-shadow: 0 2px 8px rgba(206,17,38,0.25);
        }
        .btn-login:hover {
          background: #a50d1e;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(206,17,38,0.35);
        }
        .btn-espace {
          background: #1B3A6B;
          color: #fff;
          border: none;
          padding: 9px 18px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background .2s, transform .15s;
        }
        .btn-espace:hover { background: #0f2447; transform: translateY(-1px); }

        .topbar-link {
          color: #5a6478;
          font-size: 11px;
          text-decoration: none;
          transition: color .2s;
        }
        .topbar-link:hover { color: #CE1126; }

        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 6px;
          border: none;
          background: none;
        }
        .hamburger span {
          display: block; width: 24px; height: 2px;
          background: #2d3a5c;
          border-radius: 2px;
          transition: all .3s;
        }

        @media (max-width: 900px) {
          .nav-links-desktop { display: none !important; }
          .hamburger {
            display: flex !important;
            width: 40px; height: 40px;
            align-items: center; justify-content: center;
          }
          .mobile-menu {
            display: flex;
            flex-direction: column;
            background: #fff;
            border-top: 1px solid #eef;
            padding: 6px 0 20px;
            animation: slideDown .2s ease;
            max-height: calc(100vh - 64px);
            overflow-y: auto;
          }
          .mobile-menu .nav-link { padding: 14px 24px; border-bottom: 1px solid #f5f7fb; font-size: 14px; }
          .mobile-menu-auth {
            display: flex; flex-direction: column; gap: 10px;
            padding: 16px 24px 4px;
            margin-top: 6px;
            border-top: 1px solid #eef;
          }
          .mobile-menu-auth .btn-login,
          .mobile-menu-auth .btn-espace,
          .mobile-menu-auth .btn-outline {
            justify-content: center; width: 100%; padding: 12px 18px; font-size: 14px;
          }
        }
        @media (min-width: 901px) {
          .mobile-menu { display: none !important; }
        }
        .btn-outline {
          background: #fff;
          color: #1B3A6B;
          border: 1.5px solid #dde3f0;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: border-color .2s, background .2s;
        }
        .btn-outline:hover { border-color: #1B3A6B; background: #f8faff; }

        .desktop-auth { display: flex; align-items: center; gap: 10px; }
        @media (max-width: 640px) {
          .desktop-auth { display: none !important; }
          .navbar-brandSub { display: none !important; }
        }

        /* ── Topbar institutionnelle : simplifiée sur mobile ── */
        @media (max-width: 900px) {
          .topbar-center, .topbar-right { display: none !important; }
          .topbar { justify-content: center !important; padding: 7px 16px !important; }
        }
        @media (max-width: 420px) {
          .topbar-text-sub { display: none !important; }
        }
      `}</style>

      {/* ── Topbar institutionnelle ── */}
      <div style={s.topbar} className="topbar">
        <div style={s.tbLeft}>
          <CoatOfArms size={28} />
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A6B' }}>RÉPUBLIQUE DU CAMEROUN</div>
            <div className="topbar-text-sub" style={{ fontSize: 9.5, color: '#7a8499', letterSpacing: 0.3 }}>Paix – Travail – Patrie</div>
          </div>
          <div style={s.divider} className="topbar-text-sub" />
          <CamFlag width={32} height={21} />
        </div>

        <div style={s.tbCenter} className="topbar-center">
          <div style={s.armpBadge}><CheckCircle2 size={11} style={{ marginRight: 3, verticalAlign: '-2px' }} />ARMP</div>
          <span style={{ fontSize: 10.5, color: '#5a6478' }}>
            Plateforme agréée par l'Agence de Régulation des Marchés Publics
          </span>
        </div>

        <div style={s.tbRight} className="topbar-right">
          <a href="https://armp.cm" target="_blank" rel="noreferrer" className="topbar-link">armp.cm</a>
          <div style={s.divider} />
          <span style={{ fontSize: 11, color: '#5a6478', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CamFlag width={18} height={12} /> FR
          </span>
        </div>
      </div>

      {/* ── Navbar principale ── */}
      <nav style={{ ...s.navbar, boxShadow: scrolled ? '0 2px 16px rgba(27,58,107,0.10)' : '0 1px 0 #e8ecf5' }}>
        <Link to="/" style={s.brand}>
          <div style={s.brandIcon}>
            <CoatOfArms size={38} />
          </div>
          <div>
            <div style={s.brandName}>
              <span style={{ color: '#007A5E' }}>E</span>
              <span style={{ color: '#CE1126' }}>-</span>
              <span style={{ color: '#1B3A6B' }}>TAM</span>
            </div>
            <div className="navbar-brandSub" style={s.brandSub}>Plateforme des Marchés Publics</div>
          </div>
        </Link>

        <div className="nav-links-desktop" style={s.navLinks}>
          {NAV_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link${location.pathname === l.to ? ' active' : ''}`}
            >
              {l.icon && <l.icon size={14} style={{ marginRight: 4 }} />}{l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="desktop-auth">
            {user ? (
              <>
                <Link to="/dashboard" className="btn-espace">
                  <User size={14} /> {user.full_name?.split(' ')[0] || 'Mon espace'}
                </Link>
                <button className="btn-login" onClick={() => { logout(); navigate('/'); }}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/inscription" style={{ fontSize: 13, color: '#1B3A6B', fontWeight: 600, textDecoration: 'none' }}>
                  Créer un compte
                </Link>
                <Link to="/connexion" className="btn-login">
                  <Lock size={14} /> Se connecter
                </Link>
              </>
            )}
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span style={menuOpen ? { transform: 'rotate(45deg) translate(5px,5px)' } : {}} />
            <span style={menuOpen ? { opacity: 0 } : {}} />
            <span style={menuOpen ? { transform: 'rotate(-45deg) translate(5px,-5px)' } : {}} />
          </button>
        </div>
      </nav>

      {/* ── Menu mobile ── */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} className={`nav-link${location.pathname === l.to ? ' active' : ''}`}>
              {l.icon && <l.icon size={14} style={{ marginRight: 4 }} />}{l.label}
            </Link>
          ))}
          <div className="mobile-menu-auth">
            {user ? (
              <>
                <Link to="/dashboard" className="btn-espace">
                  <User size={14} /> {user.full_name?.split(' ')[0] || 'Mon espace'}
                </Link>
                <button className="btn-login" onClick={() => { logout(); navigate('/'); }}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/connexion" className="btn-login">
                  <Lock size={14} /> Se connecter
                </Link>
                <Link to="/inscription" className="btn-outline">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  topbar: {
    background: 'linear-gradient(135deg, #f8faff 0%, #eef2fb 100%)',
    borderBottom: '1px solid #dde3f0',
    padding: '6px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tbLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  tbCenter: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  tbRight: { display: 'flex', alignItems: 'center', gap: 10 },
  divider: { width: 1, height: 18, background: '#d0d8e8' },
  armpBadge: {
    background: '#1B3A6B', color: '#fff',
    fontSize: 10, fontWeight: 700,
    padding: '3px 9px', borderRadius: 4,
    letterSpacing: 0.5,
  },
  navbar: {
    background: '#fff',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    transition: 'box-shadow .3s',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', textDecoration: 'none' },
  brandIcon: { display: 'flex', alignItems: 'center' },
  brandName: { fontSize: 22, fontWeight: 900, letterSpacing: 1, lineHeight: 1 },
  brandSub: { fontSize: 9.5, color: '#8892a4', letterSpacing: 0.4, marginTop: 2 },
  navLinks: { display: 'flex', alignItems: 'center' },
};
