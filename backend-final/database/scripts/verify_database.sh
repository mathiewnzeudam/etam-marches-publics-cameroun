#!/bin/bash
# ============================================================
#  Marché-IA Cameroun — Vérification complète de la base
#  Usage : bash scripts/verify_database.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

DB_NAME="marche_ia_db"
DB_USER="marche_ia"
CONTAINER="marche_ia_postgres"

PASS=0
FAIL=0

check() {
    local label="$1"
    local query="$2"
    local expected="$3"
    result=$(docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "$query" 2>/dev/null)
    if [ "$result" = "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $label"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $label (attendu: '$expected', obtenu: '$result')"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║   Marché-IA — Vérification Base de Données   ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Vérification des tables ────────────────────────────────
echo -e "${YELLOW}[1] Tables (10 attendues)${NC}"
TABLES=("users" "tenders" "conversations" "messages" "alerts" "alert_matches" "documents" "knowledge_chunks" "audit_logs" "sync_jobs")
for t in "${TABLES[@]}"; do
    check "Table '$t' existe" \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$t'" \
        "1"
done

# ── 2. Vérification des colonnes critiques ────────────────────
echo ""
echo -e "${YELLOW}[2] Colonnes critiques${NC}"
check "users.hashed_password existe" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name='hashed_password'" "1"
check "users.role existe" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name='role'" "1"
check "tenders.estimated_amount existe" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='tenders' AND column_name='estimated_amount'" "1"
check "tenders.deadline existe" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='tenders' AND column_name='deadline'" "1"
check "messages.feedback existe" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='messages' AND column_name='feedback'" "1"
check "messages.sources JSONB existe" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='messages' AND column_name='sources' AND data_type='jsonb'" "1"
check "alerts.sectors est un tableau" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='alerts' AND column_name='sectors' AND data_type='ARRAY'" "1"
check "alert_matches contrainte UNIQUE (alert_id, tender_id)" \
    "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name='alert_matches' AND constraint_type='UNIQUE'" "1"

# ── 3. Vérification des clés étrangères ───────────────────────
echo ""
echo -e "${YELLOW}[3] Clés étrangères (FK)${NC}"
check "conversations → users" \
    "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.table_constraints tc ON rc.constraint_name=tc.constraint_name WHERE tc.table_name='conversations'" "1"
check "messages → conversations" \
    "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.table_constraints tc ON rc.constraint_name=tc.constraint_name WHERE tc.table_name='messages'" "1"
check "alerts → users" \
    "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.table_constraints tc ON rc.constraint_name=tc.constraint_name WHERE tc.table_name='alerts'" "1"
check "alert_matches → alerts ET tenders" \
    "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.table_constraints tc ON rc.constraint_name=tc.constraint_name WHERE tc.table_name='alert_matches'" "2"
check "documents → users" \
    "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.table_constraints tc ON rc.constraint_name=tc.constraint_name WHERE tc.table_name='documents'" "2"

# ── 4. Vérification des index ─────────────────────────────────
echo ""
echo -e "${YELLOW}[4] Index de performance${NC}"
INDEXES=(
    "idx_users_email"
    "idx_tenders_status"
    "idx_tenders_sector"
    "idx_tenders_deadline"
    "idx_tenders_reference_trgm"
    "idx_tenders_title_trgm"
    "idx_conversations_active"
    "idx_alerts_active"
    "idx_matches_pending"
    "idx_audit_created_at"
    "idx_sync_jobs_success"
)
for idx in "${INDEXES[@]}"; do
    check "Index '$idx' existe" \
        "SELECT COUNT(*) FROM pg_indexes WHERE indexname='$idx'" "1"
done

# ── 5. Vérification des triggers ──────────────────────────────
echo ""
echo -e "${YELLOW}[5] Triggers updated_at${NC}"
check "Trigger sur users" \
    "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name='trg_users_updated_at'" "1"
check "Trigger sur conversations" \
    "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name='trg_conversations_updated_at'" "1"
check "Trigger sur documents" \
    "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name='trg_documents_updated_at'" "1"

# ── 6. Vérification des vues ──────────────────────────────────
echo ""
echo -e "${YELLOW}[6] Vues${NC}"
VIEWS=("v_dashboard_public" "v_tenders_urgent" "v_sync_health" "v_ai_usage")
for v in "${VIEWS[@]}"; do
    check "Vue '$v' existe" \
        "SELECT COUNT(*) FROM information_schema.views WHERE table_name='$v'" "1"
done

# ── 7. Vérification des contraintes CHECK ────────────────────
echo ""
echo -e "${YELLOW}[7] Contraintes métier (CHECK)${NC}"
check "CHECK users.role" \
    "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name='chk_users_role'" "1"
check "CHECK tenders.status" \
    "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name='chk_tenders_status'" "1"
check "CHECK messages.feedback" \
    "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name='chk_messages_feedback'" "1"
check "CHECK alerts.channel" \
    "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name='chk_alerts_channel'" "1"
check "CHECK documents.type" \
    "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name='chk_documents_type'" "1"

# ── 8. Test fonctionnel : insert/select/delete ────────────────
echo ""
echo -e "${YELLOW}[8] Tests fonctionnels${NC}"

# Test insert user
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO users (email, full_name, hashed_password, role)
VALUES ('test_verify@marche-ia.cm', 'Test Verify', 'hash_test', 'citizen')
ON CONFLICT (email) DO NOTHING;" > /dev/null 2>&1

check "INSERT utilisateur de test" \
    "SELECT COUNT(*) FROM users WHERE email='test_verify@marche-ia.cm'" "1"

# Test trigger updated_at
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
UPDATE users SET full_name='Test Updated' WHERE email='test_verify@marche-ia.cm';" > /dev/null 2>&1

check "Trigger updated_at fonctionne" \
    "SELECT COUNT(*) FROM users WHERE email='test_verify@marche-ia.cm' AND updated_at > created_at" "1"

# Test contrainte CHECK role invalide
ROLE_TEST=$(docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO users (email, full_name, hashed_password, role)
VALUES ('bad_role@test.cm', 'Bad', 'hash', 'superadmin');" 2>&1 | grep -c "ERROR" || true)
if [ "$ROLE_TEST" -ge "1" ]; then
    echo -e "  ${GREEN}✓${NC} Contrainte CHECK role rejette les valeurs invalides"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} Contrainte CHECK role ne fonctionne pas"
    FAIL=$((FAIL + 1))
fi

# Test contrainte CHECK feedback invalide
FB_TEST=$(docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO conversations (user_id, title) SELECT id, 'Test' FROM users WHERE email='test_verify@marche-ia.cm';
INSERT INTO messages (conversation_id, role, content, feedback)
SELECT id, 'user', 'test', 5 FROM conversations WHERE title='Test' LIMIT 1;" 2>&1 | grep -c "ERROR" || true)
if [ "$FB_TEST" -ge "1" ]; then
    echo -e "  ${GREEN}✓${NC} Contrainte CHECK feedback rejette les valeurs hors (-1,0,1)"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} Contrainte CHECK feedback ne fonctionne pas"
    FAIL=$((FAIL + 1))
fi

# Nettoyage données de test
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "
DELETE FROM users WHERE email IN ('test_verify@marche-ia.cm', 'bad_role@test.cm');" > /dev/null 2>&1

# ── Résultat final ────────────────────────────────────────────
echo ""
TOTAL=$((PASS + FAIL))
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
if [ $FAIL -eq 0 ]; then
    echo -e "${BOLD}${GREEN}  ✓ TOUS LES TESTS PASSENT : $PASS/$TOTAL${NC}"
    echo -e "${BOLD}${GREEN}    La base de données est correctement construite.${NC}"
else
    echo -e "${BOLD}${RED}  ✗ ÉCHECS : $FAIL/$TOTAL tests ont échoué.${NC}"
    echo -e "${BOLD}${YELLOW}    Relancer : bash scripts/build_database.sh${NC}"
fi
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""
