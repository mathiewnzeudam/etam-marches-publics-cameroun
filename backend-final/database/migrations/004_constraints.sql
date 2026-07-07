-- ============================================================
--  Marché-IA Cameroun
--  Migration 004 — Contraintes métier (CHECK)
--  Règles de validation directement en base de données
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  TABLE : users — contraintes
-- ────────────────────────────────────────────────────────────

-- Email doit contenir un @
ALTER TABLE users
    ADD CONSTRAINT chk_users_email_format
    CHECK (email LIKE '%@%');

-- Rôle doit être valide
ALTER TABLE users
    ADD CONSTRAINT chk_users_role
    CHECK (role IN ('citizen', 'company', 'authority', 'institution', 'admin'));

-- Numéro de téléphone Cameroun (optionnel mais si présent, format +237...)
ALTER TABLE users
    ADD CONSTRAINT chk_users_phone_format
    CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{8,15}$');


-- ────────────────────────────────────────────────────────────
--  TABLE : tenders — contraintes
-- ────────────────────────────────────────────────────────────

-- Statut valide
ALTER TABLE tenders
    ADD CONSTRAINT chk_tenders_status
    CHECK (status IN ('open', 'closed', 'awarded', 'cancelled', 'infructuous'));

-- Type de procédure valide
ALTER TABLE tenders
    ADD CONSTRAINT chk_tenders_procedure_type
    CHECK (procedure_type IS NULL OR
           procedure_type IN ('AONO', 'AOIO', 'AOR', 'DC', 'gre_a_gre', 'AMI', 'DDP'));

-- Montant positif si renseigné
ALTER TABLE tenders
    ADD CONSTRAINT chk_tenders_amount_positive
    CHECK (estimated_amount IS NULL OR estimated_amount > 0);

-- La deadline ne peut pas être avant la date de publication
ALTER TABLE tenders
    ADD CONSTRAINT chk_tenders_dates_coherent
    CHECK (deadline IS NULL OR publication_date IS NULL OR deadline >= publication_date);

-- Région doit être une des 10 régions du Cameroun (si renseignée)
ALTER TABLE tenders
    ADD CONSTRAINT chk_tenders_region
    CHECK (region IS NULL OR region IN (
        'Adamaoua', 'Centre', 'Est', 'Extrême-Nord',
        'Littoral', 'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest'
    ));


-- ────────────────────────────────────────────────────────────
--  TABLE : messages — contraintes
-- ────────────────────────────────────────────────────────────

-- Rôle valide
ALTER TABLE messages
    ADD CONSTRAINT chk_messages_role
    CHECK (role IN ('user', 'assistant', 'system'));

-- Feedback dans la plage autorisée
ALTER TABLE messages
    ADD CONSTRAINT chk_messages_feedback
    CHECK (feedback IS NULL OR feedback IN (-1, 0, 1));

-- Tokens non négatifs
ALTER TABLE messages
    ADD CONSTRAINT chk_messages_tokens_positive
    CHECK (
        (tokens_input IS NULL OR tokens_input >= 0) AND
        (tokens_output IS NULL OR tokens_output >= 0)
    );

-- Latence positive
ALTER TABLE messages
    ADD CONSTRAINT chk_messages_latency_positive
    CHECK (latency_ms IS NULL OR latency_ms >= 0);


-- ────────────────────────────────────────────────────────────
--  TABLE : alerts — contraintes
-- ────────────────────────────────────────────────────────────

-- Canal valide
ALTER TABLE alerts
    ADD CONSTRAINT chk_alerts_channel
    CHECK (channel IN ('in_app', 'email', 'whatsapp', 'all'));

-- Montant min < montant max (si les deux sont renseignés)
ALTER TABLE alerts
    ADD CONSTRAINT chk_alerts_amounts_coherent
    CHECK (
        min_amount IS NULL OR
        max_amount IS NULL OR
        min_amount <= max_amount
    );

-- Montants positifs
ALTER TABLE alerts
    ADD CONSTRAINT chk_alerts_amounts_positive
    CHECK (
        (min_amount IS NULL OR min_amount >= 0) AND
        (max_amount IS NULL OR max_amount >= 0)
    );


-- ────────────────────────────────────────────────────────────
--  TABLE : alert_matches — contraintes
-- ────────────────────────────────────────────────────────────

-- Score entre 0 et 1
ALTER TABLE alert_matches
    ADD CONSTRAINT chk_matches_score_range
    CHECK (score IS NULL OR (score >= 0.0 AND score <= 1.0));


-- ────────────────────────────────────────────────────────────
--  TABLE : documents — contraintes
-- ────────────────────────────────────────────────────────────

-- Type de document valide
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_type
    CHECK (type IN (
        'submission_letter', 'technical_offer', 'financial_offer',
        'qualification_file', 'recourse', 'contract_draft'
    ));

-- Statut valide
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_status
    CHECK (status IN ('draft', 'finalized', 'submitted'));

-- Version positive
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_version_positive
    CHECK (version >= 1);


-- ────────────────────────────────────────────────────────────
--  TABLE : conversations — contraintes
-- ────────────────────────────────────────────────────────────

-- Statut valide
ALTER TABLE conversations
    ADD CONSTRAINT chk_conversations_status
    CHECK (status IN ('active', 'archived', 'deleted'));


-- ────────────────────────────────────────────────────────────
--  TABLE : sync_jobs — contraintes
-- ────────────────────────────────────────────────────────────

-- Statut valide
ALTER TABLE sync_jobs
    ADD CONSTRAINT chk_sync_jobs_status
    CHECK (status IN ('running', 'success', 'failed'));

-- Source valide
ALTER TABLE sync_jobs
    ADD CONSTRAINT chk_sync_jobs_source
    CHECK (source IN ('armp_feed', 'coleps_api', 'manual'));

-- Records non négatif
ALTER TABLE sync_jobs
    ADD CONSTRAINT chk_sync_jobs_records_positive
    CHECK (records_synced >= 0);


-- ────────────────────────────────────────────────────────────
--  VÉRIFICATION — Affiche toutes les contraintes
-- ────────────────────────────────────────────────────────────
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'PRIMARY KEY', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
