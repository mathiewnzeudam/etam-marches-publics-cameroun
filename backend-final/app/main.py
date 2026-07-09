"""
Point d'entrée principal — Marché-IA Cameroun API v1.0
"""
from contextlib import asynccontextmanager
import logging
import time

import sentry_sdk
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.services.services import rag_service
from app.api.v1.router import include_all

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("marche_ia")

# Sentry en production uniquement
if settings.SENTRY_DSN and settings.ENV == "production":
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENV,
        traces_sample_rate=0.2,
    )


# Clé arbitraire mais fixe pour le verrou consultatif Postgres — doit être identique sur tous les
# workers/réplicas pour qu'ils se coordonnent entre eux via la même base de données.
_AUTO_SEED_LOCK_KEY = 913_042_001


async def _auto_seed():
    """Lance le scraping ARMP si la base de données est vide, en utilisant le parser du worker.

    Protégé par un verrou consultatif Postgres (pg_try_advisory_lock) : avec plusieurs workers/réplicas
    démarrant en même temps, un seul obtient le verrou et exécute le scraping ; les autres l'ignorent
    au lieu de scraper les 200 pages ARMP en double.
    """
    import httpx as _httpx
    from sqlalchemy import text
    from app.db.session import async_session_factory
    from app.workers.sync_worker import _scrape_pages
    from app.services.services import TenderService

    db = async_session_factory()
    try:
        got_lock = (await db.execute(
            text("SELECT pg_try_advisory_lock(:k)"), {"k": _AUTO_SEED_LOCK_KEY}
        )).scalar()
        if not got_lock:
            log.info("Auto-seed déjà pris en charge par un autre worker — abandon.")
            return

        r = await db.execute(text("SELECT COUNT(*) FROM tenders"))
        count = r.scalar()
        if count > 0:
            log.info(f"Base déjà alimentée ({count} marchés) — pas de seed automatique.")
            return

        log.info("Base vide — lancement du seed initial ARMP (200 pages, ~2000 marchés)...")
        async with _httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            data = await _scrape_pages(client, pages=200)

        inserted, failed = 0, 0
        svc = TenderService(db)
        for t in data:
            try:
                if await svc.upsert_tender(t):
                    inserted += 1
            except Exception as e:
                failed += 1
                if failed <= 5:
                    log.warning(f"Auto-seed : échec insertion {t.get('external_id')} : {e}")

        log.info(f"Auto-seed terminé : {inserted}/{len(data)} marchés insérés ✓ ({failed} échecs)")
    except Exception as e:
        log.error(f"Auto-seed échoué : {e}")
    finally:
        try:
            await db.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _AUTO_SEED_LOCK_KEY})
        except Exception:
            pass
        await db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise les services au démarrage, les ferme proprement à l'arrêt."""
    import asyncio
    log.info("Démarrage — initialisation du moteur RAG...")
    await rag_service.initialize()
    log.info("Moteur RAG prêt ✓")
    # Seed automatique ARMP si la base est vide
    asyncio.create_task(_auto_seed())
    yield
    log.info("Arrêt — fermeture des connexions...")
    await rag_service.close()
    log.info("Connexions fermées proprement ✓")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## Marché-IA Cameroun — API v1.0

Assistant IA spécialisé dans les marchés publics camerounais.

### Endpoints publics (sans token)
- `GET /api/v1/tenders` — Liste des appels d'offres ARMP
- `GET /api/v1/dashboard` — Statistiques publiques de transparence
- `GET /api/v1/documents/types` — Types de documents disponibles

### Endpoints authentifiés (JWT Bearer)
- `POST /api/v1/chat` — Question à l'assistant IA
- `POST /api/v1/alerts` — Créer une alerte de veille
- `POST /api/v1/documents` — Générer un document officiel

### Authentification
Obtenir un token : `POST /api/v1/auth/login` → copier `access_token` → clic **Authorize** en haut.
    """,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Middlewares ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    ms = round((time.monotonic() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(ms)
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


# ── Gestionnaire d'erreurs global ─────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    log.error(f"Erreur non gérée [{request.method} {request.url}] : {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Une erreur interne est survenue. Veuillez réessayer."},
    )


# ── Routes ────────────────────────────────────────────────────────────────────

include_all(app)


@app.get("/health", tags=["Système"], summary="État du service")
async def health():
    return {
        "status":  "ok",
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env":     settings.ENV,
    }


@app.get("/", include_in_schema=False)
async def root():
    return {"message": f"{settings.APP_NAME} — Documentation : /api/docs"}
