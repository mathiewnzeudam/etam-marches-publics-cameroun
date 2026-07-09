import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentService } from '../services/api';
import {
  Mail, Settings, Coins, FolderOpen, Scale, ScrollText,
  FileText, Sparkles, RefreshCw, Trash2, ArrowLeft, ArrowRight,
  CheckCircle2, Landmark, BookOpen, Lightbulb, Pencil, X,
  NotebookPen, Save, AlertTriangle, Download, Printer,
  CornerDownLeft, Zap, Clock, Info,
} from 'lucide-react';

/* ── Types de documents avec métadonnées ── */
const DOC_TYPES = [
  { type: 'submission_letter',  label: 'Lettre de soumission',    icon: Mail,       color: '#1B3A6B', desc: 'Lettre officielle de soumission d\'offre à l\'autorité contractante' },
  { type: 'technical_offer',    label: 'Offre technique',         icon: Settings,   color: '#007A5E', desc: 'Présentation de la méthodologie, du planning et des moyens techniques' },
  { type: 'financial_offer',    label: 'Offre financière',        icon: Coins,      color: '#F39C12', desc: 'Bordereau de prix, sous-détail et offre financière complète' },
  { type: 'qualification_file', label: 'Dossier de qualification',icon: FolderOpen, color: '#7c3aed', desc: 'Références, capacités techniques et financières de l\'entreprise' },
  { type: 'recourse',           label: 'Requête de recours ARMP', icon: Scale,      color: '#CE1126', desc: 'Recours administratif auprès de l\'ARMP contre une décision d\'attribution' },
  { type: 'contract_draft',     label: 'Projet de marché',        icon: ScrollText, color: '#0891b2', desc: 'Projet de contrat conforme au Code des marchés publics 2018' },
];

const STATUS_MAP = {
  draft:     { label: 'Brouillon',  color: '#F39C12', bg: '#fffbeb' },
  final:     { label: 'Finalisé',   color: '#007A5E', bg: '#f0fdf4' },
  archived:  { label: 'Archivé',    color: '#64748b', bg: '#f8fafc' },
};

/* ════════════════ PAGE DOCUMENTS ════════════════ */
export default function Documents() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState('list');      // 'list' | 'generate' | 'detail'
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    if (authLoading) return; // attendre la vérification du token avant de décider
    if (!user) { navigate('/connexion'); return; }
    /* Pré-remplissage depuis TenderDetail */
    if (location.state?.prefill) {
      setPrefill(location.state.prefill);
      setSelectedType(location.state.prefill.type);
      setView('generate');
      /* Nettoie le state pour éviter de re-déclencher au retour */
      window.history.replaceState({}, document.title);
    }
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const loadDocs = () => {
    setLoading(true);
    documentService.list().then(r => setDocs(r.data || [])).catch(() => setDocs([])).finally(() => setLoading(false));
  };

  const openDetail = async (doc) => {
    try {
      const r = await documentService.get(doc.id);
      setSelected(r.data);
      setView('detail');
    } catch {}
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try { await documentService.remove(id); setDocs(p => p.filter(d => d.id !== id)); } catch {}
  };

  if (authLoading || !user) return null;

  return (
    <div style={s.page} className="doc-page">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .doc-type-card { background: #fff; border: 2px solid #e8eef8; border-radius: 14px; padding: 22px; cursor: pointer; transition: all .2s; text-align: left; }
        .doc-type-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(27,58,107,0.12); }
        .doc-row { background: #fff; border: 1.5px solid #e8eef8; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: all .18s; cursor: pointer; }
        .doc-row:hover { border-color: #1B3A6B; box-shadow: 0 3px 12px rgba(27,58,107,0.08); }
        .tab-btn { padding: 9px 20px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #64748b; border-bottom: 3px solid transparent; transition: all .2s; }
        .tab-btn.active { color: #1B3A6B; border-bottom-color: #CE1126; }
        .form-input:focus { border-color: #1B3A6B !important; box-shadow: 0 0 0 3px rgba(27,58,107,0.09); outline: none; }
        .content-area { white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: #334155; font-family: 'Georgia', serif; }

        @media (max-width: 768px) {
          .doc-page { padding: 18px 14px !important; }
          .doc-types-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .doc-two-col { grid-template-columns: 1fr !important; }
          .doc-detail-grid { grid-template-columns: 1fr !important; }
          .doc-form-row2, .doc-form-row3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .doc-types-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={s.container}>

        {/* ═══ VUE LISTE ═══ */}
        {view === 'list' && (
          <div style={{ animation: 'fadeIn .25s ease' }}>
            {/* Header */}
            <div style={s.pageHeader}>
              <div>
                <h1 style={s.pageTitle}><FileText size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Documents IA</h1>
                <p style={s.pageSub}>Générez des documents juridiques conformes au Code des marchés publics camerounais</p>
              </div>
              <button style={s.primaryBtn} onClick={() => setView('generate')}>
                <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Nouveau document
              </button>
            </div>

            {/* Types de documents */}
            <h2 style={s.sectionTitle}>Types de documents disponibles</h2>
            <div style={s.typesGrid} className="doc-types-grid">
              {DOC_TYPES.map(dt => (
                <button key={dt.type} className="doc-type-card"
                  style={{ borderTopColor: dt.color }}
                  onClick={() => { setSelectedType(dt.type); setView('generate'); }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}><dt.icon size={28} /></div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: dt.color, marginBottom: 6 }}>{dt.label}</h3>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{dt.desc}</p>
                </button>
              ))}
            </div>

            {/* Mes documents */}
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Mes documents ({docs.length})</h2>
              {docs.length > 0 && <button style={s.secondaryBtn} onClick={loadDocs}><RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Actualiser</button>}
            </div>

            {loading ? (
              <div style={s.skeletonWrap}>
                {[1,2,3].map(i => <div key={i} style={s.skeletonRow} className="skeleton" />)}
              </div>
            ) : docs.length === 0 ? (
              <div style={s.empty}>
                <div style={{ marginBottom: 14 }}><FileText size={44} /></div>
                <h3 style={s.emptyTitle}>Aucun document généré</h3>
                <p style={s.emptyDesc}>Cliquez sur un type ci-dessus pour générer votre premier document avec l'IA.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {docs.map(doc => {
                  const dt = DOC_TYPES.find(t => t.type === doc.type);
                  const st = STATUS_MAP[doc.status] || STATUS_MAP.draft;
                  return (
                    <div key={doc.id} className="doc-row" onClick={() => openDetail(doc)}>
                      <div style={{ width: 40, height: 40, background: (dt?.color || '#1B3A6B') + '14', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {dt ? <dt.icon size={20} /> : <FileText size={20} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1B3A6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                          {dt?.label} · v{doc.version} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>{st.label}</span>
                      <button style={s.deleteBtn} title="Supprimer"
                        onClick={e => { e.stopPropagation(); remove(doc.id); }}><Trash2 size={16} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ VUE GÉNÉRATION ═══ */}
        {view === 'generate' && (
          <GenerateForm
            selectedType={selectedType}
            prefill={prefill}
            onBack={() => { setView('list'); setSelectedType(null); setPrefill(null); }}
            onGenerated={(doc) => { setDocs(p => [doc, ...p]); setSelected(doc); setView('detail'); }}
          />
        )}

        {/* ═══ VUE DÉTAIL ═══ */}
        {view === 'detail' && selected && (
          <DocumentDetail
            doc={selected}
            onBack={() => setView('list')}
            onUpdate={(updated) => { setSelected(updated); setDocs(p => p.map(d => d.id === updated.id ? updated : d)); }}
          />
        )}
      </div>
    </div>
  );
}

/* ════════════ FORMULAIRE DE GÉNÉRATION ════════════ */
function GenerateForm({ selectedType, prefill, onBack, onGenerated }) {
  const [type, setType] = useState(selectedType || DOC_TYPES[0].type);
  const [form, setForm] = useState({
    company_name: '', company_ninea: '', company_address: '',
    representative: '', contact_email: '', contact_phone: '',
    tender_reference: prefill?.tender_reference || '',
    tender_title:     prefill?.tender_title     || '',
    proposed_amount: '', execution_duration: '', validity_duration: '90 jours',
    recourse_grounds: '', recourse_stage: 'attribution',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const dt = DOC_TYPES.find(t => t.type === type);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.representative) { setError('Nom de l\'entreprise et représentant sont requis.'); return; }
    setGenerating(true); setError('');
    try {
      const payload = {
        type,
        company_name: form.company_name,
        company_ninea: form.company_ninea || undefined,
        company_address: form.company_address || undefined,
        representative: form.representative,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
        tender_reference: form.tender_reference || undefined,
        tender_title: form.tender_title || undefined,
        proposed_amount: form.proposed_amount ? Number(form.proposed_amount) : undefined,
        execution_duration: form.execution_duration || undefined,
        validity_duration: form.validity_duration || undefined,
        recourse_grounds: form.recourse_grounds || undefined,
        recourse_stage: form.recourse_stage || undefined,
      };
      const r = await documentService.generate(payload);
      onGenerated(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la génération. Réessayez.');
    } finally {
      setGenerating(false);
    }
  };

  const needsRecourse = type === 'recourse';
  const needsAmount   = ['financial_offer', 'submission_letter', 'contract_draft'].includes(type);

  return (
    <div style={{ animation: 'fadeIn .25s ease' }}>
      <div style={s.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={s.backBtn} onClick={onBack}><ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Retour</button>
          <div>
            <h1 style={s.pageTitle}>{dt && <dt.icon size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />} Générer : {dt?.label}</h1>
            <p style={s.pageSub}>{dt?.desc}</p>
          </div>
        </div>
      </div>

      <div style={s.twoCol} className="doc-two-col">
        {/* Formulaire */}
        <div style={s.panel}>
          {prefill && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, display: 'flex' }}><CheckCircle2 size={16} /></span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 3 }}>
                  Pré-rempli depuis un marché ARMP
                </div>
                <div style={{ fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
                  <strong>{prefill.tender_reference}</strong> — {prefill.tender_title?.slice(0, 70)}{prefill.tender_title?.length > 70 ? '…' : ''}
                  {prefill.tender_authority && <><br /><Landmark size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {prefill.tender_authority}</>}
                </div>
              </div>
            </div>
          )}
          {error && <div style={s.formError}>{error}</div>}
          <form onSubmit={submit}>

            {/* Choix du type */}
            <div style={s.formGroup}>
              <label style={s.formLabel}>Type de document</label>
              <select value={type} onChange={e => setType(e.target.value)} style={s.formInput} className="form-input">
                {DOC_TYPES.map(dt2 => <option key={dt2.type} value={dt2.type}>{dt2.label}</option>)}
              </select>
            </div>

            <div style={s.divider} />
            <div style={s.subsectionLabel}>Informations du marché</div>

            <div style={s.formRow2} className="doc-form-row2">
              <div style={s.formGroup}>
                <label style={s.formLabel}>Référence du marché</label>
                <input className="form-input" value={form.tender_reference} onChange={e => set('tender_reference', e.target.value)} placeholder="AO/XXXXX/2026" style={s.formInput} />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Intitulé du marché</label>
                <input className="form-input" value={form.tender_title} onChange={e => set('tender_title', e.target.value)} placeholder="Titre de l'appel d'offres" style={s.formInput} />
              </div>
            </div>

            <div style={s.divider} />
            <div style={s.subsectionLabel}>Informations de l'entreprise <span style={{ color: '#CE1126' }}>*</span></div>

            <div style={s.formRow2} className="doc-form-row2">
              <div style={s.formGroup}>
                <label style={s.formLabel}>Nom de l'entreprise *</label>
                <input className="form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="SARL Mon Entreprise" style={s.formInput} required />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>NINEA</label>
                <input className="form-input" value={form.company_ninea} onChange={e => set('company_ninea', e.target.value)} placeholder="M12345678900" style={s.formInput} />
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Adresse</label>
              <input className="form-input" value={form.company_address} onChange={e => set('company_address', e.target.value)} placeholder="BP 1234, Yaoundé, Cameroun" style={s.formInput} />
            </div>

            <div style={s.formRow2} className="doc-form-row2">
              <div style={s.formGroup}>
                <label style={s.formLabel}>Représentant légal *</label>
                <input className="form-input" value={form.representative} onChange={e => set('representative', e.target.value)} placeholder="M. Jean Dupont, DG" style={s.formInput} required />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Email de contact</label>
                <input className="form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="contact@entreprise.cm" style={s.formInput} />
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Téléphone</label>
              <input className="form-input" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+237 6XX XXX XXX" style={s.formInput} />
            </div>

            {(needsAmount || needsRecourse) && <div style={s.divider} />}

            {needsAmount && (
              <>
                <div style={s.subsectionLabel}>Détails financiers</div>
                <div style={s.formRow3} className="doc-form-row3">
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Montant proposé (FCFA)</label>
                    <input className="form-input" type="number" value={form.proposed_amount} onChange={e => set('proposed_amount', e.target.value)} placeholder="50000000" style={s.formInput} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Durée d'exécution</label>
                    <input className="form-input" value={form.execution_duration} onChange={e => set('execution_duration', e.target.value)} placeholder="6 mois" style={s.formInput} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Validité de l'offre</label>
                    <input className="form-input" value={form.validity_duration} onChange={e => set('validity_duration', e.target.value)} placeholder="90 jours" style={s.formInput} />
                  </div>
                </div>
              </>
            )}

            {needsRecourse && (
              <>
                <div style={s.subsectionLabel}>Motifs du recours</div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Motifs et arguments</label>
                  <textarea className="form-input" value={form.recourse_grounds} onChange={e => set('recourse_grounds', e.target.value)}
                    placeholder="Décrivez les irrégularités constatées, les textes violés, et vos arguments…"
                    style={{ ...s.formInput, minHeight: 100, resize: 'vertical' }} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Stade du recours</label>
                  <select className="form-input" value={form.recourse_stage} onChange={e => set('recourse_stage', e.target.value)} style={s.formInput}>
                    <option value="attribution">Contestation d'attribution</option>
                    <option value="elimination">Contestation d'élimination</option>
                    <option value="procedure">Irrégularité de procédure</option>
                    <option value="execution">Litige d'exécution</option>
                  </select>
                </div>
              </>
            )}

            <button type="submit" style={{ ...s.primaryBtn, width: '100%', padding: '14px', fontSize: 14, marginTop: 8 }} disabled={generating}>
              {generating ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Génération en cours…
                </span>
              ) : <><Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Générer le document avec l'IA</>}
            </button>
          </form>
        </div>

        {/* Panel d'aide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...s.panel, background: 'linear-gradient(135deg,#0f1e3d,#1B3A6B)', color: '#fff' }}>
            <div style={{ marginBottom: 12 }}>{dt && <dt.icon size={28} />}</div>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{dt?.label}</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 16 }}>{dt?.desc}</p>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              <BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Généré selon :<br />
              · Décret 2018/366 (Code marchés)<br />
              · DTAO types ARMP Cameroun<br />
              · Loi 2006/012 sur les marchés
            </div>
          </div>

          <div style={s.panel}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1B3A6B', marginBottom: 10 }}><Lightbulb size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Conseils</h4>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {[
                'Renseignez la référence exacte du marché pour personnaliser le document.',
                'Le document généré est un modèle — vérifiez et adaptez-le avant soumission.',
                'Toujours faire relire par un juriste pour les recours ARMP.',
              ].map((tip, i) => (
                <li key={i} style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 6 }}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════ RENDERER AVEC CHAMPS INTERACTIFS ════════════ */
/*
 * fills  = { occurrenceIndex: "valeur" }  — chaque occurrence est INDÉPENDANTE
 * onFill = (occurrenceIndex, valeur) => void
 * allPH  = [{ idx, label }, ...]  — toutes les occurrences dans l'ordre du document
 */
function DocRenderer({ content, fills, onFill, activeIdx, allPH, onFocus }) {
  if (!content) return null;

  /* Compteur d'occurrences — partagé entre tous les appels RI de ce rendu */
  const occ = { n: 0 };

  /* Inline parser */
  const RI = (text, pfx) => {
    if (!text) return text;
    const parts = [];
    const rx = /(\*\*(.+?)\*\*|\[([^\]]+)\])/g;
    let last = 0, m, rIdx = 0;
    while ((m = rx.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      if (m[2]) {
        parts.push(<strong key={`${pfx}-b${rIdx}`} style={{ fontWeight: 700, color: '#0f172a' }}>{m[2]}</strong>);
      } else if (m[3]) {
        const label = m[3];
        if (onFill) {
          const occIdx   = occ.n++;                        // index unique de cette occurrence
          const filled   = (fills?.[occIdx] || '').trim(); // valeur propre à cette occurrence
          const isActive = occIdx === activeIdx;
          parts.push(
            <span key={`${pfx}-ph${rIdx}`} style={{ display: 'inline-block', margin: '0 2px', verticalAlign: 'middle' }}>
              <input
                data-ph-idx={occIdx}
                value={fills?.[occIdx] || ''}
                onChange={e => onFill(occIdx, e.target.value)}
                onFocus={() => onFocus && onFocus(occIdx)}
                placeholder={label}
                title={`Occurrence ${occIdx + 1} : ${label}`}
                className={isActive ? 'ph-active-input' : ''}
                style={{
                  border: 'none',
                  borderBottom: `2.5px solid ${isActive ? '#f59e0b' : filled ? '#16a34a' : '#94a3b8'}`,
                  background: isActive ? '#fef9c3' : filled ? '#f0fdf4' : '#f8fafc',
                  color: filled ? '#166534' : '#334155',
                  fontSize: 13,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  padding: '3px 8px',
                  minWidth: 120,
                  maxWidth: 280,
                  borderRadius: isActive ? '6px 6px 0 0' : '3px 3px 0 0',
                  outline: 'none',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all .2s',
                  boxShadow: isActive ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none',
                }}
              />
            </span>
          );
        } else {
          parts.push(
            <span key={`${pfx}-ph${rIdx}`} style={{ background: '#fef9c3', color: '#92400e', borderRadius: 4, padding: '1px 7px', fontSize: 12, fontWeight: 700, border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Pencil size={10} /> {label}
            </span>
          );
        }
      }
      rIdx++;
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    if (parts.length === 0) return text;
    if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
    return parts;
  };

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    /* ── Tableau markdown | col | ── */
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(l => !l.match(/^\s*\|[\s\-:]+\|/));
      const splitRow = r => r.split('|').slice(1, -1);
      const tableIdx = i;
      elements.push(
        <div key={`tbl-${tableIdx}`} style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={dr.table}>
            <thead><tr>{splitRow(rows[0] || '').map((c,ci) => <th key={ci} style={dr.th}>{RI(c.trim(), `th${tableIdx}c${ci}`)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((row, ri) => (
              <tr key={ri} style={ri % 2 === 1 ? { background: '#f8faff' } : {}}>
                {splitRow(row).map((c, ci) => <td key={ci} style={dr.td}>{RI(c.trim(), `td${tableIdx}r${ri}c${ci}`)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
      continue;
    }

    /* ── Section TITRE EN MAJUSCULES : ── */
    if (/^[A-ZÀÂÉÈÊÎÏÔÙÛÜÇ\s\-']{4,}\s*:/.test(line) && !line.startsWith('-')) {
      const colon = line.indexOf(':');
      const title = line.slice(0, colon).trim();
      const rest = line.slice(colon + 1).trim();
      elements.push(
        <div key={i} style={dr.sectionBlock}>
          <div style={dr.sectionTitle}>{title}</div>
          {rest && <div style={dr.sectionRest}>{RI(rest, `sr${i}`)}</div>}
        </div>
      );
      i++; continue;
    }

    /* ── Liste à puces ── */
    if (line.startsWith('- ')) {
      const items = []; const startI = i;
      while (i < lines.length && lines[i].startsWith('- ')) { items.push(lines[i].slice(2)); i++; }
      elements.push(
        <ul key={`ul-${startI}`} style={dr.ul}>
          {items.map((item, j) => <li key={j} style={dr.li}>{RI(item, `li${startI}j${j}`)}</li>)}
        </ul>
      );
      continue;
    }

    /* ── Ligne de signature ___ ── */
    if (line.includes('_____')) {
      elements.push(
        <div key={i} style={dr.signLine}>
          <div style={dr.signUnder} />
          <div style={dr.signLabel}>Signature et cachet</div>
        </div>
      );
      i++; continue;
    }

    /* ── Ligne vide ── */
    if (line.trim() === '') { elements.push(<div key={i} style={{ height: 10 }} />); i++; continue; }

    /* ── Paragraphe ── */
    elements.push(<p key={i} style={dr.p}>{RI(line, `p${i}`)}</p>);
    i++;
  }

  return <div>{elements}</div>;
}

const dr = {
  sectionBlock: { margin: '20px 0 8px' },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: '#1B3A6B', textTransform: 'uppercase', letterSpacing: 1.2, borderBottom: '2.5px solid #1B3A6B', paddingBottom: 5, marginBottom: 8 },
  sectionRest: { fontSize: 14, color: '#334155', lineHeight: 1.7 },
  p: { margin: '4px 0 6px', fontSize: 14, lineHeight: 1.85, color: '#334155', textAlign: 'justify' },
  ul: { paddingLeft: 22, margin: '6px 0' },
  li: { fontSize: 14, lineHeight: 1.75, color: '#334155', marginBottom: 5 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '1px solid #cbd5e1' },
  th: { background: '#1B3A6B', color: '#fff', padding: '10px 14px', fontWeight: 700, textAlign: 'left', fontSize: 12, border: '1px solid #1B3A6B' },
  td: { padding: '9px 14px', border: '1px solid #e2e8f0', color: '#334155', verticalAlign: 'top' },
  signLine: { margin: '28px 0 8px' },
  signUnder: { width: 220, borderBottom: '1.5px solid #334155', height: 28 },
  signLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' },
};

/* ════════════ GÉNÉRATEUR HTML OFFICIEL CAMEROUNAIS ════════════ */
function htmlEsc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Convertit le texte inline (bold, placeholders déjà résolus dans le contenu fusionné) */
function inlineToHTML(text) {
  if (!text) return '';
  let out = htmlEsc(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  /* Placeholders résiduels non remplis → trait pointillé */
  out = out.replace(/\[([^\]]+)\]/g, (_, ph) =>
    `<span class="ph-blank">&#x2026;${htmlEsc(ph)}&#x2026;</span>`
  );
  return out;
}

/* Armoiries du Cameroun — SVG précis pour rendu html2canvas */
const ARMOIRIES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 120 120">
  <!-- Bouclier fond vert -->
  <path d="M60 8 L108 26 L108 72 Q108 98 60 112 Q12 98 12 72 L12 26 Z" fill="#007A5E"/>
  <!-- Moitié droite rouge -->
  <path d="M60 8 L108 26 L108 72 Q108 98 60 112 Z" fill="#CE1126"/>
  <!-- Bande centrale rouge -->
  <rect x="54" y="8" width="12" height="104" fill="#CE1126"/>
  <!-- Étoile centrale jaune (5 branches) -->
  <polygon points="60,30 63.5,41 75,41 66,48 69,59 60,52 51,59 54,48 45,41 56.5,41" fill="#FCD116"/>
  <!-- Étoile gauche -->
  <polygon points="30,64 32.5,71.5 40,71.5 34,76 36.5,83.5 30,79 23.5,83.5 26,76 20,71.5 27.5,71.5" fill="#FCD116"/>
  <!-- Étoile droite -->
  <polygon points="90,64 92.5,71.5 100,71.5 94,76 96.5,83.5 90,79 83.5,83.5 86,76 80,71.5 87.5,71.5" fill="#FCD116"/>
  <!-- Bande jaune bas du bouclier -->
  <path d="M17 90 Q60 106 103 90 L103 97 Q60 114 17 97 Z" fill="#FCD116"/>
  <!-- Contour du bouclier -->
  <path d="M60 8 L108 26 L108 72 Q108 98 60 112 Q12 98 12 72 L12 26 Z" fill="none" stroke="#7a5c10" stroke-width="2"/>
</svg>`;

function buildPrintHTML(doc, _unused) {
  const dt    = DOC_TYPES.find(t => t.type === doc.type);
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ─── Construire le corps HTML ─── */
  const lines = doc.content.split('\n');
  let body = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    /* Tableau */
    if (line.trim().startsWith('|')) {
      const tLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tLines.push(lines[i]); i++; }
      const rows = tLines.filter(l => !l.match(/^\s*\|[\s\-:]+\|/));
      const cells = r => r.split('|').slice(1,-1);
      const bodyRows = rows.slice(1).map((row, ri) =>
        `<tr${ri%2===1?' class="alt"':''}>` + cells(row).map(c=>`<td>${inlineToHTML(c.trim())}</td>`).join('') + '</tr>'
      ).join('');
      body += '<table><thead><tr>' + cells(rows[0]||'').map(c=>`<th>${inlineToHTML(c.trim())}</th>`).join('') + '</tr></thead><tbody>' + bodyRows + '</tbody></table>';
      continue;
    }
    /* Section en majuscules */
    if (/^[A-ZÀÂÉÈÊÎÏÔÙÛÜÇ\s\-']{4,}\s*:/.test(line) && !line.startsWith('-')) {
      const colon = line.indexOf(':');
      const title = htmlEsc(line.slice(0, colon).trim());
      const rest  = inlineToHTML(line.slice(colon + 1).trim());
      body += `<div class="sec-title">${title}</div>`;
      if (rest.trim()) body += `<p class="sec-body">${rest}</p>`;
      i++; continue;
    }
    /* Liste */
    if (line.startsWith('- ')) {
      body += '<ul>';
      while (i < lines.length && lines[i].startsWith('- ')) { body += `<li>${inlineToHTML(lines[i].slice(2))}</li>`; i++; }
      body += '</ul>'; continue;
    }
    /* Zone de signature */
    if (line.includes('_____')) {
      body += `<div class="sig-zone">
        <div class="sig-grid">
          <div class="sig-col"><div class="sig-line"></div><p class="sig-lbl">Signature et cachet du soumissionnaire</p></div>
          <div class="sig-col"><div class="sig-line"></div><p class="sig-lbl">Visa de l'Autorité Contractante</p></div>
        </div>
      </div>`;
      i++; continue;
    }
    /* Ligne vide */
    if (line.trim() === '') { body += '<div class="spacer"></div>'; i++; continue; }
    /* Paragraphe */
    body += `<p>${inlineToHTML(line)}</p>`;
    i++;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${htmlEsc(doc.title)}</title>
<style>
  @page { size: A4 portrait; margin: 20mm 18mm 18mm 22mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, Georgia, serif;
    font-size: 12pt;
    line-height: 1.85;
    color: #000;
    background: #fff;
    width: 100%;
  }

  /* ══════════════════════════════════════════
     EN-TÊTE OFFICIELLE — FLOAT (compatible html2canvas)
     Structure réelle des documents MINMAP/ARMP :
       [COL GAUCHE FR]  [ARMOIRIES+DRAPEAU]  [COL DROITE EN]
  ══════════════════════════════════════════ */
  .entete {
    width: 100%;
    overflow: hidden;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .col-fr {
    float: left;
    width: 38%;
    text-align: left;
    font-size: 9.5pt;
    line-height: 1.6;
  }
  .col-centre {
    float: left;
    width: 24%;
    text-align: center;
  }
  .col-en {
    float: right;
    width: 38%;
    text-align: right;
    font-size: 9.5pt;
    line-height: 1.6;
  }
  .clearfix { clear: both; }

  .rep    { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
  .devise { font-size: 9pt; font-style: italic; color: #222; margin-top: 2px; }
  .ministere { font-size: 8.5pt; margin-top: 6px; line-height: 1.4; }

  /* Drapeau tricolore : 3 divs côte à côte */
  .drapeau-wrap { margin: 0 auto 6px; width: 48px; height: 32px; overflow: hidden; border: 1px solid #888; }
  .drap-bande { float: left; width: 33.33%; height: 32px; }
  .drap-v { background: #007A5E; }
  .drap-r { background: #CE1126; }
  .drap-j { background: #FCD116; }
  .clearfix-drap { clear: both; }

  /* ── TITRE DU DOCUMENT ── */
  .doc-titre {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-decoration: underline;
    margin: 16px 0 5px;
  }
  .doc-ref {
    text-align: center;
    font-size: 9.5pt;
    color: #333;
    font-style: italic;
    margin-bottom: 14px;
  }
  .filet-double {
    border: none;
    border-top: 3px double #000;
    margin: 10px 0 16px;
  }

  /* ── SECTIONS ── */
  .sec-title {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-bottom: 1.5px solid #000;
    padding-bottom: 3px;
    margin: 18px 0 7px;
  }
  .sec-body { margin-bottom: 7px; }

  /* ── CORPS ── */
  p { margin: 0 0 7pt; text-align: justify; }
  ul { padding-left: 22px; margin: 5px 0 8px; }
  li { margin-bottom: 4px; text-align: justify; }
  .spacer { height: 7pt; }
  .ph-blank {
    display: inline-block;
    min-width: 70px;
    border-bottom: 1.5px dotted #333;
    font-style: italic;
    color: #444;
    padding: 0 3px;
  }

  /* ── TABLEAUX ── */
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th { background: #222; color: #fff; padding: 6px 10px; font-weight: bold; border: 1px solid #000; text-align: left; }
  td { padding: 5px 10px; border: 1px solid #555; vertical-align: top; }
  tr.alt td { background: #f4f4f4; }

  /* ── SIGNATURES ── */
  .sig-zone { margin: 32px 0 8px; overflow: hidden; }
  .sig-col-l { float: left;  width: 45%; }
  .sig-col-r { float: right; width: 45%; text-align: right; }
  .sig-line { border-bottom: 1.5px solid #000; height: 34px; }
  .sig-lbl { font-size: 8.5pt; margin-top: 4px; font-style: italic; color: #333; }

  /* ── PIED DE PAGE ── */
  .pied {
    margin-top: 28px;
    padding-top: 7px;
    border-top: 1px solid #aaa;
    font-size: 8pt;
    color: #555;
    text-align: center;
    overflow: hidden;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<!-- ════════════ EN-TÊTE OFFICIELLE CAMEROUNAISE ════════════ -->
<div class="entete">

  <!-- Colonne gauche : FRANÇAIS -->
  <div class="col-fr">
    <div class="rep">R&eacute;publique du Cameroun</div>
    <div class="devise">Paix &ndash; Travail &ndash; Patrie</div>
    <div class="ministere">
      Minist&egrave;re des March&eacute;s Publics<br>
      <strong>MINMAP</strong>
    </div>
  </div>

  <!-- Colonne centre : ARMOIRIES + DRAPEAU -->
  <div class="col-centre">
    <div class="drapeau-wrap">
      <div class="drap-bande drap-v"></div>
      <div class="drap-bande drap-r"></div>
      <div class="drap-bande drap-j"></div>
      <div class="clearfix-drap"></div>
    </div>
    ${ARMOIRIES_SVG}
  </div>

  <!-- Colonne droite : ANGLAIS -->
  <div class="col-en">
    <div class="rep">Republic of Cameroon</div>
    <div class="devise">Peace &ndash; Work &ndash; Fatherland</div>
    <div class="ministere">
      Ministry of Public Contracts<br>
      <strong>MINMAP</strong>
    </div>
  </div>

  <div class="clearfix"></div>
</div>
<!-- ═══════════════════════════════════════════════════════ -->

<!-- TITRE PRINCIPAL -->
<div class="doc-titre">${htmlEsc(doc.title)}</div>
<div class="doc-ref">
  ${dt ? htmlEsc(dt.label) + ' &nbsp;&mdash;&nbsp; ' : ''}
  D&eacute;cret n&deg;&nbsp;2018/366 du 20 juin 2018 &mdash; Code des March&eacute;s Publics du Cameroun
  &nbsp;&mdash;&nbsp; ${htmlEsc(today)}
</div>
<hr class="filet-double"/>

<!-- CORPS -->
${body}

<!-- PIED DE PAGE -->
<div class="pied">
  Plateforme E-TAM &mdash; March&eacute;s Publics du Cameroun
  &nbsp;&bull;&nbsp; D&eacute;cret 2018/366
  &nbsp;&bull;&nbsp; ${htmlEsc(today)}
</div>

</body>
</html>`;
}

/* ── Extrait toutes les occurrences de placeholders dans l'ordre du texte ── */
function extractOccurrences(content) {
  const occ = [];
  const rx = /\[([^\]]+)\]/g;
  let m;
  while ((m = rx.exec(content)) !== null) {
    occ.push({ idx: occ.length, label: m[1], start: m.index });
  }
  return occ; // [{ idx:0, label:'Nom entreprise', start:42 }, ...]
}

/* ════════════ DÉTAIL DOCUMENT ════════════ */
function DocumentDetail({ doc, onBack, onUpdate }) {
  const [editing, setEditing]     = useState(false);
  const [fillMode, setFillMode]   = useState(false);
  /* fills = { occurrenceIndex: "valeur saisie" } — chaque occurrence est INDÉPENDANTE */
  const [fills, setFills]         = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [content, setContent]     = useState(doc.content);
  const [saving, setSaving]       = useState(false);
  const docBodyRef                = React.useRef(null);

  const dt = DOC_TYPES.find(t => t.type === doc.type);
  const st = STATUS_MAP[doc.status] || STATUS_MAP.draft;

  /* Toutes les occurrences dans l'ordre du document */
  const allOcc = extractOccurrences(doc.content);
  const totalOcc    = allOcc.length;
  const filledCount = allOcc.filter(o => (fills[o.idx] || '').trim()).length;
  const pct = totalOcc > 0 ? Math.round((filledCount / totalOcc) * 100) : 100;

  const setFill = (occIdx, val) => setFills(f => ({ ...f, [occIdx]: val }));

  /* Naviguer vers une occurrence : scroll + focus dans le document */
  const goTo = (idx) => {
    setActiveIdx(idx);
    setTimeout(() => {
      const el = docBodyRef.current?.querySelector(`[data-ph-idx="${idx}"]`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
    }, 60);
  };

  const enterFillMode = () => { setFillMode(true); setEditing(false); setActiveIdx(0); };
  const exitFillMode  = () => { setFillMode(false); };

  /* Reconstruit le contenu en remplaçant chaque occurrence par sa valeur */
  const mergedContent = () => {
    let result = '';
    let cursor = 0;
    const rx = /\[([^\]]+)\]/g;
    let m, occI = 0;
    while ((m = rx.exec(doc.content)) !== null) {
      result += doc.content.slice(cursor, m.index);
      const val = (fills[occI] || '').trim();
      result += val || m[0]; // garde le placeholder si non rempli
      cursor = m.index + m[0].length;
      occI++;
    }
    result += doc.content.slice(cursor);
    return result;
  };

  const save = async () => {
    setSaving(true);
    try {
      const newContent = fillMode ? mergedContent() : content;
      const r = await documentService.update(doc.id, { content: newContent, status: 'final' });
      onUpdate(r.data);
      setEditing(false); setFillMode(false);
    } catch {}
    finally { setSaving(false); }
  };

  /* Document avec contenu fusionné */
  const mergedDoc = () => ({ ...doc, content: mergedContent() });

  const filename = doc.title.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'');

  const downloadTxt = () => {
    const blob = new Blob([mergedContent()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadHTML = () => {
    const html = buildPrintHTML(mergedDoc(), {});
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  /* PDF = même HTML que le téléchargement HTML, ouvert dans un onglet
     dédié avec impression automatique → "Enregistrer en PDF" dans la boîte.
     Rendu 100% identique car c'est le même moteur CSS du navigateur. */
  const downloadPDF = () => {
    setPdfLoading(true);
    const html = buildPrintHTML(mergedDoc(), {});

    /* Injecte un bandeau d'aide + auto-print */
    const pdfPage = html.replace('</body>', `
<div id="pdf-bar" style="
  position:fixed;top:0;left:0;right:0;z-index:9999;
  background:#1B3A6B;color:#fff;
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:10px 20px;font-family:Arial,sans-serif;font-size:13px;
  box-shadow:0 2px 8px rgba(0,0,0,.4);">
  <span>
    <strong>Télécharger en PDF :</strong>
    Dans la boîte qui s'ouvre → destination
    <strong>"Enregistrer en PDF"</strong> → cliquez <strong>Enregistrer</strong>
  </span>
  <button onclick="window.print()"
    style="background:#fff;color:#1B3A6B;border:none;padding:8px 18px;
    border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">
    Ouvrir impression / PDF
  </button>
  <button onclick="document.getElementById('pdf-bar').style.display='none'"
    style="background:transparent;color:rgba(255,255,255,.7);border:none;
    font-size:18px;cursor:pointer;padding:0 6px;">&times;</button>
</div>
<style>
  @media print { #pdf-bar { display:none !important; } }
</style>
</body>`);

    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { setPdfLoading(false); return; }
    w.document.write(pdfPage);
    w.document.close();
    w.focus();
    /* Déclenchement automatique de l'impression après chargement des styles */
    setTimeout(() => { w.print(); setPdfLoading(false); }, 1000);
  };

  const printDoc = () => {
    const html = buildPrintHTML(mergedDoc(), {});
    const w = window.open('', '_blank', 'width=900,height=1150');
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 900);
  };

  return (
    <div style={{ animation: 'fadeIn .25s ease' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0)} }
        .ph-active-input { animation: pulseRing 1.8s ease infinite; }
        .ph-active-input:focus { outline: none; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* ════ HEADER ════ */}
      <div style={s.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={s.backBtn} className="no-print" onClick={fillMode ? exitFillMode : onBack}>
            {fillMode
              ? <><X size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Quitter la complétion</>
              : <><ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Retour</>}
          </button>
          <div>
            <h1 style={s.pageTitle}>{dt && <dt.icon size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />} {doc.title}</h1>
            <p style={s.pageSub}>
              {dt?.label} · v{doc.version} ·{' '}
              <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>{st.label}</span>
              {totalOcc > 0 && !fillMode && (
                <span style={{ marginLeft: 10, background: '#fef9c3', color: '#92400e', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  <Pencil size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {totalOcc} champ{totalOcc > 1 ? 's' : ''} à compléter
                </span>
              )}
              {fillMode && (
                <span style={{ marginLeft: 10, background: pct === 100 ? '#dcfce7' : '#fef9c3', color: pct === 100 ? '#166534' : '#92400e', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {pct === 100
                    ? <><CheckCircle2 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Tous les champs renseignés</>
                    : <><Pencil size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {filledCount}/{totalOcc} complétés</>}
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="no-print">
          {!fillMode && <>
            <button style={s.backBtn} onClick={downloadTxt}><Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> .txt</button>
            <button style={s.secondaryBtn} onClick={downloadHTML}><Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> HTML</button>
            <button style={{ ...s.primaryBtn, background: '#0891b2', opacity: pdfLoading ? 0.7 : 1 }} onClick={downloadPDF} disabled={pdfLoading}>
              {pdfLoading
                ? <><Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> PDF en cours…</>
                : <><Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Télécharger PDF</>}
            </button>
            <button style={s.secondaryBtn} onClick={printDoc}><Printer size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Imprimer</button>
            {totalOcc > 0 && !editing && (
              <button style={{ ...s.primaryBtn, background: '#f59e0b' }} onClick={enterFillMode}>
                <Pencil size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Compléter
              </button>
            )}
            {!fillMode && (
              <button style={s.primaryBtn} onClick={() => setEditing(v => !v)}>
                {editing
                  ? <><X size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Annuler</>
                  : <><NotebookPen size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Éditer</>}
              </button>
            )}
          </>}
          {fillMode && <>
            <button style={s.secondaryBtn} onClick={exitFillMode}><X size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Annuler</button>
            <button style={{ ...s.primaryBtn, background: '#16a34a' }} onClick={save} disabled={saving}>
              {saving
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Enregistrement…</span>
                : <><Save size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Sauvegarder & Finaliser</>}
            </button>
          </>}
        </div>
      </div>

      {/* ════ BARRE PROGRESSION (fillMode) ════ */}
      {fillMode && totalOcc > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 12, padding: '14px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
          <div style={{ display: 'flex' }}><Pencil size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1B3A6B' }}>Complétion du document</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#16a34a' : '#f59e0b' }}>{pct}% — {filledCount}/{totalOcc} champs</span>
            </div>
            <div style={{ background: '#e8eef8', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#f59e0b', borderRadius: 99, transition: 'width .35s ease' }} />
            </div>
          </div>
          {pct === 100 && (
            <button style={{ ...s.primaryBtn, background: '#16a34a', fontSize: 12, padding: '8px 16px' }} onClick={save} disabled={saving}>
              <Save size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Finaliser
            </button>
          )}
        </div>
      )}

      {/* ════ BANDEAU AVERTISSEMENT (aperçu) ════ */}
      {!fillMode && !editing && totalOcc > 0 && (
        <div style={s.warnBanner}>
          <span style={{ display: 'flex' }}><AlertTriangle size={16} /></span>
          <span>Ce document contient <strong>{totalOcc} champ{totalOcc > 1 ? 's' : ''}</strong> à compléter avant utilisation.</span>
          <button style={{ ...s.primaryBtn, background: '#f59e0b', fontSize: 12, padding: '7px 14px', marginLeft: 'auto', whiteSpace: 'nowrap' }} onClick={enterFillMode}>
            <Pencil size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Compléter maintenant
          </button>
        </div>
      )}

      {/* ════ CORPS 2 COLONNES ════ */}
      <div style={{ ...s.detailGrid, gridTemplateColumns: fillMode ? '1fr 320px' : '1fr 280px' }} className="doc-detail-grid">

        {/* ── Zone document ── */}
        <div style={s.docCard}>
          <div style={s.docCardHeader}>
            <span style={s.docCardTitle}>
              {fillMode
                ? <><Pencil size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Complétion interactive — cliquez sur un champ pour le remplir</>
                : editing
                  ? <><NotebookPen size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Édition brute</>
                  : <><FileText size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Aperçu document</>}
            </span>
            {editing && (
              <button style={s.primaryBtn} onClick={save} disabled={saving}>
                {saving ? '…' : <><Save size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Sauvegarder</>}
              </button>
            )}
          </div>

          {editing ? (
            <textarea value={content} onChange={e => setContent(e.target.value)} style={s.editArea} />
          ) : (
            <div style={s.docBody} ref={docBodyRef}>
              {/* En-tête officielle */}
              <div style={s.docLetterHead}>
                <div style={s.docLetterFlag}>
                  <div style={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden', width: 52, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                    <div style={{ flex: 1, background: '#007A5E' }} />
                    <div style={{ flex: 1, background: '#CE1126' }} />
                    <div style={{ flex: 1, background: '#FCD116' }} />
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 800, color: '#1B3A6B', marginTop: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>Cameroun</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={s.docLetterRep}>République du Cameroun</div>
                  <div style={s.docLetterMotto}>Paix – Travail – Patrie</div>
                  <div style={s.docLetterTitle}>{doc.title}</div>
                  <div style={s.docLetterSub}>Conforme au Code des marchés publics · Décret n° 2018/366 du 20 juin 2018</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ ...s.statusBadge, background: st.bg, color: st.color, fontSize: 10 }}>{st.label}</span>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>Version {doc.version}</div>
                </div>
              </div>

              {/* Contenu */}
              <div style={s.docContent}>
                <DocRenderer
                  content={doc.content}
                  fills={fills}
                  onFill={fillMode ? setFill : undefined}
                  activeIdx={fillMode ? activeIdx : null}
                  allPH={allOcc}
                  onFocus={fillMode ? (occIdx) => setActiveIdx(occIdx) : undefined}
                />
              </div>
              <div style={s.docFooter}>Document généré par E-TAM · Plateforme des Marchés Publics du Cameroun</div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── WIZARD COMPLÉTION ── */}
          {fillMode && totalOcc > 0 && (
            <div style={{ background: '#fff', border: '1.5px solid #e8eef8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
              {/* En-tête wizard */}
              <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', padding: '14px 18px', borderBottom: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}><Pencil size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Complétion guidée</div>
                  <div style={{ fontSize: 11, color: '#a16207', marginTop: 2 }}>
                    Champ {Math.min(activeIdx + 1, totalOcc)} / {totalOcc}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, background: pct === 100 ? '#dcfce7' : '#fef9c3', color: pct === 100 ? '#166534' : '#92400e', borderRadius: 99, padding: '3px 10px' }}>{pct}%</span>
              </div>

              {/* Champ actif */}
              {allOcc[activeIdx] && (
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                    Champ #{activeIdx + 1}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A6B', marginBottom: 8, padding: '4px 8px', background: '#f0f7ff', borderRadius: 6, borderLeft: '3px solid #1B3A6B' }}>
                    {allOcc[activeIdx].label}
                  </div>
                  <input
                    key={activeIdx}
                    autoFocus
                    value={fills[activeIdx] || ''}
                    onChange={e => setFill(activeIdx, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        if (activeIdx < totalOcc - 1) goTo(activeIdx + 1);
                      }
                    }}
                    placeholder={`Saisir la valeur…`}
                    style={{ border: '1.5px solid #f59e0b', borderRadius: 8, padding: '10px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit', background: '#fffbeb', color: '#1e293b', boxSizing: 'border-box', transition: 'border-color .2s' }}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = (fills[activeIdx] || '').trim() ? '#16a34a' : '#f59e0b'}
                  />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}><CornerDownLeft size={11} style={{ verticalAlign: 'middle' }} /> Entrée ou Tab <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /> champ suivant</div>
                </div>
              )}

              {/* Navigation */}
              <div style={{ padding: '10px 18px', display: 'flex', gap: 8 }}>
                <button
                  style={{ ...s.backBtn, flex: 1, textAlign: 'center', fontSize: 12, opacity: activeIdx === 0 ? 0.4 : 1 }}
                  disabled={activeIdx === 0}
                  onClick={() => goTo(activeIdx - 1)}>
                  <ArrowLeft size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Préc.
                </button>
                <button
                  style={{ ...s.primaryBtn, flex: 1, textAlign: 'center', fontSize: 12, opacity: activeIdx === totalOcc - 1 ? 0.4 : 1 }}
                  disabled={activeIdx === totalOcc - 1}
                  onClick={() => goTo(activeIdx + 1)}>
                  Suiv. <ArrowRight size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                </button>
              </div>

              {/* Liste de toutes les occurrences */}
              <div style={{ borderTop: '1px solid #f1f5f9', maxHeight: 280, overflowY: 'auto' }}>
                {allOcc.map((occ) => {
                  const val    = (fills[occ.idx] || '').trim();
                  const active = occ.idx === activeIdx;
                  return (
                    <button
                      key={occ.idx}
                      onClick={() => goTo(occ.idx)}
                      style={{ width: '100%', textAlign: 'left', background: active ? '#fffbeb' : val ? '#f0fdf4' : '#fff', border: 'none', borderLeft: `3px solid ${active ? '#f59e0b' : val ? '#16a34a' : '#e2e8f0'}`, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 9, borderBottom: '1px solid #f8fafc', transition: 'background .15s' }}>
                      <span style={{ flexShrink: 0, marginTop: 1, display: 'flex' }}>{val ? <CheckCircle2 size={13} /> : active ? <Pencil size={13} /> : '○'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#92400e' : val ? '#166534' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#94a3b8', marginRight: 4 }}>#{occ.idx + 1}</span>{occ.label}
                        </div>
                        {val
                          ? <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{val}</div>
                          : <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>Non renseigné</div>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Infos document (toujours visible) ── */}
          {!fillMode && (
            <div style={s.panel}>
              <div style={s.sideInfoTitle}><Info size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Infos document</div>
              <div style={s.infoGrid}>
                <InfoRow label="Type" value={dt?.label} />
                <InfoRow label="Version" value={`v${doc.version}`} />
                <InfoRow label="Statut" value={st.label} color={st.color} />
                <InfoRow label="Créé le" value={new Date(doc.created_at).toLocaleDateString('fr-FR')} />
                <InfoRow label="Modifié" value={new Date(doc.updated_at).toLocaleDateString('fr-FR')} />
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={s.panel}>
            <div style={s.sideInfoTitle}><Zap size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {totalOcc > 0 && !fillMode && (
                <button style={{ ...s.primaryBtn, background: '#f59e0b', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={enterFillMode}>
                  <Pencil size={14} /> Compléter le document
                </button>
              )}
              <button style={{ ...s.primaryBtn, width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={downloadHTML}>
                <Download size={14} /> Télécharger (HTML / Word)
              </button>
              <button style={{ ...s.backBtn, width: '100%', textAlign: 'center', fontSize: 12 }} onClick={downloadTxt}>
                <Download size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Télécharger (.txt)
              </button>
              <div style={{ height: 1, background: '#e8eef8', margin: '2px 0' }} />
              <button style={{ ...s.primaryBtn, background: '#0891b2', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pdfLoading ? 0.7 : 1 }} onClick={downloadPDF} disabled={pdfLoading}>
                {pdfLoading ? <><Clock size={14} /> Génération PDF…</> : <><Download size={14} /> Télécharger PDF</>}
              </button>
              <button style={{ ...s.secondaryBtn, width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={printDoc}>
                <Printer size={14} /> Imprimer directement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color || '#1B3A6B' }}>{value}</span>
    </div>
  );
}

/* ════════════════ STYLES ════════════════ */
const s = {
  page: { minHeight: '100vh', background: '#f1f5f9', padding: '32px' },
  container: { maxWidth: 1100, margin: '0 auto' },

  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 },
  pageTitle: { fontSize: 22, fontWeight: 900, color: '#1B3A6B', margin: 0 },
  pageSub: { fontSize: 13, color: '#94a3b8', marginTop: 5, marginBottom: 0 },

  sectionTitle: { fontSize: 16, fontWeight: 800, color: '#1B3A6B', margin: '0 0 14px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 32 },

  typesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 },

  panel: { background: '#fff', borderRadius: 14, padding: '24px 26px', border: '1.5px solid #e8eef8', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' },
  divider: { height: 1, background: '#f1f5f9', margin: '18px 0' },
  subsectionLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  formGroup: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  formInput: { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 13px', fontSize: 14, boxSizing: 'border-box', width: '100%', background: '#fff', fontFamily: 'inherit' },
  formRow2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formRow3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 },
  formError: { background: '#fff0f0', color: '#CE1126', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 },

  statusBadge: { display: 'inline-block', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '4px 6px', color: '#cbd5e1', borderRadius: 6, flexShrink: 0 },

  primaryBtn: { background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  secondaryBtn: { background: '#fff', color: '#1B3A6B', border: '1.5px solid #1B3A6B', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  backBtn: { background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' },

  skeletonWrap: { display: 'flex', flexDirection: 'column', gap: 8 },
  skeletonRow: { height: 62, borderRadius: 10 },
  empty: { background: '#fff', borderRadius: 14, padding: '52px 24px', textAlign: 'center', border: '1.5px solid #e8eef8' },
  emptyTitle: { fontSize: 16, fontWeight: 800, color: '#1B3A6B', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },

  /* Détail document */
  warnBanner: { background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#92400e' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' },
  docCard: { background: '#fff', borderRadius: 14, border: '1.5px solid #e8eef8', boxShadow: '0 2px 16px rgba(27,58,107,0.06)', overflow: 'hidden' },
  docCardHeader: { padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8faff' },
  docCardTitle: { fontSize: 13, fontWeight: 700, color: '#1B3A6B' },
  docBody: { padding: 0 },
  docLetterHead: { background: 'linear-gradient(135deg, #f8faff, #eef2fb)', padding: '18px 32px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '2px solid #e8eef8' },
  docLetterFlag: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, gap: 3 },
  docLetterRep: { fontSize: 11, fontWeight: 800, color: '#1B3A6B', letterSpacing: 0.8, textTransform: 'uppercase' },
  docLetterMotto: { fontSize: 9, color: '#64748b', marginBottom: 6, fontStyle: 'italic' },
  docLetterTitle: { fontSize: 16, fontWeight: 900, color: '#1B3A6B', marginBottom: 3 },
  docLetterSub: { fontSize: 10, color: '#94a3b8' },
  docContent: { padding: '28px 36px', fontFamily: "'Georgia', 'Times New Roman', serif" },
  docFooter: { padding: '10px 36px 16px', borderTop: '1px solid #e8eef8', fontSize: 9, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' },
  editArea: { width: '100%', minHeight: 540, padding: '20px 24px', fontSize: 14, lineHeight: 1.8, fontFamily: "'Courier New', monospace", border: 'none', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#334155' },

  /* Sidebar infos */
  sideInfoTitle: { fontSize: 12, fontWeight: 800, color: '#1B3A6B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoGrid: { display: 'flex', flexDirection: 'column' },
};
