-- ============================================================
--  Marché-IA Cameroun
--  Migration 001 — Création des tables
--  Ordre : respecter les dépendances (FK)
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : users                                          │
-- │  Comptes de tous les utilisateurs de la plateforme      │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS users (
    -- Identifiant unique auto-généré
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Authentification
    email            TEXT         UNIQUE NOT NULL,
    full_name        TEXT         NOT NULL,
    hashed_password  TEXT         NOT NULL,       -- bcrypt, jamais en clair
    phone            TEXT,                         -- format +237XXXXXXXXX

    -- Profil métier
    role             TEXT         NOT NULL DEFAULT 'citizen',
    -- Valeurs autorisées : citizen | company | authority | institution | admin
    organization     TEXT,                         -- nom de l'entreprise/institution
    region           TEXT,                         -- 1 des 10 régions du Cameroun
    sectors          TEXT[]       DEFAULT '{}',    -- ex: {'travaux','fournitures','IT'}

    -- État du compte
    is_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Préférences libres (langue, thème, notifications...)
    preferences      JSONB        NOT NULL DEFAULT '{}',

    -- Horodatages
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login       TIMESTAMPTZ
);

COMMENT ON TABLE  users                  IS 'Comptes utilisateurs de la plateforme Marché-IA';
COMMENT ON COLUMN users.role             IS 'citizen | company | authority | institution | admin';
COMMENT ON COLUMN users.sectors          IS 'Secteurs déclarés ex: {travaux, fournitures, informatique}';
COMMENT ON COLUMN users.hashed_password  IS 'Hash bcrypt — le mot de passe en clair nest jamais stocké';
COMMENT ON COLUMN users.preferences      IS 'JSON libre: langue, notifications, thème...';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : tenders                                        │
-- │  Appels d'offres synchronisés depuis l'ARMP/COLEPS      │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS tenders (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification officielle
    external_id       TEXT         UNIQUE,         -- ID source ARMP/COLEPS
    reference         TEXT         NOT NULL,        -- ex: 007/AONO/MINEE/2026
    title             TEXT         NOT NULL,
    authority         TEXT         NOT NULL,        -- maître d'ouvrage

    -- Classification
    sector            TEXT,                         -- travaux | fournitures | services | IT | santé...
    region            TEXT,                         -- région Cameroun
    procedure_type    TEXT,
    -- AONO | AOIO | AOR | DC | gre_a_gre | AMI | DDP

    -- Données financières
    estimated_amount  BIGINT,                       -- montant en FCFA

    -- Dates clés
    publication_date  DATE,
    deadline          DATE,                         -- date limite de soumission

    -- État
    status            TEXT         NOT NULL DEFAULT 'open',
    -- open | closed | awarded | cancelled | infructuous

    -- Contenu
    description       TEXT,
    source_url        TEXT,
    raw_data          JSONB,                        -- données brutes ARMP conservées

    -- Synchronisation
    synced_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tenders                  IS 'Appels d offres synchronisés automatiquement depuis ARMP et COLEPS';
COMMENT ON COLUMN tenders.external_id      IS 'Identifiant unique côté ARMP — évite les doublons lors des syncs';
COMMENT ON COLUMN tenders.reference        IS 'Référence officielle ex: 007/AONO/MINEE/2026';
COMMENT ON COLUMN tenders.estimated_amount IS 'Montant en FCFA (Francs CFA)';
COMMENT ON COLUMN tenders.raw_data         IS 'Données brutes originales ARMP pour traçabilité';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : conversations                                  │
-- │  Sessions de chat avec l'assistant IA                   │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT         NOT NULL DEFAULT 'Nouvelle conversation',
    -- Auto-généré à partir du 1er message
    status      TEXT         NOT NULL DEFAULT 'active',
    -- active | archived | deleted
    metadata    JSONB        NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  conversations        IS 'Sessions de chat utilisateur ↔ assistant IA';
COMMENT ON COLUMN conversations.title  IS 'Titre auto-généré à partir des 60 premiers caractères du 1er message';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : messages                                       │
-- │  Messages individuels dans une conversation             │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS messages (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id  UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Contenu
    role             TEXT         NOT NULL,
    -- user (question) | assistant (réponse IA) | system
    content          TEXT         NOT NULL,

    -- Sources citées par l'IA (articles de loi)
    sources          JSONB,
    -- [{rank, source_name, article_ref, content_snippet, score, source_type}]

    -- Métriques d'utilisation Claude API
    tokens_input     INTEGER,                      -- tokens de la question + contexte
    tokens_output    INTEGER,                      -- tokens de la réponse générée
    model_used       TEXT,                         -- ex: claude-sonnet-4-6
    latency_ms       FLOAT,                        -- temps de génération en ms

    -- Évaluation utilisateur
    feedback         SMALLINT,
    -- -1 (mauvaise réponse) | 0 (neutre) | 1 (bonne réponse)

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  messages             IS 'Messages de conversation — questions utilisateurs et réponses IA';
COMMENT ON COLUMN messages.sources     IS 'Articles du Code des marchés cités par lIA, avec scores de pertinence';
COMMENT ON COLUMN messages.feedback    IS '-1 mauvais | 0 neutre | 1 bon — sert à améliorer le système';
COMMENT ON COLUMN messages.latency_ms  IS 'Temps de génération Claude en millisecondes — monitoring performance';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : alerts                                         │
-- │  Préférences de veille personnalisées                   │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS alerts (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identification
    name        TEXT         NOT NULL DEFAULT 'Ma veille',

    -- Critères de filtrage
    sectors     TEXT[]       NOT NULL DEFAULT '{}',
    regions     TEXT[]       NOT NULL DEFAULT '{}',
    keywords    TEXT[]       NOT NULL DEFAULT '{}',   -- mots-clés dans le titre
    min_amount  BIGINT,                                -- montant minimum FCFA
    max_amount  BIGINT,                                -- montant maximum FCFA

    -- Notification
    channel     TEXT         NOT NULL DEFAULT 'in_app',
    -- in_app | email | whatsapp | all

    -- État
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    last_fired  TIMESTAMPTZ,                           -- dernière notification envoyée

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  alerts             IS 'Alertes de veille personnalisées — déclenchées par le worker Celery';
COMMENT ON COLUMN alerts.sectors     IS 'Secteurs surveillés ex: {travaux, informatique}';
COMMENT ON COLUMN alerts.keywords    IS 'Mots-clés recherchés dans les titres de marchés';
COMMENT ON COLUMN alerts.channel     IS 'Canal de notification: in_app | email | whatsapp | all';
COMMENT ON COLUMN alerts.last_fired  IS 'Horodatage du dernier déclenchement pour affichage UI';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : alert_matches                                  │
-- │  Correspondances alerte ↔ marché (dédoublonnage)        │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS alert_matches (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id     UUID         NOT NULL REFERENCES alerts(id)  ON DELETE CASCADE,
    tender_id    UUID         NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    score        FLOAT,                             -- pertinence 0.0 à 1.0
    notified     BOOLEAN      NOT NULL DEFAULT FALSE,
    notified_at  TIMESTAMPTZ,

    matched_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Contrainte clé : impossible de notifier deux fois le même couple
    UNIQUE (alert_id, tender_id)
);

COMMENT ON TABLE  alert_matches          IS 'Table de jonction alertes ↔ marchés — évite les doublons de notification';
COMMENT ON COLUMN alert_matches.score    IS 'Score de pertinence du matching (0 à 1)';
COMMENT ON COLUMN alert_matches.notified IS 'FALSE = notification en attente | TRUE = déjà envoyée';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : documents                                      │
-- │  Documents générés par l'IA pour les utilisateurs       │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS documents (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    tender_id   UUID                  REFERENCES tenders(id)  ON DELETE SET NULL,
    -- SET NULL : le document reste si le marché est supprimé

    -- Classification
    type        TEXT         NOT NULL,
    -- submission_letter | technical_offer | financial_offer
    -- qualification_file | recourse | contract_draft

    title       TEXT         NOT NULL,
    content     TEXT         NOT NULL,             -- texte complet généré

    -- Paramètres utilisés lors de la génération
    metadata    JSONB        NOT NULL DEFAULT '{}',
    -- {company_name, representative, tokens, generated_at, ...}

    -- Cycle de vie
    status      TEXT         NOT NULL DEFAULT 'draft',
    -- draft | finalized | submitted
    version     INTEGER      NOT NULL DEFAULT 1,

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  documents          IS 'Documents générés par IA conformes au Code des marchés publics';
COMMENT ON COLUMN documents.type     IS 'submission_letter | technical_offer | financial_offer | qualification_file | recourse | contract_draft';
COMMENT ON COLUMN documents.metadata IS 'Paramètres de génération: nom entreprise, représentant, tokens consommés...';
COMMENT ON COLUMN documents.version  IS 'Incrément à chaque régénération du même document';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : knowledge_chunks                               │
-- │  Index textuel des données ingérées dans Qdrant         │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type  TEXT         NOT NULL,
    -- code_marches | guide_coleps | circulaire | texte_application
    source_name  TEXT         NOT NULL,             -- ex: Décret n°2018/366
    article_ref  TEXT,                              -- ex: Article 48, Section III.9
    content      TEXT         NOT NULL,             -- texte du chunk
    qdrant_id    TEXT         UNIQUE,               -- ID dans Qdrant (sync)
    token_count  INTEGER,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  knowledge_chunks            IS 'Index textuel des chunks indexés dans Qdrant — permet recherche SQL complémentaire';
COMMENT ON COLUMN knowledge_chunks.qdrant_id  IS 'Identifiant du vecteur dans Qdrant — permet de supprimer/mettre à jour';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : audit_logs                                     │
-- │  Traçabilité complète de toutes les actions             │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID                  REFERENCES users(id) ON DELETE SET NULL,
    -- SET NULL : les logs restent même si l'utilisateur est supprimé

    -- Action tracée
    action       TEXT         NOT NULL,
    -- auth.register | auth.login | chat.message | doc.generate
    -- alert.create | alert.update | alert.delete | doc.update...

    -- Entité concernée (optionnel)
    entity_type  TEXT,                              -- message | document | alert | tender
    entity_id    UUID,

    -- Contexte réseau
    ip_address   TEXT,
    user_agent   TEXT,

    metadata     JSONB        NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  audit_logs          IS 'Journal de toutes les actions importantes — sécurité et conformité';
COMMENT ON COLUMN audit_logs.action   IS 'Format: entité.action ex: auth.login, chat.message, doc.generate';
COMMENT ON COLUMN audit_logs.metadata IS 'Données contextuelles variables selon laction';


-- ┌─────────────────────────────────────────────────────────┐
-- │  TABLE : sync_jobs                                      │
-- │  Historique des synchronisations ARMP/COLEPS            │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS sync_jobs (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          TEXT         NOT NULL,          -- armp_feed | coleps_api
    status          TEXT         NOT NULL,          -- running | success | failed
    records_synced  INTEGER      DEFAULT 0,         -- nb de nouveaux marchés
    error_message   TEXT,                           -- message d'erreur si failed
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

COMMENT ON TABLE  sync_jobs                 IS 'Historique des synchronisations automatiques ARMP/COLEPS';
COMMENT ON COLUMN sync_jobs.records_synced  IS 'Nombre de nouveaux marchés créés lors de cette sync';
COMMENT ON COLUMN sync_jobs.error_message   IS 'Détail de l erreur si status=failed';
