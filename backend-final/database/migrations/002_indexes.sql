-- ============================================================
--  Marché-IA Cameroun
--  Migration 002 — Index de performance
--  Optimise toutes les requêtes fréquentes
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : users
-- ────────────────────────────────────────────────────────────
-- Connexion par email (très fréquent)
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users (email);

-- Filtrage par rôle (admin panel)
CREATE INDEX IF NOT EXISTS idx_users_role
    ON users (role);

-- Filtrage par région (stats dashboard)
CREATE INDEX IF NOT EXISTS idx_users_region
    ON users (region);

-- Utilisateurs actifs uniquement (optimisation)
CREATE INDEX IF NOT EXISTS idx_users_active
    ON users (is_active)
    WHERE is_active = TRUE;


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : tenders
-- ────────────────────────────────────────────────────────────
-- Filtre le plus courant : marchés ouverts
CREATE INDEX IF NOT EXISTS idx_tenders_status
    ON tenders (status);

-- Filtrage par secteur
CREATE INDEX IF NOT EXISTS idx_tenders_sector
    ON tenders (sector);

-- Filtrage par région
CREATE INDEX IF NOT EXISTS idx_tenders_region
    ON tenders (region);

-- Tri par date de publication (tri par défaut)
CREATE INDEX IF NOT EXISTS idx_tenders_pub_date
    ON tenders (publication_date DESC);

-- Compte à rebours deadline (marchés urgents)
CREATE INDEX IF NOT EXISTS idx_tenders_deadline
    ON tenders (deadline)
    WHERE status = 'open';

-- Filtrage par type de procédure
CREATE INDEX IF NOT EXISTS idx_tenders_proc_type
    ON tenders (procedure_type);

-- Recherche full-text sur la référence (ex: 007/AONO...)
CREATE INDEX IF NOT EXISTS idx_tenders_reference_trgm
    ON tenders USING gin (reference gin_trgm_ops);

-- Recherche full-text sur le titre du marché
CREATE INDEX IF NOT EXISTS idx_tenders_title_trgm
    ON tenders USING gin (title gin_trgm_ops);

-- Tri par date de synchronisation (nouveaux marchés en premier)
CREATE INDEX IF NOT EXISTS idx_tenders_synced_at
    ON tenders (synced_at DESC);

-- Filtre montant (alertes avec fourchette de prix)
CREATE INDEX IF NOT EXISTS idx_tenders_amount
    ON tenders (estimated_amount)
    WHERE estimated_amount IS NOT NULL;

-- Index combiné : sector + region + status (requête la plus fréquente)
CREATE INDEX IF NOT EXISTS idx_tenders_sector_region_status
    ON tenders (sector, region, status);


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : conversations
-- ────────────────────────────────────────────────────────────
-- Conversations d'un utilisateur (sidebar)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id
    ON conversations (user_id);

-- Conversations actives uniquement
CREATE INDEX IF NOT EXISTS idx_conversations_active
    ON conversations (user_id, updated_at DESC)
    WHERE status = 'active';


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : messages
-- ────────────────────────────────────────────────────────────
-- Messages d'une conversation triés par date (chargement historique)
CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, created_at ASC);

-- Messages avec feedback négatif (monitoring qualité IA)
CREATE INDEX IF NOT EXISTS idx_messages_bad_feedback
    ON messages (feedback)
    WHERE feedback = -1;

-- Calcul coûts tokens par période
CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON messages (created_at DESC);


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : alerts
-- ────────────────────────────────────────────────────────────
-- Alertes d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_alerts_user_id
    ON alerts (user_id);

-- Alertes actives uniquement (requête du worker Celery toutes les heures)
CREATE INDEX IF NOT EXISTS idx_alerts_active
    ON alerts (active)
    WHERE active = TRUE;


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : alert_matches
-- ────────────────────────────────────────────────────────────
-- Notifications non encore envoyées (tâche worker)
CREATE INDEX IF NOT EXISTS idx_matches_pending
    ON alert_matches (alert_id, matched_at DESC)
    WHERE notified = FALSE;

-- Historique des notifications par alerte
CREATE INDEX IF NOT EXISTS idx_matches_alert_id
    ON alert_matches (alert_id);

-- Vérification doublon (is_notified)
CREATE INDEX IF NOT EXISTS idx_matches_alert_tender
    ON alert_matches (alert_id, tender_id);


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : documents
-- ────────────────────────────────────────────────────────────
-- Documents d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_documents_user_id
    ON documents (user_id);

-- Filtrage par type de document
CREATE INDEX IF NOT EXISTS idx_documents_type
    ON documents (type);

-- Filtrage par statut
CREATE INDEX IF NOT EXISTS idx_documents_status
    ON documents (status);

-- Documents liés à un marché
CREATE INDEX IF NOT EXISTS idx_documents_tender_id
    ON documents (tender_id)
    WHERE tender_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : knowledge_chunks
-- ────────────────────────────────────────────────────────────
-- Filtrage par type de source (Code des marchés vs Guide COLEPS...)
CREATE INDEX IF NOT EXISTS idx_chunks_source_type
    ON knowledge_chunks (source_type);

-- Recherche par référence d'article (Article 48...)
CREATE INDEX IF NOT EXISTS idx_chunks_article_ref
    ON knowledge_chunks (article_ref);

-- Recherche full-text en français sur le contenu
CREATE INDEX IF NOT EXISTS idx_chunks_content_fts
    ON knowledge_chunks USING gin (to_tsvector('french', content));

-- Synchronisation avec Qdrant
CREATE INDEX IF NOT EXISTS idx_chunks_qdrant_id
    ON knowledge_chunks (qdrant_id)
    WHERE qdrant_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : audit_logs
-- ────────────────────────────────────────────────────────────
-- Audit par utilisateur
CREATE INDEX IF NOT EXISTS idx_audit_user_id
    ON audit_logs (user_id);

-- Recherche par type d'action
CREATE INDEX IF NOT EXISTS idx_audit_action
    ON audit_logs (action);

-- Tri chronologique (purge des vieux logs)
CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON audit_logs (created_at DESC);


-- ────────────────────────────────────────────────────────────
--  INDEX TABLE : sync_jobs
-- ────────────────────────────────────────────────────────────
-- Dernière sync réussie (utilisé par le dashboard)
CREATE INDEX IF NOT EXISTS idx_sync_jobs_success
    ON sync_jobs (finished_at DESC)
    WHERE status = 'success';

-- Jobs échoués (monitoring)
CREATE INDEX IF NOT EXISTS idx_sync_jobs_failed
    ON sync_jobs (started_at DESC)
    WHERE status = 'failed';


-- ────────────────────────────────────────────────────────────
--  VÉRIFICATION
-- ────────────────────────────────────────────────────────────
-- Affiche tous les index créés
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
