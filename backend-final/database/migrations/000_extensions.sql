-- ============================================================
--  Marché-IA Cameroun
--  Migration 000 — Extensions PostgreSQL
--  À exécuter en premier, avec les droits superuser
-- ============================================================

-- Extension UUID (génération automatique d'identifiants uniques)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension recherche full-text (recherche partielle sur titres et références)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Extension statistiques étendues (optimisation requêtes complexes)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Vérification
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'pg_stat_statements')
ORDER BY extname;
