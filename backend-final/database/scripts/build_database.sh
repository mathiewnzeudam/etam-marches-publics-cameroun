#!/bin/bash
# ============================================================
#  Marché-IA Cameroun — Script de construction de la base
#  Usage : bash scripts/build_database.sh
# ============================================================

set -e  # Arrêt immédiat si une commande échoue

# ── Couleurs terminal ─────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Variables ─────────────────────────────────────────────────
DB_NAME="marche_ia_db"
DB_USER="marche_ia"
DB_PASS="secret"
DB_HOST="localhost"
DB_PORT="5432"
CONTAINER="marche_ia_postgres"

echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║   Marché-IA Cameroun — Construction Base de Données   ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Étape 0 : Vérifier Docker ─────────────────────────────────
echo -e "${YELLOW}[0/6] Vérification de Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas installé.${NC}"
    echo "  → Télécharger : https://www.docker.com/get-started"
    exit 1
fi
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas démarré.${NC}"
    echo "  → Lance Docker Desktop puis relance ce script."
    exit 1
fi
echo -e "${GREEN}✓ Docker disponible : $(docker --version)${NC}"

# ── Étape 1 : Démarrer PostgreSQL via Docker ──────────────────
echo ""
echo -e "${YELLOW}[1/6] Démarrage du conteneur PostgreSQL...${NC}"

# Vérifier si le conteneur existe déjà
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo -e "${BLUE}  → Conteneur existant détecté — redémarrage...${NC}"
    docker start $CONTAINER
else
    echo -e "${BLUE}  → Création d'un nouveau conteneur PostgreSQL 16...${NC}"
    docker run -d \
        --name $CONTAINER \
        -e POSTGRES_DB=$DB_NAME \
        -e POSTGRES_USER=$DB_USER \
        -e POSTGRES_PASSWORD=$DB_PASS \
        -p $DB_PORT:5432 \
        -v marche_ia_pg_data:/var/lib/postgresql/data \
        postgres:16-alpine
fi

# ── Étape 2 : Attendre que PostgreSQL soit prêt ───────────────
echo ""
echo -e "${YELLOW}[2/6] Attente que PostgreSQL soit prêt...${NC}"
MAX_WAIT=30
WAITED=0
until docker exec $CONTAINER pg_isready -U $DB_USER -d $DB_NAME -q; do
    sleep 1
    WAITED=$((WAITED + 1))
    echo -ne "  → ${WAITED}s..."
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "\n${RED}✗ PostgreSQL n'a pas démarré en ${MAX_WAIT}s.${NC}"
        echo "  Logs : docker logs $CONTAINER"
        exit 1
    fi
done
echo ""
echo -e "${GREEN}✓ PostgreSQL prêt en ${WAITED}s${NC}"

# ── Étape 3 : Migration 000 — Extensions ─────────────────────
echo ""
echo -e "${YELLOW}[3/6] Installation des extensions PostgreSQL...${NC}"
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME < database/migrations/000_extensions.sql
echo -e "${GREEN}✓ Extensions installées (uuid-ossp, pg_trgm)${NC}"

# ── Étape 4 : Migration 001 — Tables ─────────────────────────
echo ""
echo -e "${YELLOW}[4/6] Création des tables...${NC}"
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME < database/migrations/001_tables.sql
echo -e "${GREEN}✓ 10 tables créées${NC}"

# ── Étape 5 : Migration 002 — Index ──────────────────────────
echo ""
echo -e "${YELLOW}[5/6] Création des index de performance...${NC}"
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME < database/migrations/002_indexes.sql
echo -e "${GREEN}✓ Index créés${NC}"

# ── Étape 6 : Migration 003 — Triggers et vues ───────────────
echo ""
echo -e "${YELLOW}[6/6] Création des triggers, fonctions et vues...${NC}"
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME < database/migrations/003_triggers_views.sql
echo -e "${GREEN}✓ Triggers et vues créés${NC}"

# ── Migration 004 — Contraintes ───────────────────────────────
echo ""
echo -e "${YELLOW}[+] Ajout des contraintes métier...${NC}"
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME < database/migrations/004_constraints.sql
echo -e "${GREEN}✓ Contraintes CHECK ajoutées${NC}"

# ── Migration 005 — Réclamations ──────────────────────────────
echo ""
echo -e "${YELLOW}[+] Création de la table réclamations...${NC}"
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME < database/migrations/005_reclamations.sql
echo -e "${GREEN}✓ Table réclamations créée${NC}"

# ── Migration 006 — Correctifs de contraintes ─────────────────
echo ""
echo -e "${YELLOW}[+] Correctifs de contraintes (rôles, type de procédure)...${NC}"
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME < database/migrations/006_fix_role_and_procedure_constraints.sql
echo -e "${GREEN}✓ Contraintes corrigées${NC}"

# ── Rapport final ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  ✓ BASE DE DONNÉES CONSTRUITE AVEC SUCCÈS     ${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📋 Récapitulatif :${NC}"
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT
    table_name AS \"Table\",
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS \"Taille\"
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
"

echo ""
echo -e "${BLUE}📌 Connexion à la base :${NC}"
echo "   Host     : localhost"
echo "   Port     : $DB_PORT"
echo "   Database : $DB_NAME"
echo "   User     : $DB_USER"
echo "   Password : $DB_PASS"
echo ""
echo -e "${BLUE}🛠️  Commandes utiles :${NC}"
echo "   Ouvrir psql           : docker exec -it $CONTAINER psql -U $DB_USER -d $DB_NAME"
echo "   Voir les tables       : docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c '\dt'"
echo "   Charger données test  : bash scripts/seed_database.sh"
echo "   Arrêter la base       : docker stop $CONTAINER"
echo "   Supprimer tout        : docker rm -f $CONTAINER && docker volume rm marche_ia_pg_data"
echo ""
