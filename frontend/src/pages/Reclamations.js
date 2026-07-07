import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reclamationService } from '../services/api';
import {
  Ban, ClipboardList, Scale, Trophy, Coins, Clock, NotebookPen, CheckCircle2,
  Mail, Search, Landmark, Lock, ArrowRight, ArrowLeft, Upload, Phone, Bot,
  Globe, Smartphone,
} from 'lucide-react';

/* ── Drapeau ── */
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

/* ── Types de réclamations ── */
const TYPES = [
  { id: 'exclusion', icon: Ban, label: 'Exclusion injustifiée', desc: 'Rejet de candidature sans motif valable (Art. 50 Décret 2018/366)' },
  { id: 'specification', icon: ClipboardList, label: 'Spécifications discriminatoires', desc: "Cahier des charges orienté vers un soumissionnaire particulier" },
  { id: 'evaluation', icon: Scale, label: 'Évaluation irrégulière', desc: "Notation non conforme aux critères annoncés dans le DAO" },
  { id: 'attribution', icon: Trophy, label: 'Attribution irrégulière', desc: "Marché attribué à un soumissionnaire non conforme ou moins disant" },
  { id: 'corruption', icon: Coins, label: 'Corruption / Favoritisme', desc: "Soupçon de paiement ou avantage illicite dans le processus" },
  { id: 'delai', icon: Clock, label: 'Délais non respectés', desc: "Délais de publication, d'évaluation ou de notification non conformes" },
  { id: 'autre', icon: NotebookPen, label: 'Autre irrégularité', desc: "Toute autre violation du Code des Marchés Publics" },
];

const REGIONS = ['Adamaoua','Centre','Est','Extrême-Nord','Littoral','Nord','Nord-Ouest','Ouest','Sud','Sud-Ouest'];

/* ── Étape indicator ── */
function Steps({ current }) {
  const steps = ['Type', 'Détails', 'Preuves', 'Confirmation'];
  return (
    <div style={s.steps} className="recl-steps">
      {steps.map((st, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ ...s.stepCircle, ...(i < current ? s.stepDone : i === current ? s.stepActive : s.stepPending) }}>
              {i < current ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === current ? '#1B3A6B' : '#999', fontWeight: i === current ? 700 : 400 }}>{st}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ ...s.stepLine, background: i < current ? '#007A5E' : '#dde3f0', marginBottom: 18 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════ */
export default function Reclamations() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    type: '',
    reference_marche: '',
    autorite: '',
    region: '',
    description: '',
    prejudice: '',
    articles_violes: '',
    recours_precedent: false,
    nom_reclamant: user?.full_name || '',
    email_reclamant: user?.email || '',
    telephone: user?.phone || '',
    organisation: user?.organization || '',
    anonyme: false,
    accepte_cgu: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.accepte_cgu) { setError('Vous devez accepter les conditions d\'utilisation.'); return; }
    if (!form.description || form.description.trim().length < 30) {
      setError('La description doit contenir au moins 30 caractères.'); return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        type:             form.type,
        description:      form.description,
        marche_reference: form.reference_marche || null,
        autorite_name:    form.autorite || null,
        region:           form.region || null,
        plaignant_nom:    form.anonyme ? null : (form.nom_reclamant || null),
        plaignant_email:  form.anonyme ? null : (form.email_reclamant || null),
        plaignant_phone:  form.anonyme ? null : (form.telephone || null),
        plaignant_region: form.region || null,
        is_anonyme:       !!form.anonyme,
        preuves:          [],
      };
      const res = await reclamationService.submit(payload);
      const data = res.data;
      setSubmitted({
        ref:  data.reference,
        type: TYPES.find(t => t.id === form.type)?.label,
        date: new Date(data.created_at).toLocaleDateString('fr-FR'),
      });
    } catch (e) {
      const msg = e?.response?.data?.detail;
      setError(msg || 'Erreur lors de l\'envoi. Réessayez ou contactez directement l\'ARMP.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Succès ── */
  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.successCard} className="animate-scaleIn">
            <div style={s.successIcon}><CheckCircle2 size={56} color="#007A5E" /></div>
            <h2 style={{ color: '#007A5E', fontSize: 22, marginBottom: 8 }}>Réclamation enregistrée</h2>
            <p style={{ color: '#555', marginBottom: 20 }}>Votre réclamation a été transmise à l'ARMP pour traitement.</p>
            <div style={s.refBox}>
              <span style={{ fontSize: 11, color: '#888' }}>Numéro de référence</span>
              <strong style={{ fontSize: 20, color: '#1B3A6B', letterSpacing: 1 }}>{submitted.ref}</strong>
              <span style={{ fontSize: 11, color: '#888' }}>Conservez ce numéro pour le suivi</span>
            </div>
            <div style={s.nextSteps}>
              <h4 style={{ color: '#1B3A6B', marginBottom: 12 }}>Prochaines étapes</h4>
              {[
                { icon: Mail, text: 'Accusé de réception par email sous 48h' },
                { icon: Search, text: 'Instruction de votre dossier par l\'ARMP (5 jours ouvrables — Art. 74)' },
                { icon: Scale, text: 'Décision notifiée à toutes les parties' },
                { icon: Landmark, text: 'Recours devant la chambre administrative si insatisfait' },
              ].map((ns, i) => (
                <div key={i} style={s.nextStep}><span><ns.icon size={14} /></span><span>{ns.text}</span></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { setSubmitted(null); setStep(0); setForm(f => ({ ...f, type: '', reference_marche: '', description: '' })); }}
                style={s.btnSecondary}>Nouvelle réclamation</button>
              <Link to="/marches" style={s.btnPrimary}>Retour aux marchés</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <style>{`
        @media (max-width: 768px) {
          .recl-hero { padding: 32px 16px 28px !important; }
          .recl-container { padding: 20px 12px 48px !important; }
          .recl-layout { flex-direction: column !important; }
          .recl-sidebar { width: 100% !important; }
          .recl-steps { flex-wrap: nowrap !important; overflow-x: auto !important; }
          .recl-steps > div:first-child span { display: none; }
          .recl-type-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .recl-row2 { grid-template-columns: 1fr !important; }
          .recl-btn-row { flex-direction: column-reverse !important; }
          .recl-btn-row button, .recl-btn-row a { width: 100% !important; text-align: center; }
        }
        @media (max-width: 420px) {
          .recl-type-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* ── Hero ── */}
      <div style={s.hero} className="recl-hero">
        <div style={s.heroInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <CamFlag w={36} h={24} />
            <span style={s.heroBadge}>Article 74 — Décret n°2018/366</span>
          </div>
          <h1 style={s.heroTitle}>Réclamations & Signalements</h1>
          <p style={s.heroSub}>
            Exercez votre droit de recours auprès de l'ARMP. Toute irrégularité dans la passation
            des marchés publics peut être signalée et examinée dans un délai de <strong style={{ color: '#FCD116' }}>5 jours ouvrables</strong>.
          </p>
        </div>
      </div>

      <div style={s.container} className="recl-container">
        <div style={s.layout} className="recl-layout">

          {/* ── Formulaire principal ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Steps current={step} />

            {error && <div style={s.errorBox}>{error}</div>}

            {/* ÉTAPE 0 — Type de réclamation */}
            {step === 0 && (
              <div className="animate-fadeIn">
                <h3 style={s.stepTitle}>Quel type d'irrégularité souhaitez-vous signaler ?</h3>
                <div style={s.typeGrid} className="recl-type-grid">
                  {TYPES.map(t => (
                    <button key={t.id} onClick={() => set('type', t.id)}
                      style={{ ...s.typeCard, ...(form.type === t.id ? s.typeCardActive : {}) }}>
                      <span style={{ fontSize: 28, marginBottom: 8 }}><t.icon size={28} /></span>
                      <strong style={{ fontSize: 12, color: form.type === t.id ? '#1B3A6B' : '#333' }}>{t.label}</strong>
                      <span style={{ fontSize: 10, color: '#777', lineHeight: 1.4, textAlign: 'center' }}>{t.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => form.type && setStep(1)} disabled={!form.type}
                  style={{ ...s.btnPrimary, opacity: form.type ? 1 : 0.4, marginTop: 16 }}>
                  Continuer <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                </button>
              </div>
            )}

            {/* ÉTAPE 1 — Détails du marché */}
            {step === 1 && (
              <div className="animate-fadeIn">
                <h3 style={s.stepTitle}>Détails de l'irrégularité</h3>
                <div style={s.form}>
                  <div style={s.row2} className="recl-row2">
                    <div style={s.field}>
                      <label style={s.label}>Référence du marché <span style={{ color: '#CE1126' }}>*</span></label>
                      <input style={s.input} placeholder="Ex: AO/123/MINTP/2026"
                        value={form.reference_marche} onChange={e => set('reference_marche', e.target.value)} />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>Autorité contractante <span style={{ color: '#CE1126' }}>*</span></label>
                      <input style={s.input} placeholder="Ex: Mairie de Yaoundé"
                        value={form.autorite} onChange={e => set('autorite', e.target.value)} />
                    </div>
                  </div>
                  <div style={s.row2} className="recl-row2">
                    <div style={s.field}>
                      <label style={s.label}>Région</label>
                      <select style={s.input} value={form.region} onChange={e => set('region', e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>Articles du Code violés</label>
                      <input style={s.input} placeholder="Ex: Art. 50, Art. 74"
                        value={form.articles_violes} onChange={e => set('articles_violes', e.target.value)} />
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Description détaillée de l'irrégularité <span style={{ color: '#CE1126' }}>*</span></label>
                    <textarea style={{ ...s.input, height: 130, resize: 'vertical' }}
                      placeholder="Décrivez précisément les faits, dates, et personnes impliquées..."
                      value={form.description} onChange={e => set('description', e.target.value)} />
                    <span style={s.hint}>{form.description.length}/2000 caractères</span>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Préjudice subi</label>
                    <textarea style={{ ...s.input, height: 80, resize: 'vertical' }}
                      placeholder="Décrivez le préjudice financier ou commercial subi..."
                      value={form.prejudice} onChange={e => set('prejudice', e.target.value)} />
                  </div>
                  <div style={s.checkRow}>
                    <input type="checkbox" id="recours" checked={form.recours_precedent}
                      onChange={e => set('recours_precedent', e.target.checked)} />
                    <label htmlFor="recours" style={{ fontSize: 12, color: '#555', cursor: 'pointer' }}>
                      J'ai déjà soumis un recours auprès de l'autorité contractante sans réponse satisfaisante
                    </label>
                  </div>
                </div>
                <div style={s.btnRow} className="recl-btn-row">
                  <button onClick={() => setStep(0)} style={s.btnSecondary}><ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Retour</button>
                  <button onClick={() => form.reference_marche && form.autorite && form.description.length >= 30 && setStep(2)}
                    disabled={!form.reference_marche || !form.autorite || form.description.length < 30}
                    style={{ ...s.btnPrimary, opacity: (form.reference_marche && form.autorite && form.description.length >= 30) ? 1 : 0.4 }}>
                    Continuer <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 — Identité */}
            {step === 2 && (
              <div className="animate-fadeIn">
                <h3 style={s.stepTitle}>Vos coordonnées</h3>
                <div style={s.anonymeToggle}>
                  <input type="checkbox" id="anonyme" checked={form.anonyme}
                    onChange={e => set('anonyme', e.target.checked)} />
                  <label htmlFor="anonyme" style={{ fontSize: 12, color: '#555', cursor: 'pointer', lineHeight: 1.5 }}>
                    <strong>Signalement anonyme</strong> — Votre identité ne sera pas divulguée à l'autorité contractante
                    (l'ARMP pourra vous contacter de façon confidentielle)
                  </label>
                </div>
                {!form.anonyme && (
                  <div style={s.form}>
                    <div style={s.row2} className="recl-row2">
                      <div style={s.field}>
                        <label style={s.label}>Nom complet <span style={{ color: '#CE1126' }}>*</span></label>
                        <input style={s.input} placeholder="Nom et prénom"
                          value={form.nom_reclamant} onChange={e => set('nom_reclamant', e.target.value)} />
                      </div>
                      <div style={s.field}>
                        <label style={s.label}>Email <span style={{ color: '#CE1126' }}>*</span></label>
                        <input style={s.input} type="email" placeholder="votre@email.com"
                          value={form.email_reclamant} onChange={e => set('email_reclamant', e.target.value)} />
                      </div>
                    </div>
                    <div style={s.row2} className="recl-row2">
                      <div style={s.field}>
                        <label style={s.label}>Téléphone</label>
                        <input style={s.input} placeholder="+237 6XX XXX XXX"
                          value={form.telephone} onChange={e => set('telephone', e.target.value)} />
                      </div>
                      <div style={s.field}>
                        <label style={s.label}>Organisation / Entreprise</label>
                        <input style={s.input} placeholder="Nom de votre entreprise"
                          value={form.organisation} onChange={e => set('organisation', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
                <div style={s.infoBox}>
                  <span><Lock size={14} /></span>
                  <span>Vos données sont traitées conformément à la loi n°2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité au Cameroun.</span>
                </div>
                <div style={s.btnRow} className="recl-btn-row">
                  <button onClick={() => setStep(1)} style={s.btnSecondary}><ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Retour</button>
                  <button onClick={() => (form.anonyme || (form.nom_reclamant && form.email_reclamant)) && setStep(3)}
                    disabled={!form.anonyme && (!form.nom_reclamant || !form.email_reclamant)}
                    style={{ ...s.btnPrimary, opacity: (form.anonyme || (form.nom_reclamant && form.email_reclamant)) ? 1 : 0.4 }}>
                    Continuer <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 — Confirmation */}
            {step === 3 && (
              <div className="animate-fadeIn">
                <h3 style={s.stepTitle}>Récapitulatif de votre réclamation</h3>
                <div style={s.recapCard}>
                  <RecapRow label="Type" value={TYPES.find(t => t.id === form.type)?.label} />
                  <RecapRow label="Référence marché" value={form.reference_marche} />
                  <RecapRow label="Autorité contractante" value={form.autorite} />
                  {form.region && <RecapRow label="Région" value={form.region} />}
                  {form.articles_violes && <RecapRow label="Articles violés" value={form.articles_violes} />}
                  <RecapRow label="Description" value={form.description.slice(0, 150) + (form.description.length > 150 ? '...' : '')} />
                  {form.prejudice && <RecapRow label="Préjudice" value={form.prejudice.slice(0, 100)} />}
                  <RecapRow label="Identité" value={form.anonyme ? 'Anonyme (confidentiel)' : `${form.nom_reclamant} — ${form.email_reclamant}`} />
                </div>
                <div style={s.checkRow}>
                  <input type="checkbox" id="cgu" checked={form.accepte_cgu}
                    onChange={e => set('accepte_cgu', e.target.checked)} />
                  <label htmlFor="cgu" style={{ fontSize: 11, color: '#555', cursor: 'pointer', lineHeight: 1.5 }}>
                    Je certifie que les informations fournies sont exactes et je reconnais que toute fausse déclaration
                    est passible de poursuites. J'accepte que mon dossier soit transmis à l'ARMP pour instruction
                    conformément à l'<strong>Article 74 du Décret n°2018/366</strong>.
                  </label>
                </div>
                {error && <div style={s.errorBox}>{error}</div>}
                <div style={s.btnRow} className="recl-btn-row">
                  <button onClick={() => setStep(2)} style={s.btnSecondary}><ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Retour</button>
                  <button onClick={handleSubmit} disabled={loading || !form.accepte_cgu}
                    style={{ ...s.btnDanger, opacity: (!loading && form.accepte_cgu) ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    {loading ? <><Clock size={14} /> Envoi en cours...</> : <><Upload size={14} /> Soumettre la réclamation</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar info ── */}
          <div style={s.sidebar} className="recl-sidebar">
            <div style={s.sideCard}>
              <h4 style={s.sideTitle}><Scale size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Base légale</h4>
              <div style={s.legalItem}>
                <strong>Article 74</strong>
                <span>Décret n°2018/366 — Droit de recours devant l'ARMP dans un délai de 5 jours ouvrables suivant la décision contestée</span>
              </div>
              <div style={s.legalItem}>
                <strong>Article 50</strong>
                <span>Conditions de participation et critères de sélection — non discrimination</span>
              </div>
              <div style={s.legalItem}>
                <strong>Article 55</strong>
                <span>Évaluation des offres — conformité aux critères du DAO</span>
              </div>
            </div>

            <div style={s.sideCard}>
              <h4 style={s.sideTitle}><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Contacts ARMP</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: Globe, label: 'Site officiel', val: 'armp.cm' },
                  { icon: Mail, label: 'Email', val: 'contact@armp.cm' },
                  { icon: Smartphone, label: 'Téléphone', val: '+237 222 22 55 87' },
                  { icon: Landmark, label: 'Adresse', val: 'Yaoundé, Cameroun' },
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14 }}><c.icon size={14} /></span>
                    <div>
                      <div style={{ fontSize: 10, color: '#888' }}>{c.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1B3A6B' }}>{c.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.sideCard}>
              <h4 style={s.sideTitle}><ClipboardList size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Procédure de recours</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { n: '1', t: 'Recours interne', d: "D'abord auprès de l'Autorité Contractante" },
                  { n: '2', t: 'Recours ARMP', d: 'Si insatisfait, saisir l\'ARMP (ce formulaire)' },
                  { n: '3', t: 'Instruction', d: 'Décision sous 5 jours ouvrables (Art. 74)' },
                  { n: '4', t: 'Recours judiciaire', d: 'Chambre administrative du tribunal compétent' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1B3A6B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{step.n}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A6B' }}>{step.t}</div>
                      <div style={{ fontSize: 10, color: '#666', lineHeight: 1.4 }}>{step.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.sideCard}>
              <h4 style={s.sideTitle}><Bot size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Besoin d'aide ?</h4>
              <p style={{ fontSize: 11, color: '#666', lineHeight: 1.5, marginBottom: 12 }}>
                Notre assistant IA peut vous aider à rédiger votre recours et identifier les articles applicables.
              </p>
              <Link to="/chat" style={{ ...s.btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Consulter l'assistant IA
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecapRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
      <span style={{ fontSize: 11, color: '#888', width: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#333', fontWeight: 600, flex: 1 }}>{value}</span>
    </div>
  );
}

/* ── Styles ── */
const s = {
  page: { minHeight: '100vh', background: '#f0f2f5' },
  hero: {
    background: 'linear-gradient(135deg, #CE1126 0%, #8b0b19 60%, #5c0610 100%)',
    padding: '48px 24px 40px',
  },
  heroInner: { maxWidth: 900, margin: '0 auto' },
  heroBadge: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 20, padding: '4px 14px', fontSize: 11, color: '#FCD116', fontWeight: 600,
  },
  heroTitle: { fontSize: 'clamp(20px,4vw,32px)', fontWeight: 800, color: '#fff', margin: '12px 0 8px' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, maxWidth: 580, lineHeight: 1.6 },
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 16px 64px' },
  layout: { display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' },
  steps: { display: 'flex', alignItems: 'center', marginBottom: 32, gap: 0 },
  stepCircle: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  stepDone: { background: '#007A5E', color: '#fff' },
  stepActive: { background: '#1B3A6B', color: '#fff', boxShadow: '0 0 0 4px rgba(27,58,107,0.2)' },
  stepPending: { background: '#eef1f8', color: '#aaa', border: '2px solid #dde3f0' },
  stepLine: { flex: 1, height: 2, minWidth: 20 },
  stepTitle: { fontSize: 16, fontWeight: 700, color: '#1B3A6B', marginBottom: 20 },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 },
  typeCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '18px 12px', borderRadius: 12, border: '2px solid #dde3f0',
    background: '#fff', cursor: 'pointer', transition: 'all .2s', textAlign: 'center',
  },
  typeCardActive: { border: '2px solid #1B3A6B', background: '#f0f4ff', boxShadow: '0 4px 16px rgba(27,58,107,0.15)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    border: '1.5px solid #dde3f0', borderRadius: 8, padding: '10px 12px',
    fontSize: 13, color: '#333', background: '#fff', outline: 'none',
    transition: 'border-color .2s', width: '100%',
  },
  hint: { fontSize: 10, color: '#aaa', textAlign: 'right' },
  checkRow: { display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0', padding: '14px', background: '#fafbfe', borderRadius: 10, border: '1px solid #eef1f8' },
  anonymeToggle: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 20 },
  infoBox: { display: 'flex', gap: 10, background: '#eef5ff', border: '1px solid #c5d8f5', borderRadius: 10, padding: '12px 14px', fontSize: 11, color: '#555', marginTop: 16, lineHeight: 1.5 },
  recapCard: { background: '#fafbfe', borderRadius: 12, padding: '16px 20px', border: '1.5px solid #eef1f8', marginBottom: 20 },
  btnRow: { display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  btnPrimary: { background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'opacity .2s' },
  btnSecondary: { background: '#f0f2f5', color: '#555', border: '1.5px solid #dde3f0', borderRadius: 8, padding: '11px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { background: '#CE1126', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'opacity .2s' },
  errorBox: { background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, padding: '12px 16px', color: '#CE1126', fontSize: 12, marginBottom: 16 },
  sidebar: { width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 },
  sideCard: { background: '#fff', borderRadius: 14, padding: '18px 16px', boxShadow: '0 2px 10px rgba(27,58,107,0.06)' },
  sideTitle: { fontSize: 13, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 },
  legalItem: { display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 0', borderBottom: '1px solid #f0f2f5', fontSize: 11 },
  successCard: { background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 560, margin: '40px auto', textAlign: 'center', boxShadow: '0 8px 32px rgba(27,58,107,0.1)' },
  successIcon: { fontSize: 56, marginBottom: 16 },
  refBox: { background: '#f0f4ff', borderRadius: 12, padding: '20px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' },
  nextSteps: { background: '#f8fffe', border: '1px solid #c3e6dc', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' },
  nextStep: { display: 'flex', gap: 10, fontSize: 12, color: '#444', padding: '6px 0', lineHeight: 1.4 },
};
