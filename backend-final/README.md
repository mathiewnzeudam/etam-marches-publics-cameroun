# Marché-IA Cameroun — Backend API v1.0

Assistant IA pour les marchés publics camerounais.
Code des marchés 2018 · ARMP · COLEPS · Transparence publique.

---

## Structure du projet

```
marche-ia-backend/
│
├── app/
│   ├── main.py                    ← Point d'entrée FastAPI
│   ├── core/
│   │   ├── config.py              ← Variables d'environnement (Pydantic Settings)
│   │   ├── security.py            ← JWT + bcrypt
│   │   └── deps.py                ← Dépendances injectées (auth, db)
│   ├── db/
│   │   └── session.py             ← Pool connexions PostgreSQL async
│   ├── models/
│   │   └── models.py              ← 9 modèles SQLAlchemy (toutes les tables)
│   ├── schemas/
│   │   └── schemas.py             ← Schémas Pydantic (validation I/O)
│   ├── services/
│   │   └── services.py            ← 8 services métier + RAG Service
│   ├── api/v1/
│   │   └── router.py              ← Tous les endpoints (auth, chat, tenders, alerts, docs, dashboard)
│   └── workers/
│       └── sync_worker.py         ← Celery : 4 tâches planifiées
│
├── database/
│   ├── migrations/
│   │   ├── 000_extensions.sql     ← uuid-ossp, pg_trgm
│   │   ├── 001_tables.sql         ← 10 tables avec commentaires
│   │   ├── 002_indexes.sql        ← 30+ index de performance
│   │   ├── 003_triggers_views.sql ← Triggers updated_at, 4 vues, fonctions
│   │   └── 004_constraints.sql    ← Contraintes CHECK métier
│   ├── seeds/
│   │   └── 001_test_data.sql      ← Données de test réalistes (Cameroun)
│   ├── scripts/
│   │   ├── build_database.sh      ← Construction complète en une commande
│   │   ├── verify_database.sh     ← 40+ tests automatiques
│   │   └── reset_database.sh      ← Remise à zéro
│   ├── docker-compose.yml         ← PostgreSQL + Adminer standalone
│   └── README.md                  ← Documentation base de données
│
├── scripts/
│   └── ingest.py                  ← Ingestion PDFs → Qdrant
│
├── tests/
│   ├── conftest.py
│   └── test_backend.py            ← Suite de tests (sécurité, endpoints, services)
│
├── knowledge_base/                ← Placer les PDFs officiels ici
├── .env.example                   ← Modèle de configuration
├── Dockerfile
├── docker-compose.yml             ← Infrastructure complète (API + Worker + DB + Cache + Qdrant)
└── requirements.txt
```

---

## Démarrage en 4 étapes

### Étape 1 — Configuration
```bash
cp .env.example .env
# Remplir :
#   SECRET_KEY=<openssl rand -hex 32>
#   ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Étape 2 — Infrastructure Docker
```bash
docker compose up -d
# Lance : API + Worker + PostgreSQL + Redis + Qdrant + Adminer
# La base est créée automatiquement depuis database/migrations/
```

### Étape 3 — Base de connaissances IA
```bash
# Placer les PDFs dans knowledge_base/
# (decret_2018_366_code_marches.pdf, guide_utilisateur_coleps_v2.pdf, ...)
pip install -r requirements.txt
python scripts/ingest.py --source all
```

### Étape 4 — Vérification
```bash
# Health check
curl http://localhost:8000/health

# Documentation Swagger
open http://localhost:8000/api/docs

# Tests
pytest tests/ -v --asyncio-mode=auto

# Interface base de données
open http://localhost:8080
```

---

## Endpoints

### Public (sans authentification)
| Méthode | Route | Description |
|---|---|---|
| GET | /health | État du service |
| GET | /api/v1/tenders | Liste appels d'offres (filtres : status, sector, region, search...) |
| GET | /api/v1/tenders/{id} | Détail d'un marché |
| GET | /api/v1/tenders/export | Export CSV |
| GET | /api/v1/dashboard | Statistiques transparence complètes |
| GET | /api/v1/dashboard/stats | KPIs uniquement |
| GET | /api/v1/documents/types | Types de documents disponibles |

### Authentifié (JWT Bearer)
| Méthode | Route | Description |
|---|---|---|
| POST | /api/v1/auth/register | Créer un compte |
| POST | /api/v1/auth/login | Se connecter → token JWT |
| GET | /api/v1/auth/me | Mon profil |
| PATCH | /api/v1/auth/me | Modifier mon profil |
| POST | /api/v1/auth/change-password | Changer de mot de passe |
| POST | /api/v1/chat | Question à l'assistant IA |
| POST | /api/v1/chat/stream | Réponse streaming (SSE) |
| GET | /api/v1/chat/history | Mes conversations |
| DELETE | /api/v1/chat/history/{id} | Archiver une conversation |
| POST | /api/v1/chat/feedback/{id} | Évaluer une réponse |
| GET | /api/v1/alerts | Mes alertes de veille |
| POST | /api/v1/alerts | Créer une alerte |
| GET | /api/v1/alerts/preview | Aperçu temps réel |
| PATCH | /api/v1/alerts/{id} | Modifier une alerte |
| PATCH | /api/v1/alerts/{id}/toggle | Activer/désactiver |
| DELETE | /api/v1/alerts/{id} | Supprimer |
| GET | /api/v1/alerts/notifications | Mes notifications |
| GET | /api/v1/documents | Mes documents |
| POST | /api/v1/documents | Générer un document par IA |
| GET | /api/v1/documents/{id} | Détail |
| PATCH | /api/v1/documents/{id} | Modifier |
| DELETE | /api/v1/documents/{id} | Supprimer |
| GET | /api/v1/documents/{id}/download | Télécharger |

---

## Migrations de schéma (Alembic)

Les fichiers `database/migrations/000-006_*.sql` restent l'historique de la création
initiale du schéma. **Toute évolution future du schéma passe par Alembic**, pas par un
nouveau fichier SQL manuel — ça évite le type de désynchronisation qu'on a eu entre
l'environnement local et la production (contrainte appliquée dans un environnement,
oubliée dans l'autre).

```bash
# Après avoir modifié app/models/models.py :
alembic revision --autogenerate -m "description du changement"
# Relire le fichier généré dans alembic/versions/ avant de l'appliquer (l'autogénération
# peut proposer des changements non voulus, ex: renommage d'index).
alembic upgrade head

# Voir l'état d'un environnement :
alembic current

# Revenir en arrière si besoin :
alembic downgrade -1
```

`alembic/env.py` lit `DATABASE_URL` depuis `settings` (donc depuis `.env` ou les
variables d'environnement Railway) — jamais depuis `alembic.ini`.

---

## Ports
| Service | Port | URL |
|---|---|---|
| API FastAPI | 8000 | http://localhost:8000/api/docs |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| Qdrant | 6333 | http://localhost:6333/dashboard |
| Adminer | 8080 | http://localhost:8080 |
