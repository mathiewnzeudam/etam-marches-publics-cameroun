import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tenderService } from '../services/api';
import {
  Mail, Settings, Coins, FolderOpen, Scale, ScrollText, AlertTriangle, ArrowLeft, Landmark,
  MapPin, Bookmark, Clock, ClipboardList, Calendar, Pin, Shield, Briefcase, FileText,
  Download, Link as LinkIcon, Bot, ArrowRight, X,
} from 'lucide-react';

const DOC_TYPES = [
  { type: 'submission_letter',  label: 'Lettre de soumission',    icon: Mail,       color: '#1B3A6B' },
  { type: 'technical_offer',    label: 'Offre technique',         icon: Settings,   color: '#007A5E' },
  { type: 'financial_offer',    label: 'Offre financière',        icon: Coins,      color: '#F39C12' },
  { type: 'qualification_file', label: 'Dossier de qualification',icon: FolderOpen, color: '#7c3aed' },
  { type: 'recourse',           label: 'Requête de recours ARMP', icon: Scale,      color: '#CE1126' },
  { type: 'contract_draft',     label: 'Projet de marché',        icon: ScrollText, color: '#0891b2' },
];

const STATUS_MAP = {
  open:      { label: 'Ouvert',   color: '#007A5E', bg: '#f0fdf4' },
  closed:    { label: 'Fermé',    color: '#64748b', bg: '#f8fafc' },
  awarded:   { label: 'Attribué', color: '#d97706', bg: '#fffbeb' },
  cancelled: { label: 'Annulé',   color: '#CE1126', bg: '#fff0f0' },
};

function fmt_amount(n) {
  if (!n) return null;
  const v = Number(n);
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} Mds FCFA`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M FCFA`;
  return `${v.toLocaleString('fr-FR')} FCFA`;
}

function days_left(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

function MetaBlock({ icon: Icon, label, value, highlight }) {
  if (!value) return null;
  return (
    <div style={s.metaBlock}>
      <div style={s.metaIcon}><Icon size={18} /></div>
      <div>
        <div style={s.metaLabel}>{label}</div>
        <div style={{ ...s.metaValue, ...(highlight ? { color: highlight, fontWeight: 700 } : {}) }}>{value}</div>
      </div>
    </div>
  );
}

export default function TenderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [dlState, setDlState] = useState({ piece: false, dao: false });
  const [dlError, setDlError] = useState('');

  useEffect(() => {
    tenderService.get(id)
      .then(r => setTender(r.data))
      .catch(() => setError('Marché introuvable ou une erreur est survenue.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = useCallback(async (docType) => {
    setDlState(s => ({ ...s, [docType]: true }));
    setDlError('');
    try {
      const res = await tenderService.downloadPdf(id, docType);
      const mime = res.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: mime });
      // Déduire l'extension depuis Content-Disposition ou le mime
      const disposition = res.headers['content-disposition'] || '';
      const extMatch = disposition.match(/filename="[^"]+\.([a-zA-Z0-9]+)"/);
      const ext = extMatch ? extMatch[1] : (mime.includes('pdf') ? 'pdf' : mime.includes('word') ? 'docx' : 'doc');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tender?.reference || id}_${docType}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      let msg = 'Document non disponible pour ce marché.';
      let redirectUrl = null;
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.detail || msg;
          redirectUrl = parsed.redirect_url || null;
        } catch (_) {}
      } else if (e.response?.data?.detail) {
        msg = e.response.data.detail;
        redirectUrl = e.response.data.redirect_url || null;
      }
      if (redirectUrl && typeof window !== 'undefined') {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      }
      setDlError(msg);
    } finally {
      setDlState(s => ({ ...s, [docType]: false }));
    }
  }, [id, tender]);

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: '#94a3b8', marginTop: 16 }}>Chargement du marché…</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ fontSize: 48, marginBottom: 16 }}><AlertTriangle size={48} /></div>
      <p style={{ color: '#CE1126', fontSize: 16, marginBottom: 20 }}>{error}</p>
      <button onClick={() => navigate('/marches')} style={s.backBtn}><ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Retour aux marchés</button>
    </div>
  );

  const st = STATUS_MAP[tender.status] || STATUS_MAP.closed;
  const dl = days_left(tender.deadline);
  const urgent = dl !== null && dl >= 0 && dl <= 7;
  const amount = fmt_amount(tender.estimated_amount);

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .info-tab { padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #64748b; border-bottom: 3px solid transparent; transition: all .2s; }
        .info-tab:hover { color: #1B3A6B; }
        .info-tab.active { color: #1B3A6B; border-bottom-color: #CE1126; }
        .action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .2s; text-decoration: none; border: none; }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }

        @media (max-width: 768px) {
          .td-container { padding: 18px 14px !important; }
          .td-body { grid-template-columns: 1fr !important; }
          .td-sidebar { width: 100% !important; }
          .td-hero-content { padding: 24px 18px !important; }
          .td-hero-meta { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .td-amount-card { position: static !important; margin: 16px 18px 0 !important; text-align: left !important; }
          .td-doctype-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 420px) {
          .td-doctype-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={s.container} className="td-container">
        {/* ── Fil d'Ariane ── */}
        <div style={s.breadcrumb}>
          <button onClick={() => navigate('/')} style={s.breadLink}>Accueil</button>
          <span style={s.breadSep}>›</span>
          <button onClick={() => navigate('/marches')} style={s.breadLink}>Marchés Publics</button>
          <span style={s.breadSep}>›</span>
          <span style={s.breadCurrent}>Détail</span>
        </div>

        {/* ── Hero card ── */}
        <div style={s.heroCard}>
          <div style={s.heroBg} />
          <div style={s.heroContent} className="td-hero-content">
            <div style={s.heroTop}>
              <span style={{ ...s.statusBadge, background: st.bg, color: st.color, border: `1.5px solid ${st.color}33` }}>
                <span style={{ ...s.statusDot, background: st.color }} />
                {st.label}
              </span>
              {tender.procedure_type && (
                <span style={s.typeBadge}>{tender.procedure_type}</span>
              )}
              {urgent && (
                <span style={s.urgentBadge}><AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Clôture imminente</span>
              )}
            </div>

            <h1 style={s.heroTitle}>{tender.title}</h1>

            <div style={s.heroMeta} className="td-hero-meta">
              {tender.authority && (
                <span style={s.heroMetaItem}><Landmark size={13} /> {tender.authority}</span>
              )}
              {tender.region && (
                <span style={s.heroMetaItem}><MapPin size={13} /> {tender.region}</span>
              )}
              {tender.reference && (
                <span style={s.heroMetaItem}><Bookmark size={13} /> {tender.reference}</span>
              )}
            </div>

            {/* Bande deadline si urgente */}
            {tender.deadline && (
              <div style={{ ...s.deadlineBand, background: urgent ? 'rgba(206,17,38,0.15)' : 'rgba(0,122,94,0.15)', borderColor: urgent ? 'rgba(206,17,38,0.3)' : 'rgba(0,122,94,0.3)' }}>
                <span style={{ color: urgent ? '#fca5a5' : '#86efac', fontWeight: 700 }}>
                  {urgent
                    ? <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    : <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />} Clôture : {new Date(tender.deadline).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {dl !== null && dl >= 0 && <span style={{ opacity: 0.85, marginLeft: 10 }}>({dl === 0 ? "aujourd'hui !" : `${dl} jour${dl > 1 ? 's' : ''} restant${dl > 1 ? 's' : ''}`})</span>}
                </span>
              </div>
            )}
          </div>

          {/* KPI flottant */}
          {amount && (
            <div style={s.amountCard} className="td-amount-card">
              <div style={s.amountLabel}>Montant estimé</div>
              <div style={s.amountValue}>{amount}</div>
            </div>
          )}
        </div>

        {/* ── Corps ── */}
        <div style={s.body} className="td-body">
          {/* Colonne principale */}
          <div style={s.main}>
            {/* Infos clés */}
            <div style={s.card}>
              <h2 style={s.cardTitle}><ClipboardList size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Informations clés</h2>
              <div style={s.metaGrid}>
                <MetaBlock icon={Bookmark} label="Référence" value={tender.reference} />
                <MetaBlock icon={Settings} label="Secteur" value={tender.sector ? tender.sector.charAt(0).toUpperCase() + tender.sector.slice(1) : null} />
                <MetaBlock icon={Landmark} label="Autorité contractante" value={tender.authority} />
                <MetaBlock icon={MapPin} label="Région" value={tender.region || 'Cameroun'} />
                <MetaBlock icon={Calendar} label="Date de publication" value={tender.publication_date ? new Date(tender.publication_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
                <MetaBlock icon={Clock} label="Date de clôture" value={tender.deadline ? new Date(tender.deadline).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : null} highlight={urgent ? '#CE1126' : undefined} />
                <MetaBlock icon={Coins} label="Montant estimé" value={amount} highlight="#007A5E" />
                <MetaBlock icon={Pin} label="Type de procédure" value={tender.procedure_type} />
                <MetaBlock icon={Shield} label="Cautionnement" value={tender.raw_data?.caution_amount || null} />
                <MetaBlock icon={Calendar} label="Délai d'exécution" value={tender.raw_data?.delai_execution || null} />
                <MetaBlock icon={Briefcase} label="Financement" value={tender.raw_data?.financing || null} />
              </div>
            </div>

            {/* Description */}
            {tender.description && (
              <div style={s.card}>
                <h2 style={s.cardTitle}><FileText size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Description</h2>
                <p style={s.description}>{tender.description}</p>
              </div>
            )}

            {/* Données brutes ARMP (raw_data) */}
            {tender.raw_data && (tender.raw_data.caution_amount || tender.raw_data.delai_execution || tender.raw_data.financing) && (
              <div style={s.card}>
                <h2 style={s.cardTitle}><FolderOpen size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Conditions de participation</h2>
                <div style={s.metaGrid}>
                  {tender.raw_data.caution_amount && <MetaBlock icon={Shield} label="Cautionnement provisoire" value={tender.raw_data.caution_amount} />}
                  {tender.raw_data.delai_execution && <MetaBlock icon={Clock} label="Délai d'exécution" value={tender.raw_data.delai_execution} />}
                  {tender.raw_data.financing && <MetaBlock icon={Briefcase} label="Source de financement" value={tender.raw_data.financing} />}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside style={s.sidebar} className="td-sidebar">
            {/* Documents ARMP */}
            <div style={s.sideCard}>
              <h3 style={s.sideTitle}><Download size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Documents officiels</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="action-btn"
                  disabled={dlState.piece}
                  onClick={() => handleDownload('piece')}
                  style={{ background: '#1B3A6B', color: '#fff', justifyContent: 'center', opacity: dlState.piece ? 0.7 : 1 }}
                >
                  {dlState.piece
                    ? <><Clock size={14} /> Chargement…</>
                    : <><FileText size={14} /> Pièce d'origine</>}
                </button>
                <button
                  className="action-btn"
                  disabled={dlState.dao}
                  onClick={() => handleDownload('dao')}
                  style={{ background: '#007A5E', color: '#fff', justifyContent: 'center', opacity: dlState.dao ? 0.7 : 1 }}
                >
                  {dlState.dao
                    ? <><Clock size={14} /> Chargement…</>
                    : <><ClipboardList size={14} /> Dossier DAO</>}
                </button>
                {dlError && (
                  <div style={{ fontSize: 11, color: '#CE1126', background: '#fff0f0', border: '1px solid #fecaca', borderRadius: 7, padding: '8px 12px', lineHeight: 1.5 }}>
                    <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {dlError}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>
                  Source officielle ARMP
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={s.sideCard}>
              <h3 style={s.sideTitle}>Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tender.source_url && (
                  <a href={tender.source_url} target="_blank" rel="noreferrer" className="action-btn" style={{ background: '#fff', color: '#1B3A6B', border: '1.5px solid #1B3A6B', justifyContent: 'center' }}>
                    <LinkIcon size={14} /> Voir sur ARMP
                  </a>
                )}
                <button className="action-btn" onClick={() => setShowDocModal(true)} style={{ background: '#007A5E', color: '#fff', justifyContent: 'center' }}>
                  <FileText size={14} /> Générer un document
                </button>
                <button className="action-btn" onClick={() => navigate('/chat')} style={{ background: '#1B3A6B', color: '#fff', justifyContent: 'center' }}>
                  <Bot size={14} /> Analyser avec l'IA
                </button>
                <button className="action-btn" onClick={() => navigate('/marches')} style={{ background: '#f1f5f9', color: '#64748b', justifyContent: 'center' }}>
                  <ArrowLeft size={14} /> Retour aux marchés
                </button>
              </div>
            </div>

            {/* Calendrier */}
            <div style={s.sideCard}>
              <h3 style={s.sideTitle}><Calendar size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Calendrier</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tender.publication_date && (
                  <div style={s.timelineItem}>
                    <div style={{ ...s.timelineDot, background: '#007A5E' }} />
                    <div>
                      <div style={s.timelineLabel}>Publication</div>
                      <div style={s.timelineDate}>{new Date(tender.publication_date).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                )}
                {tender.deadline && (
                  <div style={s.timelineItem}>
                    <div style={{ ...s.timelineDot, background: urgent ? '#CE1126' : '#F39C12' }} />
                    <div>
                      <div style={s.timelineLabel}>Clôture des offres</div>
                      <div style={{ ...s.timelineDate, color: urgent ? '#CE1126' : undefined, fontWeight: urgent ? 700 : undefined }}>
                        {new Date(tender.deadline).toLocaleDateString('fr-FR')}
                        {dl !== null && dl >= 0 && <span style={{ marginLeft: 6, fontSize: 11 }}>({dl}j)</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Aide IA */}
            <div style={s.iaCard}>
              <div style={{ fontSize: 28, marginBottom: 10 }}><Bot size={28} /></div>
              <h4 style={s.iaTitle}>Besoin d'aide pour ce marché ?</h4>
              <p style={s.iaDesc}>Notre assistant IA peut vous aider à comprendre les exigences et préparer votre dossier.</p>
              <button className="action-btn" onClick={() => navigate('/chat')} style={{ background: '#CE1126', color: '#fff', width: '100%', justifyContent: 'center', fontSize: 13 }}>
                Poser une question <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Modal génération document ── */}
      {showDocModal && (
        <DocModal
          tender={tender}
          onClose={() => setShowDocModal(false)}
          onSelect={(docType) => {
            navigate('/documents', {
              state: {
                prefill: {
                  type: docType,
                  tender_reference: tender.reference,
                  tender_title: tender.title,
                  tender_authority: tender.authority,
                  tender_region: tender.region,
                  tender_sector: tender.sector,
                  tender_amount: tender.estimated_amount,
                }
              }
            });
          }}
        />
      )}
    </div>
  );
}

/* ── Modal choix type de document ── */
function DocModal({ tender, onClose, onSelect }) {
  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modalBox} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B3A6B', margin: 0 }}><FileText size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Générer un document</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
              Pré-rempli avec : <strong style={{ color: '#1B3A6B' }}>{tender.reference}</strong>
            </p>
          </div>
          <button onClick={onClose} style={s.modalClose}><X size={14} /></button>
        </div>
        <div style={s.modalBanner}>
          <span style={{ fontSize: 14 }}><Landmark size={14} /></span>
          <span style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>
            <strong>{tender.title?.slice(0, 90)}{tender.title?.length > 90 ? '…' : ''}</strong><br />
            {tender.authority}
          </span>
        </div>
        <div style={s.docTypeGrid} className="td-doctype-grid">
          {DOC_TYPES.map(dt => (
            <button key={dt.type} style={s.docTypeBtn} onClick={() => onSelect(dt.type)}>
              <span style={{ fontSize: 26, marginBottom: 6, display: 'block' }}><dt.icon size={26} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: dt.color, textAlign: 'center', lineHeight: 1.3, display: 'block' }}>{dt.label}</span>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 4, paddingBottom: 4 }}>
          Le formulaire sera pré-rempli avec les données de ce marché
        </p>
      </div>
    </div>
  );
}

/* ════════════════ STYLES ════════════════ */
const s = {
  page: { minHeight: '100vh', background: '#f1f5f9' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 8 },
  spinner: { width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#1B3A6B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  container: { maxWidth: 1200, margin: '0 auto', padding: '28px 32px' },

  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 },
  breadLink: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', padding: 0, fontWeight: 500 },
  breadSep: { color: '#cbd5e1', fontSize: 13 },
  breadCurrent: { fontSize: 13, color: '#1B3A6B', fontWeight: 700 },

  heroCard: { position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: 28, boxShadow: '0 4px 24px rgba(27,58,107,0.15)' },
  heroBg: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f1e3d 0%, #1B3A6B 60%, #0d2a1a 100%)' },
  heroContent: { position: 'relative', zIndex: 1, padding: '36px 40px', color: '#fff' },
  heroTop: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18, alignItems: 'center' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 },
  statusDot: { width: 7, height: 7, borderRadius: '50%' },
  typeBadge: { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' },
  urgentBadge: { background: 'rgba(206,17,38,0.3)', color: '#fca5a5', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, border: '1px solid rgba(206,17,38,0.5)' },
  heroTitle: { fontSize: 24, fontWeight: 900, lineHeight: 1.35, marginBottom: 14, margin: '0 0 14px' },
  heroMeta: { display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 0 },
  heroMetaItem: { fontSize: 13, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 5 },
  deadlineBand: { marginTop: 18, border: '1px solid', borderRadius: 10, padding: '10px 16px', fontSize: 13 },
  amountCard: { position: 'absolute', top: 32, right: 32, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '14px 20px', textAlign: 'right', zIndex: 2 },
  amountLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 20, fontWeight: 900, color: '#FCD116', marginTop: 4 },

  body: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' },

  main: { display: 'flex', flexDirection: 'column', gap: 20 },
  card: { background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1.5px solid #e8eef8', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' },
  cardTitle: { fontSize: 16, fontWeight: 800, color: '#1B3A6B', marginTop: 0, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' },

  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  metaBlock: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  metaIcon: { fontSize: 18, flexShrink: 0, marginTop: 2 },
  metaLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  metaValue: { fontSize: 14, color: '#1B3A6B', fontWeight: 600, lineHeight: 1.4 },

  description: { fontSize: 14, color: '#475569', lineHeight: 1.8, margin: 0 },

  docList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  docItem: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#475569', lineHeight: 1.5 },
  docIcon: { color: '#007A5E', fontWeight: 900, flexShrink: 0, marginTop: 1 },

  sidebar: { display: 'flex', flexDirection: 'column', gap: 16 },
  sideCard: { background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1.5px solid #e8eef8', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' },
  sideTitle: { fontSize: 15, fontWeight: 800, color: '#1B3A6B', marginTop: 0, marginBottom: 16 },

  timelineItem: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  timelineDot: { width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  timelineLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 },
  timelineDate: { fontSize: 14, fontWeight: 600, color: '#1B3A6B', marginTop: 2 },

  iaCard: { background: 'linear-gradient(135deg, #0f1e3d, #1B3A6B)', borderRadius: 14, padding: '22px 20px', color: '#fff' },
  iaTitle: { fontSize: 14, fontWeight: 800, margin: '0 0 8px' },
  iaDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 16px' },

  backBtn: { background: 'none', border: '1.5px solid #1B3A6B', color: '#1B3A6B', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },

  /* Modal */
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,30,61,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 22px 14px', borderBottom: '1px solid #f0f4ff' },
  modalClose: { background: '#f0f2f5', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalBanner: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 22px', background: '#f8faff', borderBottom: '1px solid #eef1f8' },
  docTypeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '18px 22px 14px' },
  docTypeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px', borderRadius: 12, border: '2px solid #e8eef8', background: '#fff', cursor: 'pointer', transition: 'all .2s', outline: 'none' },
};
