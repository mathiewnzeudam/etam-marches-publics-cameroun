-- ============================================================
--  Migration 005 — Table réclamations
-- ============================================================

CREATE TABLE IF NOT EXISTS reclamations (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Référence unique lisible (ex: RECL/2026/12345)
    reference        TEXT         UNIQUE NOT NULL,

    -- Auteur (optionnel si anonyme)
    user_id          UUID         REFERENCES users(id) ON DELETE SET NULL,

    -- Identité du plaignant (peut être différent du user connecté)
    plaignant_nom    TEXT,
    plaignant_email  TEXT,
    plaignant_phone  TEXT,
    plaignant_region TEXT,
    is_anonyme       BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Classification
    type             TEXT         NOT NULL,
    -- exclusion | specification | evaluation | attribution | corruption | delai | autre

    statut           TEXT         NOT NULL DEFAULT 'soumise',
    -- soumise | en_instruction | resolue | rejetee | classee

    -- Marché concerné (optionnel)
    tender_id        UUID         REFERENCES tenders(id) ON DELETE SET NULL,
    marche_reference TEXT,
    autorite_name    TEXT,
    region           TEXT,

    -- Contenu
    description      TEXT         NOT NULL,
    preuves          JSONB        NOT NULL DEFAULT '[]',
    -- Liste de {nom, type, url} pour les pièces jointes

    -- Traitement
    traite_par       UUID         REFERENCES users(id) ON DELETE SET NULL,
    note_interne     TEXT,
    decision         TEXT,
    traite_at        TIMESTAMPTZ,

    -- Timestamps
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reclamations_user_id   ON reclamations(user_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_tender_id ON reclamations(tender_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_statut    ON reclamations(statut);
CREATE INDEX IF NOT EXISTS idx_reclamations_type      ON reclamations(type);
CREATE INDEX IF NOT EXISTS idx_reclamations_created   ON reclamations(created_at DESC);

COMMENT ON TABLE  reclamations              IS 'Réclamations et recours soumis par les utilisateurs contre des irrégularités';
COMMENT ON COLUMN reclamations.reference    IS 'Identifiant lisible format RECL/YYYY/NNNNN';
COMMENT ON COLUMN reclamations.type         IS 'exclusion | specification | evaluation | attribution | corruption | delai | autre';
COMMENT ON COLUMN reclamations.statut       IS 'soumise | en_instruction | resolue | rejetee | classee';
COMMENT ON COLUMN reclamations.preuves      IS 'Liste JSON de pièces jointes {nom, type, url}';
