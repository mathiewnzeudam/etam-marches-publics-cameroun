#!/bin/bash
# ============================================================
#  Marché-IA Cameroun — Reset complet de la base
#  Usage : bash scripts/reset_database.sh
#  ⚠️  SUPPRIME TOUTES LES DONNÉES
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

CONTAINER="marche_ia_postgres"
DB_NAME="marche_ia_db"
DB_USER="marche_ia"

echo ""
echo -e "${BOLD}${RED}⚠️  ATTENTION — RESET COMPLET DE LA BASE DE DONNÉES${NC}"
echo -e "${RED}   Toutes les données seront supprimées définitivement.${NC}"
echo ""
read -p "Taper 'RESET' pour confirmer : " CONFIRM

if [ "$CONFIRM" != "RESET" ]; then
    echo -e "${YELLOW}Annulé.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Suppression des tables dans l'ordre inverse des FK...${NC}"

docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
-- Ordre inverse des dépendances FK
DROP TABLE IF EXISTS audit_logs       CASCADE;
DROP TABLE IF EXISTS sync_jobs        CASCADE;
DROP TABLE IF EXISTS knowledge_chunks CASCADE;
DROP TABLE IF EXISTS documents        CASCADE;
DROP TABLE IF EXISTS alert_matches    CASCADE;
DROP TABLE IF EXISTS alerts           CASCADE;
DROP TABLE IF EXISTS messages         CASCADE;
DROP TABLE IF EXISTS conversations    CASCADE;
DROP TABLE IF EXISTS tenders          CASCADE;
DROP TABLE IF EXISTS users            CASCADE;

-- Supprimer les vues
DROP VIEW IF EXISTS v_dashboard_public CASCADE;
DROP VIEW IF EXISTS v_tenders_urgent   CASCADE;
DROP VIEW IF EXISTS v_sync_health      CASCADE;
DROP VIEW IF EXISTS v_ai_usage         CASCADE;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS set_updated_at()            CASCADE;
DROP FUNCTION IF EXISTS validate_user_role()        CASCADE;
DROP FUNCTION IF EXISTS validate_tender_status()    CASCADE;
DROP FUNCTION IF EXISTS auto_close_expired_tenders() CASCADE;
DROP FUNCTION IF EXISTS get_user_stats(UUID)        CASCADE;

SELECT 'Base remise à zéro.' AS status;
"

echo -e "${GREEN}✓ Base remise à zéro.${NC}"
echo ""
echo -e "Reconstruire : ${BOLD}bash scripts/build_database.sh${NC}"
echo ""
