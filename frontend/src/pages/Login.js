import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Search, Bot, FileText, Bell, Hand, CheckCircle2,
  AlertTriangle, Lock, User, Landmark,
} from 'lucide-react';

/* ── Drapeau camerounais SVG ── */
function CamFlag() {
  return (
    <svg width="32" height="21" viewBox="0 0 36 24" style={{ borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }}>
      <rect width="12" height="24" fill="#007A5E" />
      <rect x="12" width="12" height="24" fill="#CE1126" />
      <rect x="24" width="12" height="24" fill="#FCD116" />
      <polygon points="18,8 19.1,11.4 22.7,11.4 19.8,13.5 20.9,16.9 18,14.8 15.1,16.9 16.2,13.5 13.3,11.4 16.9,11.4" fill="#FCD116" />
    </svg>
  );
}

/* ── Champ input avec icône ── */
function Field({ label, name, type = 'text', value, onChange, placeholder, required, hint, error }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={s.label}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          name={name} type={inputType} value={value} onChange={onChange}
          placeholder={placeholder} required={required}
          style={{ ...s.input, borderColor: error ? '#CE1126' : '#dde3f0' }}
          className="auth-input"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4, display: 'flex', alignItems: 'center' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 11, color: '#CE1126', margin: '4px 0 0' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE LOGIN
═══════════════════════════════════════ */
export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const handle = e => {
    setIsDemo(false);
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const fillDemo = (email, password) => {
    setIsDemo(true);
    setForm({ email, password });
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const base = typeof detail === 'string' ? detail : 'Email ou mot de passe incorrect. Vérifiez vos identifiants.';
      setError(isDemo ? `${base} (le compte démo n'a peut-être pas encore été créé sur cet environnement)` : base);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        .auth-input { transition: border-color .2s, box-shadow .2s; }
        .auth-input:focus { border-color: #1B3A6B !important; box-shadow: 0 0 0 3px rgba(27,58,107,0.12); outline: none; }
        .auth-btn { transition: all .2s; }
        .auth-btn:hover:not(:disabled) { background: #152e55 !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(27,58,107,0.3); }
        .auth-btn:disabled { opacity: .65; cursor: not-allowed; }
        .demo-btn { transition: all .15s; }
        .demo-btn:hover { background: #f0f4ff !important; border-color: #1B3A6B !important; }

        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { flex: 1 1 100% !important; padding: 24px 16px !important; }
          .login-card { padding: 28px 20px !important; max-width: 100% !important; }
          .login-mobile-logo { display: flex !important; }
        }
        @media (max-width: 380px) {
          .login-card { padding: 22px 14px !important; }
        }
      `}</style>

      {/* Panneau gauche décoratif */}
      <div className="login-left-panel" style={s.leftPanel}>
        <div style={s.leftContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <CamFlag />
            <span style={{ color: '#FCD116', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Marché-IA Cameroun</span>
          </div>
          <h1 style={s.leftTitle}>Plateforme IA des Marchés Publics</h1>
          <p style={s.leftSub}>
            Accédez à tous les appels d'offres ARMP, analysez avec l'intelligence artificielle, et générez vos documents en quelques clics.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
            {[
              { icon: Search, label: 'Recherche intelligente des marchés' },
              { icon: Bot, label: 'Analyse IA des cahiers des charges' },
              { icon: FileText, label: 'Génération automatique de documents' },
              { icon: Bell, label: 'Alertes de veille personnalisées' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={s.statsRow}>
            {[['2 400+', 'Marchés indexés'], ['10 régions', 'Couverture nationale'], ['Gratuit', 'Pour les citoyens']].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#FCD116' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="login-right-panel" style={s.rightPanel}>
        <div className="login-card" style={s.card}>
          {/* Logo mobile */}
          <div className="login-mobile-logo" style={s.mobileLogo}>
            <CamFlag />
            <span style={{ fontWeight: 800, color: '#1B3A6B', fontSize: 14 }}>Marché-IA Cameroun</span>
          </div>

          <h2 style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 8 }}>Bon retour <Hand size={22} /></h2>
          <p style={s.sub}>Connectez-vous à votre espace personnel</p>

          {location.state?.message && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#166534' }}>
              <CheckCircle2 size={16} /> {location.state.message}
            </div>
          )}

          {new URLSearchParams(location.search).get('session_expired') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
              <AlertTriangle size={16} /> Votre session a expiré. Veuillez vous reconnecter.
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <Field label="Adresse email" name="email" type="email" value={form.email}
              onChange={handle} placeholder="vous@exemple.cm" required />
            <Field label="Mot de passe" name="password" type="password" value={form.password}
              onChange={handle} placeholder="Votre mot de passe" required />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -10, marginBottom: 20 }}>
              <Link to="/connexion" style={{ fontSize: 12, color: '#1B3A6B', textDecoration: 'none', fontWeight: 600 }}>
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" style={s.btn} className="auth-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={s.spinner} />
                  Connexion en cours…
                </span>
              ) : <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><Lock size={16} />Se connecter</span>}
            </button>
          </form>

          <div style={s.divider}><span style={s.dividerText}>ou</span></div>

          {/* Accès démo */}
          <div style={s.demoBox}>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Accès démonstration</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="demo-btn"
                onClick={() => fillDemo('demo@armp.cm', 'demo1234')}
                style={{ ...s.demoBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <User size={14} />Citoyen
              </button>
              <button type="button" className="demo-btn"
                onClick={() => fillDemo('admin@armp.cm', 'admin1234')}
                style={{ ...s.demoBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Landmark size={14} />Entreprise
              </button>
            </div>
          </div>

          <p style={s.footer}>
            Pas encore de compte ?{' '}
            <Link to="/inscription" style={s.linkTxt}>Créer un compte gratuitement</Link>
          </p>

          <p style={{ fontSize: 10, color: '#bbb', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
            En vous connectant, vous acceptez nos{' '}
            <a href="/mentions-legales" style={{ color: '#888' }}>Conditions d'utilisation</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  leftPanel: {
    flex: '0 0 42%', background: 'linear-gradient(145deg, #1B3A6B 0%, #0d2247 60%, #091830 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px 40px', position: 'relative', overflow: 'hidden',
  },
  leftContent: { maxWidth: 360, position: 'relative', zIndex: 1, width: '100%' },
  leftTitle: { fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 14 },
  leftSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 },
  statsRow: {
    display: 'flex', justifyContent: 'space-between', marginTop: 44,
    paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.15)',
  },
  rightPanel: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '32px 24px', background: '#f7f9fc',
  },
  card: {
    width: '100%', maxWidth: 440, background: '#fff',
    borderRadius: 20, padding: '40px 36px',
    boxShadow: '0 8px 40px rgba(27,58,107,0.10)',
  },
  mobileLogo: {
    display: 'none',
    alignItems: 'center', gap: 10, marginBottom: 28,
  },
  title: { fontSize: 26, fontWeight: 800, color: '#1B3A6B', marginBottom: 6 },
  sub: { fontSize: 14, color: '#888', marginBottom: 28 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 },
  input: {
    width: '100%', border: '1.5px solid #dde3f0', borderRadius: 10,
    padding: '12px 14px', fontSize: 14, boxSizing: 'border-box',
    background: '#fafbfe',
  },
  btn: {
    width: '100%', background: '#1B3A6B', color: '#fff', border: 'none',
    borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14,
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#fff0f0', color: '#CE1126', border: '1px solid #fcc',
    borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0',
    borderTop: '1px solid #eee', position: 'relative',
  },
  dividerText: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    background: '#fff', padding: '0 10px', fontSize: 12, color: '#bbb',
    top: -10,
  },
  demoBox: {
    background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 20,
    border: '1px solid #e8eef8',
  },
  demoBtn: {
    flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #dde3f0',
    background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#1B3A6B',
  },
  footer: { textAlign: 'center', fontSize: 13, color: '#666', marginTop: 4 },
  linkTxt: { color: '#CE1126', fontWeight: 700, textDecoration: 'none' },
};
