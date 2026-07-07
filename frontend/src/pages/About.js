import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, Scale, Lock, Mail, Laptop, Landmark, BarChart3,
  ClipboardList, Map, RefreshCw, CheckCircle2, Gift, Target, Search, Bot,
  FileText, Bell, HardHat, Calendar, HelpCircle, HeartHandshake,
  AlertTriangle, Ban, MessageCircle, Trash2, Cookie, Globe, Rocket, Bug,
  Lightbulb, ArrowRight, ArrowUpRight,
} from 'lucide-react';

/* ── Drapeau camerounais ── */
function CamFlag({ w = 32, h = 22 }) {
  return (
    <svg width={w} height={h} viewBox="0 0 36 24" style={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <rect width="12" height="24" fill="#007A5E" />
      <rect x="12" width="12" height="24" fill="#CE1126" />
      <rect x="24" width="12" height="24" fill="#FCD116" />
      <polygon points="18,8 19.1,11.4 22.7,11.4 19.8,13.5 20.9,16.9 18,14.8 15.1,16.9 16.2,13.5 13.3,11.4 16.9,11.4" fill="#FCD116" />
    </svg>
  );
}

/* ── Onglets ── */
const TABS = [
  { id: 'projet',      label: 'Le Projet', icon: GraduationCap },
  { id: 'equipe',      label: 'Équipe', icon: Users },
  { id: 'legal',       label: 'Base légale', icon: Scale },
  { id: 'confidential',label: 'Confidentialité', icon: Lock },
  { id: 'contact',     label: 'Contact', icon: Mail },
];

/* ── Membres de l'équipe ── */
const TEAM = [
  {
    name: 'Équipe Développement',
    role: 'Étudiants DUT Informatique',
    institution: 'IUT – Université de Douala',
    icon: Laptop,
    color: '#1B3A6B',
    tasks: ['Architecture backend FastAPI', 'Base de données PostgreSQL', 'Intégration IA (RAG)', 'Déploiement & DevOps'],
  },
  {
    name: 'Encadrement pédagogique',
    role: 'Département Informatique',
    institution: 'IUT – Université de Douala',
    icon: Landmark,
    color: '#007A5E',
    tasks: ['Supervision du projet', 'Validation technique', 'Soutenance DUT', 'Évaluation académique'],
  },
  {
    name: 'Données & Contenu',
    role: 'Sources officielles',
    institution: 'ARMP · République du Cameroun',
    icon: BarChart3,
    color: '#CE1126',
    tasks: ['Portail armp.cm', 'Décret 2018/366', 'Loi 2006/012', 'Données DTAO Cameroun'],
  },
];

/* ── Textes légaux ── */
const LEGAL_ARTICLES = [
  {
    ref: 'Décret N° 2018/366',
    title: 'Code des marchés publics du Cameroun',
    desc: 'Texte de référence régissant l\'ensemble des procédures de passation, d\'exécution et de contrôle des marchés publics au Cameroun. Ce décret constitue la base juridique principale de la plateforme.',
    date: '20 juin 2018',
  },
  {
    ref: 'Loi N° 2006/012',
    title: 'Loi fixant le régime général des contrats de partenariat',
    desc: 'Encadre les contrats de partenariat public-privé et les délégations de service public. Complémentaire au code des marchés publics.',
    date: '29 décembre 2006',
  },
  {
    ref: 'Décret N° 2012/074',
    title: 'Organisation et fonctionnement de l\'ARMP',
    desc: 'Définit les attributions, l\'organisation et le fonctionnement de l\'Autorité de Régulation des Marchés Publics (ARMP) du Cameroun.',
    date: '8 mars 2012',
  },
  {
    ref: 'DTAO Cameroun',
    title: 'Dossiers Types d\'Appel d\'Offres',
    desc: 'Documents standardisés utilisés pour les appels d\'offres nationaux et internationaux au Cameroun, publiés par l\'ARMP.',
    date: 'Mis à jour en 2023',
  },
];

/* ── FAQ ── */
const FAQ = [
  {
    q: 'Marché-IA est-il un service officiel de l\'ARMP ?',
    a: 'Non. Marché-IA Cameroun est un projet académique réalisé dans le cadre d\'un DUT Informatique à l\'IUT de Douala. Les données proviennent du portail officiel armp.cm mais la plateforme n\'est pas affiliée à l\'ARMP.',
  },
  {
    q: 'Les données affichées sont-elles fiables ?',
    a: 'Les données sont extraites automatiquement du portail armp.cm toutes les heures. En cas de divergence, le portail officiel armp.cm fait foi. Les réponses de l\'assistant IA sont indicatives et non contractuelles.',
  },
  {
    q: 'Mon compte et mes données sont-ils sécurisés ?',
    a: 'Les mots de passe sont hachés avec bcrypt. Les tokens JWT expirent après 24h. Aucune donnée personnelle sensible n\'est partagée avec des tiers. Le projet est hébergé localement à des fins académiques.',
  },
  {
    q: 'L\'assistant IA peut-il remplacer un conseil juridique ?',
    a: 'Non. L\'assistant IA fournit des informations générales basées sur le code des marchés publics camerounais. Pour toute question juridique engageant vos droits, consultez un avocat ou contactez directement l\'ARMP.',
  },
  {
    q: 'Comment signaler une erreur ou une irrégularité ?',
    a: 'Utilisez la page Réclamations de la plateforme, ou contactez directement l\'ARMP au +237 222 22 33 14 ou via leur portail officiel armp.cm.',
  },
];

/* ── Technologies ── */
const TECH_STACK = [
  { cat: 'Backend', items: ['FastAPI (Python)', 'PostgreSQL', 'Redis', 'Celery', 'Qdrant (vecteurs)'] },
  { cat: 'Frontend', items: ['React 19', 'React Router v7', 'Axios', 'SVG Charts (custom)'] },
  { cat: 'Intelligence Artificielle', items: ['RAG (Retrieval-Augmented Generation)', 'Llama 3.3-70B (Groq)', 'Sentence Transformers', 'Embeddings multilingues'] },
  { cat: 'Données', items: ['Scraping armp.cm', 'BeautifulSoup 4', 'feedparser (RSS)', 'Mise à jour toutes les heures'] },
];

/* ══════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════ */
export default function About() {
  const [tab, setTab] = useState('projet');
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={s.page}>
      <style>{`
        .about-tab { padding: 9px 18px; border-radius: 10px; border: 1.5px solid #dde3f0; background: #fff; cursor: pointer; font-size: 13px; font-weight: 600; color: #555; transition: all .2s; }
        .about-tab.active { background: #1B3A6B; color: #fff; border-color: #1B3A6B; }
        .about-tab:hover:not(.active) { border-color: #1B3A6B; color: #1B3A6B; }
        .faq-item { border: 1.5px solid #e8eef8; border-radius: 12px; overflow: hidden; margin-bottom: 10px; transition: border-color .2s; }
        .faq-item:hover { border-color: #1B3A6B; }
        .faq-q { display: flex; align-items: center; justify-content: space-between; gap: 12; padding: 14px 18px; cursor: pointer; background: #fff; font-weight: 600; font-size: 14px; color: #1B3A6B; }
        .faq-a { padding: 0 18px 14px; font-size: 13px; color: #555; line-height: 1.7; border-top: 1px solid #f0f4f8; padding-top: 12px; }
        .tech-pill { display: inline-flex; align-items: center; background: #f0f4ff; color: #1B3A6B; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; margin: 3px; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none} }
        .tab-content { animation: fadeIn .25s ease; }

        @media (max-width: 768px) {
          .about-grid2 { grid-template-columns: 1fr !important; }
          .about-team-grid { grid-template-columns: 1fr !important; }
          .about-thanks-grid { grid-template-columns: 1fr !important; }
          .about-hero { padding: 40px 16px 32px !important; }
          .about-container { padding: 24px 12px 48px !important; }
          .about-card { padding: 18px 16px !important; }
          .about-stat-item { padding: 14px 16px !important; }
          .about-legal-icon { width: 40px !important; height: 40px !important; }
        }
        @media (max-width: 480px) {
          .about-stats-band { justify-content: flex-start !important; overflow-x: auto !important; }
          .about-context-row { flex-direction: column !important; gap: 2px !important; }
          .about-context-label { width: auto !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div className="about-hero" style={s.hero}>
        <div style={s.heroInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <CamFlag w={42} h={28} />
            <div style={s.heroBadge}>Projet académique DUT · IUT Douala</div>
          </div>
          <h1 style={s.heroTitle}>À propos de Marché-IA Cameroun</h1>
          <p style={s.heroSub}>
            Une plateforme d'intelligence artificielle pour la transparence et l'accessibilité
            des marchés publics camerounais — développée dans le cadre d'un projet de fin d'études DUT.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <a href="https://armp.cm" target="_blank" rel="noreferrer" style={{ ...s.heroBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>Portail ARMP officiel <ArrowUpRight size={14} /></a>
            <Link to="/marches" style={{ ...s.heroBtnOutline, display: 'inline-flex', alignItems: 'center', gap: 6 }}>Explorer les marchés <ArrowRight size={14} /></Link>
          </div>
        </div>
        {/* Décoration géométrique */}
        <div style={{ position: 'absolute', top: 20, right: 40, opacity: 0.06 }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#FCD116" strokeWidth="2" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#FCD116" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="30" fill="none" stroke="#FCD116" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* ── Bandeau stats ── */}
      <div className="about-stats-band" style={s.statsBand}>
        {[
          { val: '2 400+', lbl: 'Marchés indexés', icon: ClipboardList },
          { val: '10',     lbl: 'Régions couvertes', icon: Map },
          { val: '1h',     lbl: 'Fréquence de mise à jour', icon: RefreshCw },
          { val: '100%',   lbl: 'Source officielle ARMP', icon: CheckCircle2 },
          { val: 'Gratuit', lbl: 'Accès citoyen', icon: Gift },
        ].map(({ val, lbl, icon: Icon }) => (
          <div key={lbl} className="about-stat-item" style={s.statItem}>
            <span style={s.statIcon}><Icon size={20} /></span>
            <span style={s.statVal}>{val}</span>
            <span style={s.statLbl}>{lbl}</span>
          </div>
        ))}
      </div>

      <div className="about-container" style={s.container}>

        {/* ── Onglets ── */}
        <div style={s.tabs}>
          {TABS.map(t => (
            <button key={t.id} className={`about-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* ════ LE PROJET ════ */}
        {tab === 'projet' && (
          <div className="tab-content">
            <div className="about-grid2" style={s.grid2}>
              <div className="about-card" style={s.card}>
                <h2 style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={18} />Objectifs du projet</h2>
                <p style={s.cardText}>
                  Marché-IA Cameroun est un projet de fin d'études DUT Informatique visant à améliorer
                  l'accessibilité et la transparence des marchés publics camerounais grâce à l'intelligence artificielle.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  {[
                    { icon: Search, title: 'Centralisation', desc: 'Regrouper tous les appels d\'offres ARMP en un seul endroit, avec recherche avancée et filtres' },
                    { icon: Bot, title: 'Intelligence artificielle', desc: 'Assistant IA basé sur RAG pour répondre aux questions juridiques sur les marchés publics' },
                    { icon: FileText, title: 'Génération documentaire', desc: 'Produire automatiquement les documents requis pour les soumissions (lettres, offres, recours)' },
                    { icon: Bell, title: 'Veille automatique', desc: 'Alertes personnalisées par secteur, région et mots-clés pour ne manquer aucune opportunité' },
                    { icon: Scale, title: 'Transparence', desc: 'Tableau de bord public avec statistiques, répartitions et export des données ARMP' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} /></div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1B3A6B', marginBottom: 2 }}>{title}</div>
                        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="about-card" style={s.card}>
                  <h2 style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><HardHat size={18} />Architecture technique</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {TECH_STACK.map(({ cat, items }) => (
                      <div key={cat}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{cat}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                          {items.map(item => <span key={item} className="tech-pill">{item}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="about-card" style={{ ...s.card, background: 'linear-gradient(135deg, #1B3A6B, #2a5298)', color: '#fff' }}>
                  <h2 style={{ ...s.cardTitle, color: '#FCD116', display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={18} />Contexte académique</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { lbl: 'Formation', val: 'DUT Informatique' },
                      { lbl: 'Établissement', val: 'IUT — Université de Douala' },
                      { lbl: 'Année universitaire', val: '2025 – 2026' },
                      { lbl: 'Type de projet', val: 'Projet de fin d\'études (PFE)' },
                    ].map(({ lbl, val }) => (
                      <div key={lbl} className="about-context-row" style={{ display: 'flex', gap: 12 }}>
                        <span className="about-context-label" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 140, flexShrink: 0 }}>{lbl}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="about-card" style={{ ...s.card, marginTop: 20 }}>
              <h2 style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><HelpCircle size={18} />Questions fréquentes</h2>
              {FAQ.map((item, i) => (
                <div key={i} className="faq-item">
                  <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{item.q}</span>
                    <span style={{ fontSize: 18, color: '#1B3A6B', flexShrink: 0 }}>{openFaq === i ? '−' : '+'}</span>
                  </div>
                  {openFaq === i && <div className="faq-a">{item.a}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ ÉQUIPE ════ */}
        {tab === 'equipe' && (
          <div className="tab-content">
            <div className="about-team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 24 }}>
              {TEAM.map((m, i) => (
                <div key={i} className="about-card" style={{ ...s.card, borderTop: `4px solid ${m.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: m.color + '18', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <m.icon size={26} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1B3A6B' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: m.color, fontWeight: 600, marginTop: 2 }}>{m.role}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{m.institution}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {m.tasks.map(task => (
                      <div key={task} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#555' }}>{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="about-card" style={{ ...s.card, background: '#f8fafc' }}>
              <h2 style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><HeartHandshake size={18} />Remerciements</h2>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 16 }}>
                Nous remercions chaleureusement toutes les personnes qui ont contribué à ce projet :
              </p>
              <div className="about-thanks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                {[
                  { who: 'L\'ARMP du Cameroun', why: 'Pour la mise à disposition des données publiques sur armp.cm' },
                  { who: 'L\'IUT de Douala', why: 'Pour l\'encadrement académique et les ressources pédagogiques' },
                  { who: 'La communauté open source', why: 'FastAPI, React, PostgreSQL, Qdrant, Llama, Groq API' },
                  { who: 'Les entreprises locales', why: 'Pour leurs retours lors des phases de test utilisateur' },
                ].map(({ who, why }) => (
                  <div key={who} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e8eef8' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1B3A6B', marginBottom: 4 }}>{who}</div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{why}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ BASE LÉGALE ════ */}
        {tab === 'legal' && (
          <div className="tab-content">
            <div className="about-card" style={{ ...s.card, marginBottom: 20, background: '#fff8f0', border: '1.5px solid #fde68a' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}><AlertTriangle size={24} /></span>
                <div>
                  <strong style={{ fontSize: 14, color: '#92400e' }}>Avertissement légal</strong>
                  <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.7, marginTop: 6 }}>
                    Les informations fournies par cette plateforme sont à titre informatif uniquement.
                    Elles ne constituent pas un conseil juridique. En cas de litige ou de question engageant
                    vos droits, consultez un professionnel du droit ou contactez directement l'ARMP.
                    Le portail officiel <a href="https://armp.cm" target="_blank" rel="noreferrer" style={{ color: '#1B3A6B', fontWeight: 700 }}>armp.cm</a> fait foi.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {LEGAL_ARTICLES.map((art, i) => (
                <div key={i} className="about-card" style={s.card}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div className="about-legal-icon" style={{ width: 48, height: 48, borderRadius: 12, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Scale size={22} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ background: '#1B3A6B', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{art.ref}</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{art.date}</span>
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1B3A6B', marginBottom: 6 }}>{art.title}</h3>
                      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 }}>{art.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="about-card" style={{ ...s.card, marginTop: 20, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac' }}>
              <h2 style={{ ...s.cardTitle, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={18} />Conditions d'utilisation</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Cette plateforme est un outil académique sans affiliation officielle avec l\'ARMP.',
                  'Les données sont mises à jour automatiquement depuis armp.cm et peuvent présenter des délais de jusqu\'à 1 heure.',
                  'L\'utilisation de l\'assistant IA est soumise à un usage raisonnable et non commercial.',
                  'La création d\'un compte est gratuite et ouverte à tous les citoyens camerounais.',
                  'Toute tentative d\'exploitation frauduleuse ou de perturbation du service est interdite.',
                  'Les documents générés par l\'IA doivent être vérifiés et validés par un professionnel avant usage officiel.',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#007A5E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <span style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ CONFIDENTIALITÉ ════ */}
        {tab === 'confidential' && (
          <div className="tab-content">
            <div className="about-card" style={s.card}>
              <h2 style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={18} />Politique de confidentialité</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Dernière mise à jour : Juin 2026</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {[
                  {
                    icon: Mail,
                    title: 'Données collectées',
                    content: 'Lors de l\'inscription, nous collectons votre nom complet, adresse email, numéro de téléphone (optionnel), région et secteurs d\'activité. Ces données sont nécessaires pour personnaliser votre expérience et envoyer les alertes de veille.',
                  },
                  {
                    icon: Lock,
                    title: 'Sécurité des données',
                    content: 'Les mots de passe sont hachés avec l\'algorithme bcrypt (facteur de coût 12). Les communications sont chiffrées via HTTPS. Les tokens JWT expirent après 24 heures. Aucune donnée de carte bancaire n\'est collectée.',
                  },
                  {
                    icon: Ban,
                    title: 'Aucun partage avec des tiers',
                    content: 'Vos données personnelles ne sont jamais vendues, louées ou partagées avec des tiers à des fins commerciales. Les données peuvent être utilisées anonymisées à des fins de recherche académique.',
                  },
                  {
                    icon: MessageCircle,
                    title: 'Conversations avec l\'IA',
                    content: 'Les conversations avec l\'assistant IA sont enregistrées pour améliorer la qualité du service et à des fins d\'analyse académique. Les contenus sont anonymisés avant tout traitement analytique.',
                  },
                  {
                    icon: Trash2,
                    title: 'Suppression des données',
                    content: 'Vous pouvez demander la suppression de votre compte et de toutes vos données à tout moment en contactant l\'équipe via la page Contact. Les données seront supprimées dans un délai de 30 jours.',
                  },
                  {
                    icon: Cookie,
                    title: 'Cookies et stockage local',
                    content: 'Nous utilisons le localStorage du navigateur pour stocker votre token d\'authentification JWT. Aucun cookie de tracking ou de publicité n\'est utilisé.',
                  },
                ].map(({ icon: Icon, title, content }) => (
                  <div key={title} style={{ display: 'flex', gap: 16, paddingBottom: 20, borderBottom: '1px solid #f0f4f8' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={20} /></div>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1B3A6B', marginBottom: 6 }}>{title}</h3>
                      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 }}>{content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ CONTACT ════ */}
        {tab === 'contact' && (
          <div className="tab-content">
            <div className="about-grid2" style={s.grid2}>
              <div className="about-card" style={s.card}>
                <h2 style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={18} />Nous contacter</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { icon: GraduationCap, label: 'Projet académique', val: 'DUT Informatique — IUT Douala', sub: 'Université de Douala, Cameroun' },
                    { icon: Mail, label: 'Email du projet', val: 'marche-ia@iut-douala.cm', sub: 'Réponse sous 48h ouvrées' },
                    { icon: Landmark, label: 'ARMP — Réclamations officielles', val: '+237 222 22 33 14', sub: 'Lundi–Vendredi, 7h30–15h30' },
                    { icon: Globe, label: 'Portail officiel ARMP', val: 'armp.cm', sub: 'Source officielle des marchés publics', link: 'https://armp.cm' },
                  ].map(({ icon: Icon, label, val, sub, link }) => (
                    <div key={label} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8eef8' }}>
                      <span style={{ flexShrink: 0 }}><Icon size={22} /></span>
                      <div>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
                        {link
                          ? <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700, color: '#1B3A6B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{val} <ArrowUpRight size={14} /></a>
                          : <div style={{ fontSize: 14, fontWeight: 700, color: '#1B3A6B' }}>{val}</div>
                        }
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="about-card" style={{ ...s.card, background: 'linear-gradient(135deg, #1B3A6B, #0d2247)', color: '#fff' }}>
                  <h2 style={{ ...s.cardTitle, color: '#FCD116', display: 'flex', alignItems: 'center', gap: 8 }}><Rocket size={18} />Contribuer au projet</h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 16 }}>
                    Ce projet est académique et open-source. Si vous souhaitez contribuer, signaler un bug ou proposer une amélioration, vous êtes les bienvenus.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: Bug, label: 'Signaler un bug', to: '/reclamations' },
                      { icon: Lightbulb, label: 'Proposer une fonctionnalité', to: '/reclamations' },
                      { icon: AlertTriangle, label: 'Signaler une irrégularité ARMP', to: '/reclamations' },
                    ].map(({ icon: Icon, label, to }) => (
                      <Link key={label} to={to} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 14px', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'background .15s' }}>
                        <Icon size={16} />{label} <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="about-card" style={s.card}>
                  <h2 style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><Landmark size={18} />Contacts ARMP officiels</h2>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 2 }}>
                    <strong style={{ color: '#1B3A6B' }}>Siège ARMP Yaoundé</strong><br />
                    Immeuble MINMAP, Rue Njo-Njo<br />
                    B.P. 6831 Yaoundé — Cameroun<br /><br />
                    <strong style={{ color: '#1B3A6B' }}>Téléphone</strong> : +237 222 22 33 14<br />
                    <strong style={{ color: '#1B3A6B' }}>Email</strong> : contact@armp.cm<br />
                    <strong style={{ color: '#1B3A6B' }}>Web</strong> : <a href="https://armp.cm" target="_blank" rel="noreferrer" style={{ color: '#CE1126' }}>armp.cm</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', -apple-system, sans-serif" },
  hero: {
    background: 'linear-gradient(135deg, #1B3A6B 0%, #0d2247 60%, #091830 100%)',
    padding: '56px 24px 48px', position: 'relative', overflow: 'hidden',
  },
  heroInner: { maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px', fontSize: 11, color: '#FCD116', fontWeight: 700 },
  heroTitle: { fontSize: 'clamp(22px,4vw,34px)', fontWeight: 800, color: '#fff', margin: '12px 0 10px', lineHeight: 1.2 },
  heroSub: { color: 'rgba(255,255,255,0.72)', fontSize: 14, maxWidth: 620, lineHeight: 1.7 },
  heroBtn: { background: '#CE1126', color: '#fff', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block' },
  heroBtnOutline: { background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' },
  statsBand: { background: '#fff', borderBottom: '1px solid #e8eef8', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0 },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 32px', borderRight: '1px solid #f0f4f8' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: 800, color: '#1B3A6B' },
  statLbl: { fontSize: 10, color: '#888', fontWeight: 600, marginTop: 2, textAlign: 'center' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 16px 64px' },
  tabs: { display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' },
  card: { background: '#fff', borderRadius: 14, padding: '24px 22px', boxShadow: '0 2px 10px rgba(27,58,107,0.06)' },
  cardTitle: { fontSize: 16, fontWeight: 800, color: '#1B3A6B', marginBottom: 14 },
  cardText: { fontSize: 13, color: '#555', lineHeight: 1.75, marginBottom: 0 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 },
};
