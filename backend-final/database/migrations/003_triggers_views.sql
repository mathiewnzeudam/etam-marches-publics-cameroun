-- ============================================================
--  Marché-IA Cameroun
--  Migration 003 — Triggers, fonctions et vues
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  FONCTION : set_updated_at
--  Met à jour automatiquement le champ updated_at
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur users
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Trigger sur conversations
DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Trigger sur documents
DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
--  FONCTION : validate_user_role
--  Vérifie que le rôle est dans la liste autorisée
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role NOT IN ('citizen', 'company', 'authority', 'institution', 'admin') THEN
        RAISE EXCEPTION 'Rôle invalide: %. Valeurs autorisées: citizen, company, authority, institution, admin', NEW.role;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_user_role ON users;
CREATE TRIGGER trg_validate_user_role
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_role();


-- ────────────────────────────────────────────────────────────
--  FONCTION : validate_tender_status
--  Vérifie que le statut du marché est valide
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_tender_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status NOT IN ('open', 'closed', 'awarded', 'cancelled', 'infructuous') THEN
        RAISE EXCEPTION 'Statut invalide: %. Valeurs: open, closed, awarded, cancelled, infructuous', NEW.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_tender_status ON tenders;
CREATE TRIGGER trg_validate_tender_status
    BEFORE INSERT OR UPDATE ON tenders
    FOR EACH ROW
    EXECUTE FUNCTION validate_tender_status();


-- ────────────────────────────────────────────────────────────
--  FONCTION : auto_close_expired_tenders
--  Ferme automatiquement les marchés dont la deadline est passée
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_close_expired_tenders()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE tenders
    SET status = 'closed'
    WHERE status = 'open'
      AND deadline < CURRENT_DATE
      AND deadline IS NOT NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Appel manuel : SELECT auto_close_expired_tenders();
-- À planifier via pg_cron ou appelé par le worker Celery


-- ────────────────────────────────────────────────────────────
--  FONCTION : get_user_stats
--  Statistiques d'un utilisateur en une seule requête
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_conversations  BIGINT,
    total_messages       BIGINT,
    total_documents      BIGINT,
    total_alerts         BIGINT,
    active_alerts        BIGINT,
    tokens_used          BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM conversations WHERE user_id = p_user_id AND status = 'active'),
        (SELECT COUNT(*) FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.user_id = p_user_id),
        (SELECT COUNT(*) FROM documents WHERE user_id = p_user_id),
        (SELECT COUNT(*) FROM alerts WHERE user_id = p_user_id),
        (SELECT COUNT(*) FROM alerts WHERE user_id = p_user_id AND active = TRUE),
        (SELECT COALESCE(SUM(tokens_input + tokens_output), 0) FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Usage : SELECT * FROM get_user_stats('uuid-utilisateur');


-- ────────────────────────────────────────────────────────────
--  VUE : v_dashboard_public
--  Données agrégées pour le tableau de bord public
--  Accessible sans authentification
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_dashboard_public AS
SELECT
    COALESCE(sector, 'Non classifié')        AS sector,
    COALESCE(region, 'Non précisé')          AS region,
    COALESCE(procedure_type, 'Non précisé')  AS procedure_type,
    status,
    COUNT(*)                                 AS total_tenders,
    SUM(estimated_amount)                    AS total_amount_fcfa,
    AVG(estimated_amount)                    AS avg_amount_fcfa,
    COUNT(*) FILTER (WHERE status = 'open')       AS open_tenders,
    COUNT(*) FILTER (WHERE status = 'awarded')    AS awarded_tenders,
    COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled_tenders,
    MIN(publication_date)                    AS oldest_publication,
    MAX(publication_date)                    AS latest_publication
FROM tenders
GROUP BY sector, region, procedure_type, status;

COMMENT ON VIEW v_dashboard_public IS 'Agrégats publics pour le tableau de bord de transparence — sans données personnelles';


-- ────────────────────────────────────────────────────────────
--  VUE : v_tenders_urgent
--  Marchés dont la deadline est dans moins de 7 jours
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_tenders_urgent AS
SELECT
    id,
    reference,
    title,
    authority,
    sector,
    region,
    estimated_amount,
    deadline,
    (deadline - CURRENT_DATE) AS days_remaining
FROM tenders
WHERE status = 'open'
  AND deadline IS NOT NULL
  AND deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
ORDER BY deadline ASC;

COMMENT ON VIEW v_tenders_urgent IS 'Marchés urgents dont la deadline est dans 7 jours ou moins';


-- ────────────────────────────────────────────────────────────
--  VUE : v_sync_health
--  État de santé des synchronisations ARMP
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_sync_health AS
SELECT
    source,
    COUNT(*)                                           AS total_syncs,
    COUNT(*) FILTER (WHERE status = 'success')         AS success_count,
    COUNT(*) FILTER (WHERE status = 'failed')          AS failed_count,
    SUM(records_synced)                                AS total_records,
    MAX(finished_at) FILTER (WHERE status = 'success') AS last_success_at,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0),
        1
    )                                                  AS success_rate_pct
FROM sync_jobs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY source;

COMMENT ON VIEW v_sync_health IS 'Santé des synchronisations ARMP sur les 30 derniers jours';


-- ────────────────────────────────────────────────────────────
--  VUE : v_ai_usage
--  Métriques d'utilisation de l'IA (admin)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_ai_usage AS
SELECT
    DATE_TRUNC('day', m.created_at)      AS day,
    COUNT(*)                             AS total_messages,
    COUNT(*) FILTER (WHERE m.role = 'assistant') AS ai_responses,
    SUM(m.tokens_input)                  AS tokens_in,
    SUM(m.tokens_output)                 AS tokens_out,
    SUM(m.tokens_input + m.tokens_output) AS tokens_total,
    AVG(m.latency_ms)                    AS avg_latency_ms,
    COUNT(*) FILTER (WHERE m.feedback = 1)  AS positive_feedback,
    COUNT(*) FILTER (WHERE m.feedback = -1) AS negative_feedback,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE m.feedback = 1)
        / NULLIF(COUNT(*) FILTER (WHERE m.feedback IS NOT NULL), 0),
        1
    )                                    AS satisfaction_rate_pct
FROM messages m
GROUP BY DATE_TRUNC('day', m.created_at)
ORDER BY day DESC;

COMMENT ON VIEW v_ai_usage IS 'Métriques IA par jour — tokens, latence, satisfaction';


-- ────────────────────────────────────────────────────────────
--  VÉRIFICATION FINALE
-- ────────────────────────────────────────────────────────────
SELECT 'Triggers créés:' AS info, COUNT(*) AS count
FROM information_schema.triggers
WHERE trigger_schema = 'public';

SELECT 'Vues créées:' AS info, COUNT(*) AS count
FROM information_schema.views
WHERE table_schema = 'public';

SELECT 'Fonctions créées:' AS info, COUNT(*) AS count
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
