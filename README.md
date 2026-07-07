# E-TAM — Marché-IA Cameroun

Assistant IA et plateforme des marchés publics camerounais — Code des marchés (Décret 2018/366), ARMP, COLEPS.

---

## Architecture

```
mon-projet-dut/
├── backend-final/              # API FastAPI (Python)
│   ├── app/
│   │   ├── main.py              # Point d'entrée FastAPI
│   │   ├── core/                # Configuration, sécurité JWT, dépendances
│   │   ├── api/v1/
│   │   │   ├── router.py        # Agrégation des routes /api/v1
│   │   │   └── endpoints/       # chat, auth, tenders, alerts, documents, dashboard...
│   │   ├── services/            # RAG, tenders, documents, etc.
│   │   ├── models/               # Modèles SQLAlchemy
│   │   ├── schemas/              # Schémas Pydantic
│   │   └── workers/
│   │       └── sync_worker.py   # Celery : scraping ARMP + tâches planifiées
│   ├── database/                # Schéma PostgreSQL
│   ├── scripts/                 # Scripts d'exploitation et de debug
│   ├── knowledge_base/          # PDFs du Code des marchés (à placer localement, non versionné)
│   ├── docker-compose.yml       # Environnement local complet
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/                    # React (Create React App)
    ├── src/
    │   ├── pages/                # Home, Marches, Chat, Dashboard, Documents, Transparence...
    │   ├── components/           # Navbar, Footer
    │   ├── context/              # AuthContext
    │   └── services/api.js       # Client API centralisé
    └── public/
```

---

## Démarrage rapide

### Pré-requis
- Docker & Docker Compose
- Node.js 20+
- Une clé API pour le LLM (Groq, Anthropic ou Gemini selon `LLM_PROVIDER`)

### 1. Variables d'environnement

```bash
cd backend-final
cp .env.example .env
# Éditez .env et renseignez :
#   SECRET_KEY=<openssl rand -hex 32>
#   GROQ_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY (selon LLM_PROVIDER)
#   DATABASE_URL=postgresql+asyncpg://marche_ia:secret@postgres:5432/marche_ia_db
```

### 2. Démarrer l'infrastructure backend

```bash
cd backend-final
docker compose up -d
# Services démarrés :
#   PostgreSQL   → localhost:5432
#   Redis        → localhost:6379
#   Qdrant       → localhost:6333
#   API FastAPI  → localhost:8000
#   Worker Celery → sync ARMP horaire, alertes, nettoyage
```

### 3. Démarrer le frontend

```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

### 4. Vérifier que tout fonctionne

```bash
curl http://localhost:8000/health
open http://localhost:8000/api/docs
```

---

## Stack technique

| Composant         | Technologie                | Rôle                                    |
|-------------------|-----------------------------|------------------------------------------|
| API Backend       | FastAPI                    | Async natif, Swagger auto                |
| LLM               | Groq / Anthropic / Gemini  | Assistant IA juridique                   |
| RAG               | LangChain + Qdrant          | Recherche sémantique sur le Code des marchés |
| Base SQL          | PostgreSQL 16               | Marchés, utilisateurs, documents         |
| Cache             | Redis 7                     | Cache réponses IA, TTL                   |
| Tâches async      | Celery + Redis              | Sync ARMP horaire, alertes, nettoyage    |
| Frontend          | React (CRA)                 | Interface utilisateur                    |

---

## Endpoints principaux

| Méthode | Route                       | Description                          |
|---------|------------------------------|---------------------------------------|
| POST    | /api/v1/auth/register        | Inscription utilisateur               |
| POST    | /api/v1/auth/login           | Connexion → JWT                       |
| POST    | /api/v1/chat                 | Question à l'assistant IA             |
| GET     | /api/v1/tenders               | Liste des appels d'offres             |
| GET     | /api/v1/tenders/{id}/download/{doc_type} | Téléchargement DAO/pièce (proxy ARMP) |
| POST    | /api/v1/alerts                | Créer une alerte de veille            |
| POST    | /api/v1/documents/generate    | Générer un document                   |
| GET     | /api/v1/dashboard/stats       | Statistiques publiques                |
| POST    | /api/v1/reclamations          | Déposer une réclamation (Art. 74)     |

---

## Tests

```bash
# Backend
cd backend-final && pytest

# Frontend
cd frontend && npm test
```

---

## Contribuer

Projet développé dans le cadre d'un projet académique DUT (IUT Douala).
