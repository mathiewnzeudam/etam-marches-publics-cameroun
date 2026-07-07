# Marché-IA Cameroun — Base de Données

PostgreSQL 16 · 10 tables · 30+ index · 4 vues · 5 fonctions · 8 triggers

---

## Structure

```
database/
│
├── migrations/                    ← Scripts SQL dans l'ordre d'exécution
│   ├── 000_extensions.sql         ← uuid-ossp, pg_trgm
│   ├── 001_tables.sql             ← 10 tables avec commentaires détaillés
│   ├── 002_indexes.sql            ← 30+ index de performance
│   ├── 003_triggers_views.sql     ← Triggers, fonctions PL/pgSQL, 4 vues
│   └── 004_constraints.sql        ← Contraintes CHECK métier
│
├── seeds/
│   └── 001_test_data.sql          ← Jeu de données réalistes (Cameroun)
│
├── scripts/
│   ├── build_database.sh          ← Construction complète en une commande
│   ├── verify_database.sh         ← 40+ tests automatiques de vérification
│   └── reset_database.sh          ← Remise à zéro complète
│
└── docker-compose.yml             ← PostgreSQL + Adminer + pgAdmin
```

---

## Démarrage en 2 commandes

```bash
# 1. Lancer PostgreSQL (crée et initialise automatiquement la base)
docker compose up -d

# 2. Vérifier que tout est correct
bash scripts/verify_database.sh
```

C'est tout. Les migrations s'exécutent automatiquement au premier démarrage.

---

## Les 10 tables

| Table | Rôle | Lignes estimées |
|---|---|---|
| `users` | Comptes utilisateurs (citoyens, entreprises, MO, admins) | < 10 000 |
| `tenders` | Appels d'offres ARMP — sync automatique toutes les heures | 5 000 – 50 000 |
| `conversations` | Sessions de chat avec l'assistant IA | 10 000 – 100 000 |
| `messages` | Questions et réponses IA avec sources et métriques | 50 000 – 500 000 |
| `alerts` | Préférences de veille personnalisées | < 50 000 |
| `alert_matches` | Correspondances alerte ↔ marché (dédoublonnage) | 100 000+ |
| `documents` | Documents générés par IA (lettres, offres, recours) | < 100 000 |
| `knowledge_chunks` | Index textuel des chunks ingérés dans Qdrant | 5 000 – 20 000 |
| `audit_logs` | Traçabilité de toutes les actions (purgé à 90 jours) | 1 000 000+ |
| `sync_jobs` | Historique des syncs ARMP (purgé à 90 jours) | < 10 000 |

---

## Les 4 vues

| Vue | Utilisation |
|---|---|
| `v_dashboard_public` | Données agrégées pour le tableau de bord public de transparence |
| `v_tenders_urgent` | Marchés dont la deadline est dans ≤ 7 jours |
| `v_sync_health` | Taux de succès des synchronisations ARMP sur 30 jours |
| `v_ai_usage` | Métriques IA par jour (tokens, latence, satisfaction) |

---

## Connexion

```
Host     : localhost
Port     : 5432
Database : marche_ia_db
User     : marche_ia
Password : secret
```

### Via psql
```bash
docker exec -it marche_ia_postgres psql -U marche_ia -d marche_ia_db
```

### Via Adminer (interface web)
```
URL      : http://localhost:8080
Système  : PostgreSQL
Serveur  : postgres
Login    : marche_ia
Mot de passe : secret
Base     : marche_ia_db
```

---

## Commandes utiles

```bash
# Voir toutes les tables
docker exec marche_ia_postgres psql -U marche_ia -d marche_ia_db -c "\dt"

# Voir la structure d'une table
docker exec marche_ia_postgres psql -U marche_ia -d marche_ia_db -c "\d tenders"

# Compter les lignes de chaque table
docker exec marche_ia_postgres psql -U marche_ia -d marche_ia_db -c "
SELECT schemaname, tablename, n_live_tup AS rows
FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# Voir les index actifs
docker exec marche_ia_postgres psql -U marche_ia -d marche_ia_db -c "
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname='public' ORDER BY tablename;"

# Dashboard de transparence
docker exec marche_ia_postgres psql -U marche_ia -d marche_ia_db -c "
SELECT * FROM v_dashboard_public LIMIT 10;"

# Marchés urgents (deadline < 7 jours)
docker exec marche_ia_postgres psql -U marche_ia -d marche_ia_db -c "
SELECT reference, title, deadline, days_remaining FROM v_tenders_urgent;"

# Fermer proprement
docker compose down

# Supprimer toutes les données (IRRÉVERSIBLE)
docker compose down -v
```

---

## Séquence d'exécution des migrations

Les migrations sont numérotées et doivent toujours être exécutées dans l'ordre :

```
000_extensions.sql   → Active uuid-ossp et pg_trgm (requis par les suivants)
         ↓
001_tables.sql       → Crée les 10 tables (respecte l'ordre des FK)
         ↓
002_indexes.sql      → Crée les 30+ index (les tables doivent exister)
         ↓
003_triggers_views.sql → Crée triggers, fonctions PL/pgSQL, 4 vues
         ↓
004_constraints.sql  → Ajoute les contraintes CHECK métier
```

Avec Docker Compose, l'ordre est garanti automatiquement par le nommage `000_`, `001_`...

---

## Variables d'environnement (production)

```env
DATABASE_URL=postgresql+asyncpg://marche_ia:MOT_DE_PASSE_FORT@db-host:5432/marche_ia_db
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```

⚠️ En production : changer le mot de passe `secret` par une valeur forte.
