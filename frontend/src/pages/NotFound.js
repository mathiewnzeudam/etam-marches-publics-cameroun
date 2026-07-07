import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home as HomeIcon } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={s.page}>
      <Compass size={56} color="#1B3A6B" style={{ opacity: 0.5 }} />
      <div style={s.code}>404</div>
      <h1 style={s.title}>Page introuvable</h1>
      <p style={s.desc}>La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <div style={s.actions}>
        <button style={s.btnOutline} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Retour
        </button>
        <Link to="/" style={s.btnPrimary}>
          <HomeIcon size={16} /> Accueil
        </Link>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '60vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    padding: '60px 24px',
  },
  code: { fontSize: 56, fontWeight: 900, color: '#1B3A6B', marginTop: 16, lineHeight: 1 },
  title: { fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginTop: 8, marginBottom: 6 },
  desc: { fontSize: 14, color: '#666', marginBottom: 28, maxWidth: 400 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: '#fff', color: '#1B3A6B', border: '1.5px solid #dde3f0',
    padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: '#1B3A6B', color: '#fff', border: 'none',
    padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
  },
};
