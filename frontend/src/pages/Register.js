import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import {
  User, Building2, Landmark, Eye, EyeOff, CheckCircle2, AlertTriangle,
  ArrowRight, ArrowLeft, Mail, Tag, MapPin, FolderOpen, Smartphone,
  PartyPopper, Circle,
} from 'lucide-react';

const REGIONS = ['Centre', 'Littoral', 'Ouest', 'Nord', 'Sud', 'Est', 'Adamaoua', 'Extrême-Nord', 'Nord-Ouest', 'Sud-Ouest'];
const SECTORS = ['Travaux', 'Fournitures', 'Services', 'Informatique', 'Assurance'];
const ROLES = [
  { val: 'citizen',    label: 'Citoyen / Journaliste', icon: User, desc: 'Suivi des marchés publics et transparence' },
  { val: 'enterprise', label: 'Entreprise / PME',      icon: Building2, desc: 'Réponse aux appels d\'offres et documents' },
  { val: 'authority',  label: 'Autorité contractante', icon: Landmark, desc: 'Gestion et publication des marchés' },
];

/* ── Drapeau ── */
function CamFlag() {
  return (
    <svg width="28" height="19" viewBox="0 0 36 24" style={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <rect width="12" height="24" fill="#007A5E" />
      <rect x="12" width="12" height="24" fill="#CE1126" />
      <rect x="24" width="12" height="24" fill="#FCD116" />
      <polygon points="18,8 19.1,11.4 22.7,11.4 19.8,13.5 20.9,16.9 18,14.8 15.1,16.9 16.2,13.5 13.3,11.4 16.9,11.4" fill="#FCD116" />
    </svg>
  );
}

/* ── Barre de progression ── */
function StepBar({ step }) {
  const steps = ['Identité', 'Profil', 'Confirmation'];
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 15, left: '10%', right: '10%', height: 2, background: '#eef1f8', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 15, left: '10%', height: 2, background: '#1B3A6B', zIndex: 0, width: `${((step - 1) / 2) * 80}%`, transition: 'width .4s ease' }} />
        {steps.map((lbl, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i + 1 <= step ? '#1B3A6B' : '#eef1f8',
              color: i + 1 <= step ? '#fff' : '#aaa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800,
              border: i + 1 === step ? '3px solid #FCD116' : '3px solid transparent',
              transition: 'all .3s',
            }}>
              {i + 1 < step ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i + 1 <= step ? '#1B3A6B' : '#aaa', fontWeight: i + 1 === step ? 700 : 500 }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Champ input ── */
function Field({ label, name, type = 'text', value, onChange, placeholder, required, error, hint }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={s.label}>{label}{required && <span style={{ color: '#CE1126' }}> *</span>}</label>
      <div style={{ position: 'relative' }}>
        <input
          name={name} type={isPassword ? (show ? 'text' : 'password') : type}
          value={value} onChange={onChange} placeholder={placeholder} required={required}
          style={{ ...s.input, borderColor: error ? '#CE1126' : '#dde3f0' }}
          className="auth-input"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 11, color: '#CE1126', margin: '3px 0 0' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>{hint}</p>}
    </div>
  );
}

/* ── Force du mot de passe ── */
function PasswordStrength({ password }) {
  const checks = [
    { ok: password.length >= 8, label: '8 caractères min' },
    { ok: /[A-Z]/.test(password), label: 'Majuscule' },
    { ok: /[0-9]/.test(password), label: 'Chiffre' },
    { ok: /[^a-zA-Z0-9]/.test(password), label: 'Caractère spécial' },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#CE1126', '#E07B39', '#FCD116', '#007A5E'];
  const labels = ['Faible', 'Moyen', 'Bien', 'Fort'];
  return (
    <div style={{ marginTop: -8, marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? colors[score - 1] : '#eee', transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {checks.map(({ ok, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: ok ? '#007A5E' : '#bbb', fontWeight: ok ? 700 : 400 }}>
            {ok ? <CheckCircle2 size={11} /> : <Circle size={11} />} {label}
          </span>
        ))}
        {score > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: colors[score - 1] }}>{labels[score - 1]}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE INSCRIPTION
═══════════════════════════════════════ */
export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm: '',
    role: 'enterprise', organization: '', phone: '', region: '', sectors: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const toggleSector = sec => {
    setForm(f => ({
      ...f,
      sectors: f.sectors.includes(sec) ? f.sectors.filter(s => s !== sec) : [...f.sectors, sec],
    }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2) e.full_name = 'Nom requis (2 caractères minimum)';
    if (!form.email.includes('@')) e.email = 'Email invalide';
    if (form.password.length < 8) e.password = 'Mot de passe trop court (8 caractères minimum)';
    if (form.password !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(s => s + 1);
  };

  const submit = async e => {
    e.preventDefault();
    setGlobalError('');
    setLoading(true);
    try {
      await authService.register({
        full_name:    form.full_name,
        email:        form.email,
        password:     form.password,
        role:         form.role,
        organization: form.organization || undefined,
        phone:        form.phone || undefined,
        region:       form.region || undefined,
        sectors:      form.sectors.map(s => s.toLowerCase()),
      });
      await login(form.email, form.password);
      navigate('/dashboard', { state: { message: `Bienvenue, ${form.full_name.split(' ')[0]} ! Votre compte a été créé.` } });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setGlobalError(typeof detail === 'string' ? detail : 'Erreur lors de la création du compte. Cet email est peut-être déjà utilisé.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-input { transition: border-color .2s, box-shadow .2s; }
        .auth-input:focus { border-color: #1B3A6B !important; box-shadow: 0 0 0 3px rgba(27,58,107,0.12); outline: none; }
        .auth-btn { transition: all .2s; }
        .auth-btn:hover:not(:disabled) { background: #152e55 !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(27,58,107,0.25); }
        .auth-btn:disabled { opacity: .65; cursor: not-allowed; }
        .role-card { transition: all .2s; cursor: pointer; }
        .role-card:hover { border-color: #1B3A6B !important; }
        .sec-pill { transition: all .15s; cursor: pointer; }
        .sec-pill:hover { border-color: #1B3A6B !important; }

        @media (max-width: 768px) {
          .register-left-panel { display: none !important; }
          .register-right-panel { flex: 1 1 100% !important; padding: 24px 16px !important; }
          .register-card { padding: 26px 18px !important; max-width: 100% !important; }
          .summary-label { width: 70px !important; }
        }
        @media (max-width: 380px) {
          .register-card { padding: 20px 14px !important; }
          .summary-row { flex-wrap: wrap !important; }
          .summary-label { width: 100% !important; }
        }
      `}</style>

      {/* Panneau gauche */}
      <div className="register-left-panel" style={s.leftPanel}>
        <div style={s.leftContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <CamFlag />
            <span style={{ color: '#FCD116', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Marché-IA Cameroun</span>
          </div>
          <h1 style={s.leftTitle}>Rejoignez la plateforme nationale</h1>
          <p style={s.leftSub}>Inscription gratuite · Accès immédiat · Données ARMP en temps réel</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 40 }}>
            {[
              { step: 1, title: 'Créez votre identité', desc: 'Nom, email et mot de passe sécurisé' },
              { step: 2, title: 'Définissez votre profil', desc: 'Rôle, secteurs d\'activité et région' },
              { step: 3, title: 'Accédez à tout', desc: 'Marchés, IA, documents et alertes de veille' },
            ].map(({ step: n, title, desc }) => (
              <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: n <= step ? '#FCD116' : 'rgba(255,255,255,0.12)',
                  color: n <= step ? '#1B3A6B' : 'rgba(255,255,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 2,
                }}>
                  {n <= step ? (n < step ? <CheckCircle2 size={16} /> : n) : n}
                </div>
                <div>
                  <div style={{ color: n <= step ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13 }}>{title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="register-right-panel" style={s.rightPanel}>
        <div className="register-card" style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 style={s.title}>Créer un compte</h2>
          </div>
          <p style={s.sub}>Étape {step} sur 3</p>

          <StepBar step={step} />

          {globalError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff0f0', color: '#CE1126', border: '1px solid #fcc', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
              <AlertTriangle size={16} /><span>{globalError}</span>
            </div>
          )}

          <form onSubmit={submit}>

            {/* ── ÉTAPE 1 : IDENTITÉ ── */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn .3s ease' }}>
                <Field label="Nom complet" name="full_name" value={form.full_name} onChange={handle}
                  placeholder="Jean Dupont" required error={errors.full_name} />
                <Field label="Adresse email" name="email" type="email" value={form.email} onChange={handle}
                  placeholder="vous@exemple.cm" required error={errors.email} />
                <Field label="Mot de passe" name="password" type="password" value={form.password} onChange={handle}
                  placeholder="Minimum 8 caractères" required error={errors.password} />
                {form.password && <PasswordStrength password={form.password} />}
                <Field label="Confirmer le mot de passe" name="confirm" type="password" value={form.confirm} onChange={handle}
                  placeholder="Répétez votre mot de passe" required error={errors.confirm} />
                <button type="button" onClick={nextStep} style={{ ...s.btn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} className="auth-btn">
                  Continuer <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── ÉTAPE 2 : PROFIL ── */}
            {step === 2 && (
              <div style={{ animation: 'fadeIn .3s ease' }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={s.label}>Votre profil <span style={{ color: '#CE1126' }}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ROLES.map(r => (
                      <div key={r.val} className="role-card"
                        onClick={() => setForm(f => ({ ...f, role: r.val }))}
                        style={{
                          ...s.roleCard,
                          borderColor: form.role === r.val ? '#1B3A6B' : '#dde3f0',
                          background: form.role === r.val ? '#f0f4ff' : '#fff',
                        }}>
                        <span style={{ flexShrink: 0 }}><r.icon size={22} /></span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: form.role === r.val ? '#1B3A6B' : '#333' }}>{r.label}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{r.desc}</div>
                        </div>
                        <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', border: `2px solid ${form.role === r.val ? '#1B3A6B' : '#dde3f0'}`, background: form.role === r.val ? '#1B3A6B' : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {form.role === r.val && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(form.role === 'enterprise' || form.role === 'authority') && (
                  <Field label={form.role === 'enterprise' ? "Nom de l'entreprise" : "Nom de l'autorité"}
                    name="organization" value={form.organization} onChange={handle}
                    placeholder={form.role === 'enterprise' ? 'SARL MonEntreprise' : 'Ministère des Travaux Publics'} />
                )}

                <Field label="Téléphone (optionnel)" name="phone" value={form.phone} onChange={handle}
                  placeholder="+237 6XX XXX XXX" hint="Format : +237 6XX XXX XXX" />

                <div style={{ marginBottom: 18 }}>
                  <label style={s.label}>Région</label>
                  <select name="region" value={form.region} onChange={handle} style={{ ...s.input, appearance: 'auto' }} className="auth-input">
                    <option value="">Toutes les régions</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={s.label}>Secteurs d'intérêt (optionnel)</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {SECTORS.map(sec => (
                      <button type="button" key={sec} className="sec-pill"
                        onClick={() => toggleSector(sec)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                          borderColor: form.sectors.includes(sec) ? '#1B3A6B' : '#dde3f0',
                          background: form.sectors.includes(sec) ? '#1B3A6B' : '#fff',
                          color: form.sectors.includes(sec) ? '#fff' : '#555',
                          fontSize: 12, fontWeight: 600,
                        }}>
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep(1)}
                    style={{ ...s.btnSecondary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ArrowLeft size={16} />Retour
                  </button>
                  <button type="button" onClick={nextStep} style={{ ...s.btn, flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} className="auth-btn">
                    Continuer <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 3 : CONFIRMATION ── */}
            {step === 3 && (
              <div style={{ animation: 'fadeIn .3s ease' }}>
                <div style={s.summaryBox}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1B3A6B', marginBottom: 14 }}>Récapitulatif</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: User, label: 'Nom', val: form.full_name },
                      { icon: Mail, label: 'Email', val: form.email },
                      { icon: Tag, label: 'Profil', val: ROLES.find(r => r.val === form.role)?.label },
                      form.organization && { icon: Building2, label: 'Organisation', val: form.organization },
                      form.region && { icon: MapPin, label: 'Région', val: form.region },
                      form.sectors.length > 0 && { icon: FolderOpen, label: 'Secteurs', val: form.sectors.join(', ') },
                      form.phone && { icon: Smartphone, label: 'Téléphone', val: form.phone },
                    ].filter(Boolean).map(({ icon: Icon, label, val }) => (
                      <div key={label} className="summary-row" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0 }}><Icon size={15} /></span>
                        <span className="summary-label" style={{ fontSize: 12, color: '#888', width: 90, flexShrink: 0 }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#333', flex: 1, wordBreak: 'break-word' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setStep(1)}
                    style={{ marginTop: 12, background: 'none', border: 'none', fontSize: 11, color: '#1B3A6B', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    Modifier
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid #bbf7d0', fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} /><span>En créant ce compte, vous acceptez les{' '}
                  <a href="/mentions-legales" style={{ color: '#166534', fontWeight: 700 }}>Conditions d'utilisation</a>{' '}
                  et la politique de confidentialité de Marché-IA Cameroun.</span>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep(2)}
                    style={{ ...s.btnSecondary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ArrowLeft size={16} />Retour
                  </button>
                  <button type="submit" style={{ ...s.btn, flex: 2, background: '#007A5E' }} className="auth-btn" disabled={loading}>
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <span style={s.spinner} />Création…
                      </span>
                    ) : <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><PartyPopper size={16} />Créer mon compte</span>}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p style={s.footer}>
            Déjà un compte ?{' '}
            <Link to="/connexion" style={s.linkTxt}>Se connecter</Link>
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
    flex: '0 0 38%', background: 'linear-gradient(145deg, #1B3A6B 0%, #0d2247 60%, #091830 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px 36px', position: 'relative', overflow: 'hidden',
  },
  leftContent: { maxWidth: 320, position: 'relative', zIndex: 1, width: '100%' },
  leftTitle: { fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 12 },
  leftSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 },
  rightPanel: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '32px 24px', background: '#f7f9fc', overflowY: 'auto',
  },
  card: {
    width: '100%', maxWidth: 460, background: '#fff',
    borderRadius: 20, padding: '36px 32px',
    boxShadow: '0 8px 40px rgba(27,58,107,0.10)',
  },
  title: { fontSize: 24, fontWeight: 800, color: '#1B3A6B', marginBottom: 4 },
  sub: { fontSize: 13, color: '#888', marginBottom: 20 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', border: '1.5px solid #dde3f0', borderRadius: 10,
    padding: '11px 14px', fontSize: 14, boxSizing: 'border-box', background: '#fafbfe',
  },
  btn: {
    width: '100%', background: '#1B3A6B', color: '#fff', border: 'none',
    borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  btnSecondary: {
    background: '#fff', color: '#1B3A6B', border: '1.5px solid #dde3f0',
    borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14,
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
  roleCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 12, border: '2px solid',
    transition: 'all .2s',
  },
  summaryBox: {
    background: '#f8fafc', borderRadius: 12, padding: '16px 18px',
    marginBottom: 16, border: '1px solid #e8eef8',
  },
  footer: { textAlign: 'center', fontSize: 13, color: '#666', marginTop: 20 },
  linkTxt: { color: '#CE1126', fontWeight: 700, textDecoration: 'none' },
};
