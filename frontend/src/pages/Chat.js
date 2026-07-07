import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, FolderOpen, Scale, Coins, BookOpen, ThumbsUp, ThumbsDown,
  Bot, Lightbulb, Clock, MessageCircle, Trash2, Sparkles, Zap,
  Lock, ArrowUp, Menu, X as CloseIcon,
} from 'lucide-react';

/* ══════════════════════════════════════════════
   MARKDOWN RENDERER
══════════════════════════════════════════════ */
function Markdown({ text, variant = 'dark' }) {
  if (!text) return null;
  const c = variant === 'light' ? mdLight : md;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(l => !/^\s*\|[\s\-:|]+\|\s*$/.test(l));
      const splitRow = r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const tableIdx = i;
      elements.push(
        <div key={`tbl-${tableIdx}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={c.table}>
            <thead><tr>{splitRow(rows[0] || '').map((cell, ci) => <th key={ci} style={c.th}>{inline(cell, variant)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((row, ri) => (
              <tr key={ri}>{splitRow(row).map((cell, ci) => <td key={ci} style={c.td}>{inline(cell, variant)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      );
      continue;
    }
    else if (line.trim().startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) { quoteLines.push(lines[i].trim().slice(2)); i++; }
      elements.push(<blockquote key={`bq-${i}`} style={c.blockquote}>{quoteLines.map((l, li) => <p key={li} style={{ margin: 0 }}>{inline(l, variant)}</p>)}</blockquote>);
      continue;
    }
    else if (line.startsWith('### '))      { elements.push(<h4 key={i} style={c.h3}>{inline(line.slice(4), variant)}</h4>); }
    else if (line.startsWith('## ')) { elements.push(<h3 key={i} style={c.h2}>{inline(line.slice(3), variant)}</h3>); }
    else if (line.startsWith('# '))  { elements.push(<h2 key={i} style={c.h1}>{inline(line.slice(2), variant)}</h2>); }
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i} style={c.li}>{inline(lines[i].slice(2), variant)}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} style={c.ul}>{items}</ul>);
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} style={c.li}>{inline(lines[i].replace(/^\d+\.\s/, ''), variant)}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} style={c.ol}>{items}</ol>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(<p key={i} style={c.p}>{inline(line, variant)}</p>);
    }
    i++;
  }
  return <div>{elements}</div>;
}

function inline(text, variant = 'dark') {
  const c = variant === 'light' ? mdLight : md;
  const parts = [];
  const rx = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2])      parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={c.code}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

const md = {
  h1: { fontSize: 16, fontWeight: 800, color: '#1B3A6B', margin: '10px 0 6px' },
  h2: { fontSize: 15, fontWeight: 800, color: '#1B3A6B', margin: '8px 0 5px' },
  h3: { fontSize: 14, fontWeight: 700, color: '#1B3A6B', margin: '6px 0 4px' },
  p:  { margin: '3px 0', fontSize: 14, lineHeight: 1.65, color: '#334155' },
  ul: { paddingLeft: 18, margin: '4px 0' },
  ol: { paddingLeft: 18, margin: '4px 0' },
  li: { fontSize: 14, lineHeight: 1.65, marginBottom: 3, color: '#334155' },
  code: { background: '#f0f4ff', color: '#1B3A6B', borderRadius: 4, padding: '1px 6px', fontSize: 13, fontFamily: 'monospace' },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: 13 },
  th: { textAlign: 'left', padding: '7px 10px', background: '#f0f4ff', color: '#1B3A6B', fontWeight: 700, border: '1px solid #e2e8f0' },
  td: { padding: '7px 10px', border: '1px solid #e2e8f0', color: '#334155', verticalAlign: 'top' },
  blockquote: { margin: '6px 0', padding: '8px 14px', borderLeft: '3px solid #1B3A6B', background: '#f8faff', color: '#475569', fontSize: 14, lineHeight: 1.6 },
};

/* Variante claire — utilisée sur fond sombre (bulle utilisateur) */
const mdLight = {
  h1: { ...md.h1, color: '#fff' },
  h2: { ...md.h2, color: '#fff' },
  h3: { ...md.h3, color: '#fff' },
  p:  { ...md.p, color: '#fff' },
  ul: md.ul,
  ol: md.ol,
  li: { ...md.li, color: '#fff' },
  code: { ...md.code, background: 'rgba(255,255,255,0.18)', color: '#fff' },
  table: md.table,
  th: { ...md.th, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' },
  td: { ...md.td, color: '#fff', border: '1px solid rgba(255,255,255,0.25)' },
  blockquote: { ...md.blockquote, background: 'rgba(255,255,255,0.1)', color: '#fff', borderLeft: '3px solid rgba(255,255,255,0.5)' },
};

/* ══════════════════════════════════════════════
   SUGGESTIONS PAR CATÉGORIE
══════════════════════════════════════════════ */
const SUGGESTION_GROUPS = [
  {
    label: 'Procédures',
    icon: ClipboardList,
    questions: [
      "Conditions pour soumissionner à un appel d'offres ?",
      "Procédure d'appel d'offres restreint ?",
      "Différence entre AO national et international ?",
      "Qu'est-ce qu'une demande de cotation ?",
    ],
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    questions: [
      "Documents requis pour un dossier de soumission ?",
      "Comment rédiger une lettre de soumission ?",
      "Que contient un DAO (Dossier d'Appel d'Offres) ?",
      "Pièces justificatives de qualification technique ?",
    ],
  },
  {
    label: 'Recours & Contentieux',
    icon: Scale,
    questions: [
      "Délais de recours devant l'ARMP ?",
      "Comment saisir la Commission de recours ?",
      "Motifs valides pour contester une attribution ?",
      "Procédure de règlement amiable des litiges ?",
    ],
  },
  {
    label: 'Financier',
    icon: Coins,
    questions: [
      "Comment calculer le cautionnement provisoire ?",
      "Qu'est-ce que la caution de bonne exécution ?",
      "Règles de variation des prix dans un marché ?",
      "Modalités de paiement des marchés publics ?",
    ],
  },
];

/* ══════════════════════════════════════════════
   COMPOSANT : SOURCES RAG
══════════════════════════════════════════════ */
function SourcesPanel({ sources }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources || sources.length === 0) return null;
  const shown = expanded ? sources : sources.slice(0, 3);
  return (
    <div style={st.sourcesWrap}>
      <div style={st.srcHeader} onClick={() => setExpanded(v => !v)}>
        <span style={st.srcTitle}><BookOpen size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />{sources.length} source{sources.length > 1 ? 's' : ''} consultée{sources.length > 1 ? 's' : ''}</span>
        <span style={st.srcToggle}>{expanded ? '▲' : '▼'}</span>
      </div>
      {shown.map((s, i) => (
        <div key={i} style={st.srcItem}>
          <div style={st.srcTop}>
            <span style={st.srcName}>{s.source_name}</span>
            {s.article_ref && <span style={st.srcRef}>{s.article_ref}</span>}
            <span style={{ ...st.srcScore, background: s.score > 0.8 ? '#dcfce7' : s.score > 0.65 ? '#fef9c3' : '#fee2e2', color: s.score > 0.8 ? '#166534' : s.score > 0.65 ? '#854d0e' : '#991b1b' }}>
              {Math.round(s.score * 100)}%
            </span>
          </div>
          {expanded && s.content_snippet && (
            <p style={st.srcSnippet}>« {s.content_snippet.slice(0, 200)}{s.content_snippet.length > 200 ? '…' : ''} »</p>
          )}
        </div>
      ))}
      {!expanded && sources.length > 3 && (
        <button style={st.srcMore} onClick={() => setExpanded(true)}>
          +{sources.length - 3} autres sources
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   COMPOSANT : FEEDBACK
══════════════════════════════════════════════ */
function FeedbackBar({ messageId }) {
  const [sent, setSent] = useState(null);
  if (!messageId) return null;
  const give = async (score) => {
    if (sent !== null) return;
    setSent(score);
    try { await chatService.feedback(messageId, score); } catch { /* silencieux */ }
  };
  return (
    <div style={st.feedbackRow}>
      <span style={st.feedbackLabel}>Cette réponse était-elle utile ?</span>
      <button onClick={() => give(1)} style={{ ...st.fbBtn, ...(sent === 1 ? { background: '#dcfce7', borderColor: '#86efac', color: '#166534' } : {}) }}
        disabled={sent !== null} title="Utile"><ThumbsUp size={14} fill={sent === 1 ? 'currentColor' : 'none'} /></button>
      <button onClick={() => give(-1)} style={{ ...st.fbBtn, ...(sent === -1 ? { background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' } : {}) }}
        disabled={sent !== null} title="Pas utile"><ThumbsDown size={14} fill={sent === -1 ? 'currentColor' : 'none'} /></button>
      {sent !== null && <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>{sent === 1 ? 'Merci !' : 'Noté, nous allons améliorer.'}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════ */
export default function Chat() {
  const WELCOME_MSG = {
    role: 'assistant',
    content: 'Bonjour ! Je suis votre assistant IA spécialisé dans les marchés publics camerounais.\n\nJe peux vous aider sur :\n- Le **Code des marchés publics** (Décret 2018/366)\n- Les procédures **ARMP** et **COLEPS**\n- La préparation de vos **dossiers de soumission**\n- Les **délais de recours** et contentieux\n\nPosez-moi votre question !',
  };

  const [messages, setMessages]       = useState([WELCOME_MSG]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [convId, setConvId]           = useState(null);
  const [showSuggested, setShowSugg]  = useState(true);
  const [activeGroup, setActiveGroup] = useState(0);

  /* Historique */
  const [history, setHistory]         = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const bottomRef = useRef();
  const inputRef  = useRef();
  const { user }  = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Charger historique */
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistLoading(true);
    try {
      const r = await chatService.history(30);
      setHistory(r.data || []);
    } catch { /* silencieux */ }
    finally { setHistLoading(false); }
  }, [user]);

  useEffect(() => {
    if (user && showHistory) loadHistory();
  }, [user, showHistory, loadHistory]);

  /* Supprimer une conversation */
  const deleteConv = async (id, e) => {
    e.stopPropagation();
    try {
      await chatService.deleteConv(id);
      setHistory(h => h.filter(c => c.id !== id));
      if (convId === id) startNew();
    } catch { /* silencieux */ }
  };

  /* Nouvelle conversation */
  const startNew = () => {
    setMessages([WELCOME_MSG]);
    setConvId(null);
    setShowSugg(true);
    setInput('');
  };

  /* Reprendre une conversation existante */
  const resumeConv = (conv) => {
    setConvId(conv.id);
    setMessages([
      WELCOME_MSG,
      { role: 'user', content: `Reprise de la conversation : **${conv.title}**` },
    ]);
    setShowSugg(false);
    setShowHistory(false);
    setMobileSidebarOpen(false);
  };

  /* Envoyer un message */
  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    if (!user) { navigate('/connexion', { state: { from: '/chat' } }); return; }
    setInput('');
    setShowSugg(false);
    setMessages(m => [...m, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const r = await chatService.ask(q, convId);
      const d = r.data;
      setConvId(d.conversation_id);
      setMessages(m => [...m, {
        role: 'assistant',
        content: d.answer,
        sources: d.sources,
        messageId: d.message_id,
        latency: d.latency_ms,
        fromCache: d.from_cache,
      }]);
    } catch (err) {
      const msg = err.response?.status === 401
        ? 'Session expirée. Veuillez vous reconnecter.'
        : 'Une erreur est survenue. Vérifiez votre connexion et réessayez.';
      setMessages(m => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const msgCount = messages.filter(m => m.role === 'user').length;
  const activeSugg = SUGGESTION_GROUPS[activeGroup];

  return (
    <div style={st.page} className="chat-page">
      <style>{`
        @keyframes blink { 0%,80%,100%{opacity:0}40%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:blink 1.2s infinite}
        .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
        .side-btn{display:flex;align-items:center;gap:8px;width:100%;background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.85);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 11px;margin-bottom:6px;cursor:pointer;font-size:11.5px;text-align:left;transition:background .15s}
        .side-btn:hover{background:rgba(255,255,255,0.15)}
        .send-btn{background:#1B3A6B;color:#fff;border:none;border-radius:10px;padding:0 20px;font-weight:700;cursor:pointer;font-size:18px;flex-shrink:0;transition:all .15s;height:44px;width:44px;display:flex;align-items:center;justify-content:center}
        .send-btn:hover:not(:disabled){background:#0f2447;transform:translateY(-1px)}
        .send-btn:disabled{opacity:.45;cursor:not-allowed}
        .sugg-chip{display:inline-flex;align-items:center;gap:5px;background:#f0f4ff;color:#1B3A6B;border:1.5px solid #dde8ff;border-radius:20px;padding:6px 13px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;text-align:left}
        .sugg-chip:hover{background:#1B3A6B;color:#fff;border-color:#1B3A6B}
        .hist-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .15s;border:1px solid transparent}
        .hist-item:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.1)}
        .hist-del{background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s;flex-shrink:0}
        .hist-del:hover{color:#CE1126}
        .tab-btn{padding:5px 12px;border-radius:20px;border:1.5px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.6);font-size:11px;cursor:pointer;font-weight:600;transition:all .15s;white-space:nowrap}
        .tab-btn.active{background:rgba(255,255,255,0.15);color:#fff;border-color:rgba(255,255,255,0.3)}
        .msg-wrap{animation:fadeIn .25s ease}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#dde3f0;border-radius:3px}
        .chat-mobile-toggle{display:none}
        .chat-overlay{display:none}
        @media (max-width: 768px) {
          .chat-page{ position: relative; overflow: hidden !important; }
          .chat-sidebar{ position: fixed !important; left: 0; top: 0; bottom: 0; z-index: 40; height: 100% !important; transform: translateX(-100%); transition: transform .25s ease; width: 82vw !important; max-width: 300px; }
          .chat-sidebar.open{ transform: translateX(0); }
          .chat-mobile-toggle{ display: inline-flex !important; }
          .chat-overlay.open{ display: block !important; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 30; }
          .chat-user-bubble{ max-width: 85% !important; }
          .chat-bot-bubble{ max-width: 88% !important; }
          .chat-header-badge{ display: none !important; }
          .chat-messages{ padding: 16px 12px !important; }
          .chat-input-wrap{ padding: 10px 12px !important; }
        }
      `}</style>

      {/* Overlay mobile */}
      <div className={`chat-overlay${mobileSidebarOpen ? ' open' : ''}`} onClick={() => setMobileSidebarOpen(false)} />

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside style={st.sidebar} className={`chat-sidebar${mobileSidebarOpen ? ' open' : ''}`}>
        {/* Avatar + badge */}
        <div style={st.sideTop}>
          <div style={st.sideAvatar}><Bot size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={st.sideTitle}>Assistant IA</div>
            <div style={st.sideSub}>Marchés publics camerounais</div>
          </div>
        </div>
        <div style={st.sideBadge}>
          <span style={st.onlineDot} />
          En ligne · Llama 3.3-70B
        </div>

        {/* Onglets Suggestions / Historique */}
        {user && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            <button className={`tab-btn${!showHistory ? ' active' : ''}`} onClick={() => setShowHistory(false)}>
              <Lightbulb size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Suggestions
            </button>
            <button className={`tab-btn${showHistory ? ' active' : ''}`}
              onClick={() => { setShowHistory(true); loadHistory(); }}>
              <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Historique
            </button>
          </div>
        )}

        <div style={st.sideDivider} />

        {/* ── SUGGESTIONS ── */}
        {!showHistory && (
          <>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
              {SUGGESTION_GROUPS.map((g, i) => (
                <button key={g.label} className={`tab-btn${activeGroup === i ? ' active' : ''}`}
                  onClick={() => setActiveGroup(i)}>
                  <g.icon size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{g.label}
                </button>
              ))}
            </div>
            {activeSugg.questions.map(q => (
              <button key={q} className="side-btn" onClick={() => send(q)}>
                <span style={{ flexShrink: 0, display: 'inline-flex' }}><activeSugg.icon size={14} /></span>
                <span style={{ flex: 1, lineHeight: 1.4 }}>{q}</span>
              </button>
            ))}
          </>
        )}

        {/* ── HISTORIQUE ── */}
        {showHistory && user && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {histLoading ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', padding: 16 }}>Chargement…</div>
            ) : history.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                Aucune conversation enregistrée
              </div>
            ) : (
              history.map(conv => (
                <div key={conv.id} className="hist-item" onClick={() => resumeConv(conv)}>
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}><MessageCircle size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <button className="hist-del" onClick={(e) => deleteConv(conv.id, e)} title="Supprimer"><Trash2 size={13} /></button>
                </div>
              ))
            )}
          </div>
        )}

        <div style={st.sideDivider} />

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 10 }}>
          <BookOpen size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Base juridique :<br />
          Décret 2018/366 · ARMP · COLEPS<br />
          Loi 2006/012 · DTAO Cameroun
        </div>

        <button style={st.newChatBtn} onClick={startNew}>
          <Sparkles size={13} /> Nouvelle conversation
        </button>
      </aside>

      {/* ═══════════ ZONE CHAT ═══════════ */}
      <div style={st.chatWrap}>
        {/* En-tête */}
        <div style={st.chatHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="chat-mobile-toggle" onClick={() => setMobileSidebarOpen(v => !v)}
              style={{ background: 'none', border: '1.5px solid #dde3f0', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#1B3A6B', alignItems: 'center', justifyContent: 'center' }}
              title="Menu">
              {mobileSidebarOpen ? <CloseIcon size={16} /> : <Menu size={16} />}
            </button>
            <div>
              <h2 style={st.chatTitle}>Chat IA — Marchés Publics</h2>
              <span style={st.chatMeta}>
                {msgCount === 0 ? 'Démarrez une conversation' : `${msgCount} question${msgCount > 1 ? 's' : ''}`}
                {convId && <span style={{ color: '#007A5E', marginLeft: 8, fontWeight: 700 }}>· Conversation active</span>}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="chat-header-badge" style={st.chatBadge}><Bot size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Llama 3.3 · Base ARMP</span>
            {msgCount > 0 && (
              <button onClick={startNew} title="Nouvelle conversation"
                style={{ background: 'none', border: '1.5px solid #dde3f0', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#666' }}>
                <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Nouveau
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={st.messages} className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className="msg-wrap">
              {m.role === 'user' ? (
                <div style={st.userRow}>
                  <div style={st.userBubble} className="chat-user-bubble">
                    <Markdown text={m.content} variant="light" />
                  </div>
                  <div style={st.userAvatar}>{(user?.full_name || 'U')[0].toUpperCase()}</div>
                </div>
              ) : (
                <div style={st.botRow}>
                  <div style={st.botAvatar}>IA</div>
                  <div style={st.botBubble} className="chat-bot-bubble">
                    <Markdown text={m.content} />
                    <SourcesPanel sources={m.sources} />
                    {m.messageId && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        <FeedbackBar messageId={m.messageId} />
                        {m.latency && (
                          <span style={{ fontSize: 10, color: '#cbd5e1' }}>
                            {m.fromCache ? <><Zap size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />Cache</> : `${Math.round(m.latency)}ms`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Suggestions initiales */}
          {showSuggested && messages.length === 1 && (
            <div style={{ animation: 'fadeIn .4s ease .1s both' }}>
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 12 }}>Questions fréquentes :</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTION_GROUPS.flatMap(g => g.questions.slice(0, 1)).map(q => (
                  <button key={q} className="sugg-chip" onClick={() => send(q)}>{q}</button>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 10 }}>
                {SUGGESTION_GROUPS.map(g => (
                  <div key={g.label} style={{ background: '#f8faff', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #e8eef8' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A6B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><g.icon size={14} /> {g.label}</div>
                    {g.questions.slice(0, 2).map(q => (
                      <button key={q} className="sugg-chip" onClick={() => send(q)}
                        style={{ display: 'block', width: '100%', marginBottom: 6, textAlign: 'left', borderRadius: 8 }}>
                        {q}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicateur chargement */}
          {loading && (
            <div style={st.botRow} className="msg-wrap">
              <div style={st.botAvatar}>IA</div>
              <div style={{ ...st.botBubble, padding: '14px 18px' }}>
                <span className="dot" />&nbsp;<span className="dot" />&nbsp;<span className="dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Zone de saisie */}
        <div style={st.inputWrap} className="chat-input-wrap">
          {!user && (
            <div style={st.loginBanner}>
              <Lock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> <strong>Connectez-vous</strong> pour utiliser l'assistant IA —{' '}
              <span style={{ color: '#CE1126', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => navigate('/connexion', { state: { from: '/chat' } })}>
                Se connecter
              </span>
            </div>
          )}
          <div style={st.inputRow}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={user
                ? 'Posez votre question sur les marchés publics… (Entrée pour envoyer)'
                : 'Connectez-vous pour poser une question'}
              style={st.textarea}
              disabled={loading || !user}
              rows={1}
            />
            <button className="send-btn" onClick={() => send()}
              disabled={loading || !input.trim() || !user} title="Envoyer">
              <ArrowUp size={18} />
            </button>
          </div>
          <div style={st.inputHint}>
            Llama 3.3-70B · Base juridique ARMP · Réponses non contractuelles
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════ */
const st = {
  page: { display: 'flex', height: 'calc(100vh - 80px)', background: '#f8faff', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif" },

  sidebar: { width: 280, background: 'linear-gradient(180deg, #0f1e3d 0%, #1B3A6B 100%)', color: '#fff', padding: '20px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: 0 },
  sideTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  sideAvatar: { width: 42, height: 42, background: '#CE1126', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  sideTitle: { fontSize: 14, fontWeight: 800 },
  sideSub: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  sideBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '4px 10px', fontSize: 10, color: '#4ade80', marginBottom: 14 },
  onlineDot: { width: 6, height: 6, background: '#4ade80', borderRadius: '50%', flexShrink: 0 },
  sideDivider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' },
  newChatBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 9, padding: '9px', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'background .15s', width: '100%' },

  chatWrap: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  chatHeader: { background: '#fff', padding: '14px 22px', borderBottom: '1px solid #e8eef8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  chatTitle: { fontSize: 16, fontWeight: 800, color: '#1B3A6B', margin: '0 0 2px' },
  chatMeta: { fontSize: 11, color: '#94a3b8' },
  chatBadge: { fontSize: 11, background: '#f0f4ff', color: '#1B3A6B', borderRadius: 20, padding: '5px 12px', fontWeight: 600 },

  messages: { flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 },

  userRow: { display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'flex-end' },
  userAvatar: { width: 30, height: 30, background: 'linear-gradient(135deg,#1B3A6B,#CE1126)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  userBubble: { background: '#1B3A6B', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '11px 15px', maxWidth: '65%' },

  botRow: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  botAvatar: { width: 32, height: 32, background: '#CE1126', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 2 },
  botBubble: { background: '#fff', borderRadius: '4px 16px 16px 16px', padding: '14px 17px', maxWidth: '76%', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e8eef8' },

  /* Sources */
  sourcesWrap: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0f4f8' },
  srcHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 6 },
  srcTitle: { fontSize: 11, fontWeight: 700, color: '#94a3b8' },
  srcToggle: { fontSize: 9, color: '#94a3b8' },
  srcItem: { background: '#f8fafc', borderRadius: 7, padding: '7px 10px', marginBottom: 5, border: '1px solid #eef1f8' },
  srcTop: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  srcName: { fontSize: 11, fontWeight: 700, color: '#1B3A6B' },
  srcRef: { fontSize: 10, color: '#888', background: '#f0f4ff', borderRadius: 4, padding: '1px 6px' },
  srcScore: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 6px', marginLeft: 'auto' },
  srcSnippet: { fontSize: 11, color: '#64748b', margin: '6px 0 0', lineHeight: 1.5, fontStyle: 'italic' },
  srcMore: { background: 'none', border: 'none', color: '#1B3A6B', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: '2px 0' },

  /* Feedback */
  feedbackRow: { display: 'flex', alignItems: 'center', gap: 6 },
  feedbackLabel: { fontSize: 11, color: '#94a3b8' },
  fbBtn: { background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 14, transition: 'all .15s' },

  /* Input */
  inputWrap: { background: '#fff', padding: '12px 18px', borderTop: '1px solid #e8eef8', flexShrink: 0 },
  loginBanner: { background: '#fff8f0', color: '#92400e', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 13 },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: { flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto', transition: 'border-color .2s', background: '#fafbfe' },
  inputHint: { fontSize: 10, color: '#cbd5e1', marginTop: 6, textAlign: 'center' },
};
