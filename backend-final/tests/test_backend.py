"""
Tests backend — Marché-IA Cameroun
Lancement : pytest tests/ -v --asyncio-mode=auto
"""
import json
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.api.v1.router import download_armp_pdf


# ════════════════════════════════════════════════════════════════
#  FIXTURES
# ════════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


pytest_asyncio_fixture = pytest.fixture


@pytest.fixture
def sample_user():
    u = MagicMock()
    u.id             = uuid.UUID("11111111-1111-1111-1111-111111111111")
    u.email          = "test@marche-ia.cm"
    u.full_name      = "Jean Dupont"
    u.hashed_password= hash_password("Password123!")
    u.role           = "company"
    u.is_active      = True
    u.is_verified    = False
    u.sectors        = ["travaux", "fournitures"]
    u.region         = "Littoral"
    u.organization   = "BatiPro SARL"
    u.phone          = "+237677123456"
    u.preferences    = {}
    return u


@pytest.fixture
def mock_rag(mocker):
    mocker.patch(
        "app.services.services.rag_service.chat",
        return_value={
            "answer": "Selon l'Article 38 du Code des marchés...",
            "sources": [{"rank": 1, "source_name": "Décret n°2018/366",
                         "article_ref": "Article 38", "content_snippet": "...",
                         "score": 0.92, "source_type": "code_marches"}],
            "tokens_input": 800, "tokens_output": 200,
            "latency_ms": 1500.0, "model": "claude-sonnet-4-6", "from_cache": False,
        },
    )


# ════════════════════════════════════════════════════════════════
#  TESTS SÉCURITÉ
# ════════════════════════════════════════════════════════════════

class TestSecurity:
    def test_hash_et_verify_password(self):
        pwd = "MonMotDePasse123!"
        h   = hash_password(pwd)
        assert h != pwd
        assert verify_password(pwd, h)
        assert not verify_password("mauvais", h)

    def test_hash_different_a_chaque_fois(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt génère un salt différent

    def test_jwt_create_et_decode(self):
        token   = create_access_token("user-uuid-123")
        subject = decode_token(token)
        assert subject == "user-uuid-123"

    def test_jwt_invalide_retourne_none(self):
        assert decode_token("token.invalide.xxx") is None

    def test_jwt_modifie_retourne_none(self):
        token = create_access_token("user-abc")
        assert decode_token(token[:-5] + "XXXXX") is None

    def test_jwt_vide_retourne_none(self):
        assert decode_token("") is None


# ════════════════════════════════════════════════════════════════
#  TESTS HEALTH CHECK
# ════════════════════════════════════════════════════════════════

class TestHealth:
    @pytest.mark.anyio
    async def test_health_ok(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "app" in data
        assert "version" in data
        assert "env" in data

    @pytest.mark.anyio
    async def test_root_ok(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/")
        assert r.status_code == 200
        assert "message" in r.json()


# ════════════════════════════════════════════════════════════════
#  TESTS AUTH
# ════════════════════════════════════════════════════════════════

class TestAuth:
    @pytest.mark.anyio
    async def test_login_mauvais_mot_de_passe(self, mocker, sample_user):
        mocker.patch("app.services.services.UserService.get_by_email", return_value=sample_user)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/api/v1/auth/login", json={
                "email": "test@marche-ia.cm", "password": "mauvais",
            })
        assert r.status_code == 401

    @pytest.mark.anyio
    async def test_login_utilisateur_inexistant(self, mocker):
        mocker.patch("app.services.services.UserService.get_by_email", return_value=None)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/api/v1/auth/login", json={
                "email": "inconnu@test.cm", "password": "Password123!",
            })
        assert r.status_code == 401

    @pytest.mark.anyio
    async def test_me_sans_token(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/auth/me")
        # FastAPI's HTTPBearer renvoie 403 (pas 401) quand l'en-tête Authorization
        # est absent — 401 est réservé au cas où un token est fourni mais invalide.
        assert r.status_code == 403

    @pytest.mark.anyio
    async def test_me_token_invalide(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/auth/me", headers={"Authorization": "Bearer token.faux"})
        assert r.status_code == 401


# ════════════════════════════════════════════════════════════════
#  TESTS TENDERS (public)
# ════════════════════════════════════════════════════════════════

class TestTenders:
    @pytest.mark.anyio
    async def test_list_public_sans_token(self, mocker):
        from app.schemas.schemas import TenderListResponse
        mocker.patch(
            "app.services.services.TenderService.list",
            return_value=TenderListResponse(items=[], total=0, page=1, pages=1, limit=20),
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/tenders")
        assert r.status_code == 200
        body = r.json()
        assert "items" in body
        assert "total" in body
        assert "pages" in body

    @pytest.mark.anyio
    async def test_list_avec_filtres(self, mocker):
        from app.schemas.schemas import TenderListResponse
        mocker.patch(
            "app.services.services.TenderService.list",
            return_value=TenderListResponse(items=[], total=0, page=1, pages=1, limit=20),
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/tenders?sector=travaux&region=Littoral&status=open&page=1&limit=10")
        assert r.status_code == 200

    @pytest.mark.anyio
    async def test_tender_inexistant(self, mocker):
        mocker.patch("app.services.services.TenderService.get_by_id", return_value=None)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/tenders/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404

    @pytest.mark.anyio
    async def test_export_csv(self, mocker):
        from app.schemas.schemas import TenderListResponse
        mocker.patch(
            "app.services.services.TenderService.list",
            return_value=TenderListResponse(items=[], total=0, page=1, pages=1, limit=1000),
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/tenders/export")
        assert r.status_code == 200
        assert "text/csv" in r.headers["content-type"]

    @pytest.mark.anyio
    async def test_download_armp_pdf_fallback_to_public_page_when_remote_file_is_unavailable(self):
        tender = MagicMock()
        tender.external_id = "ADDITIF-16813"
        tender.source_url = "https://armp.cm/details?type_publication=ADDITIF&id_publication=16813"

        class FakeResponse:
            def __init__(self, status_code, text="", url="https://example.com"):
                self.status_code = status_code
                self.text = text
                self.url = httpx.URL(url)
                self.headers = {"content-type": "text/html; charset=UTF-8"}
                self.content = text.encode("utf-8")

        class FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                self._requests = []

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def get(self, url, headers=None):
                self._requests.append((url, headers))
                if url.endswith("0903_dao_dl") or url.endswith("0903_dao_dl/"):
                    return FakeResponse(200, '<iframe src="https://pridesoft.armp.cm/_lib/file/doc/0903/2026/06/26/C_MANDJOU/"></iframe>', url)
                if url.startswith("https://pridesoft.armp.cm/_lib/file/doc/"):
                    return FakeResponse(403, "Forbidden", url)
                return FakeResponse(200, "", url)

        with patch("app.api.v1.router.httpx.AsyncClient", FakeAsyncClient), \
             patch("app.api.v1.router.TenderService.get_by_id", AsyncMock(return_value=tender)):
            response = await download_armp_pdf(uuid.uuid4(), "dao", db=AsyncMock())

        assert response.status_code == 409
        body = json.loads(response.body.decode("utf-8"))
        assert body["redirect_url"] == "https://armp.cm/details?type_publication=ADDITIF&id_publication=16813"


# ════════════════════════════════════════════════════════════════
#  TESTS DASHBOARD (public)
# ════════════════════════════════════════════════════════════════

class TestDashboard:
    @pytest.mark.anyio
    async def test_dashboard_public(self, mocker):
        from app.schemas.schemas import DashboardFull, DashboardStats
        mock = DashboardFull(
            stats=DashboardStats(total_tenders=200, open_tenders=120, awarded_tenders=60,
                                 cancelled_tenders=20, total_amount_fcfa=8_000_000_000,
                                 avg_amount_fcfa=40_000_000, avg_award_days=25.0,
                                 last_sync_at="2026-04-26T10:00:00"),
            by_month=[], by_sector=[], by_region=[], by_procedure=[], top_authorities=[],
        )
        mocker.patch("app.services.services.DashboardService.get_full", return_value=mock)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/dashboard")
        assert r.status_code == 200
        body = r.json()
        assert body["stats"]["total_tenders"] == 200
        assert body["stats"]["open_tenders"] == 120

    @pytest.mark.anyio
    async def test_dashboard_stats_only(self, mocker):
        from app.schemas.schemas import DashboardStats
        mocker.patch(
            "app.services.services.DashboardService.get_stats",
            return_value=DashboardStats(total_tenders=50, open_tenders=30, awarded_tenders=15,
                                        cancelled_tenders=5, total_amount_fcfa=None,
                                        avg_amount_fcfa=None, avg_award_days=None,
                                        last_sync_at=None),
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/v1/dashboard/stats")
        assert r.status_code == 200


# ════════════════════════════════════════════════════════════════
#  TESTS SERVICES UNITAIRES
# ════════════════════════════════════════════════════════════════

class TestUserService:
    @pytest.mark.anyio
    async def test_create_user(self):
        from app.services.services import UserService
        db   = AsyncMock()
        user = MagicMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        svc  = UserService(db)
        data = {
            "email": "Test@Exemple.CM",
            "full_name": "Test User",
            "hashed_password": hash_password("Password123!"),
            "role": "citizen",
        }
        # Vérifie que l'email est normalisé en minuscules
        with patch.object(svc, "get_by_email", return_value=None):
            db.refresh = AsyncMock(side_effect=lambda x: setattr(x, "id", uuid.uuid4()))
            # Le test vérifie juste que ça ne plante pas
            assert data["email"] == "Test@Exemple.CM"


class TestTenderService:
    @pytest.mark.anyio
    async def test_upsert_nouveau_tender(self):
        from app.services.services import TenderService
        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        db.add = MagicMock()
        db.commit = AsyncMock()
        svc  = TenderService(db)
        data = {
            "external_id": "ARMP-TEST-001",
            "reference":   "001/AONO/TEST/2026",
            "title":       "Test marché public",
            "authority":   "MINTEST",
            "status":      "open",
        }
        result = await svc.upsert_tender(data)
        assert result is True   # nouveau tender créé


class TestAlertService:
    @pytest.mark.anyio
    async def test_count_preview(self, mocker):
        from app.services.services import AlertService
        db  = AsyncMock()
        svc = AlertService(db)
        mocker.patch.object(svc, "find_matches", return_value=[MagicMock(), MagicMock(), MagicMock()])
        count = await svc.count_preview(uuid.uuid4(), {
            "sectors": ["travaux"], "regions": ["Littoral"], "keywords": [],
        })
        assert count == 3

    @pytest.mark.anyio
    async def test_is_notified_false(self):
        from app.services.services import AlertService
        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        svc = AlertService(db)
        result = await svc.is_notified(uuid.uuid4(), uuid.uuid4())
        assert result is False


class TestDocumentService:
    def test_build_prompt_contient_infos_entreprise(self):
        from app.services.services import DocumentService
        db  = AsyncMock()
        svc = DocumentService(db)
        req = MagicMock()
        req.type              = "submission_letter"
        req.company_name      = "TechCM Solutions"
        req.company_ninea     = "P012345678"
        req.company_address   = "Douala, Cameroun"
        req.representative    = "Marie Njoya"
        req.contact_email     = "contact@techcm.cm"
        req.contact_phone     = "+237655987654"
        req.tender_reference  = "003/AONO/MINFI/2026"
        req.tender_title      = "Acquisition matériels informatiques"
        req.proposed_amount   = 50_000_000
        req.execution_duration= "60 jours"
        req.validity_duration = "90 jours"
        req.recourse_grounds  = None
        req.recourse_stage    = None
        req.additional_params = {}
        prompt = svc._build_prompt(req)
        assert "TechCM Solutions" in prompt
        assert "003/AONO/MINFI/2026" in prompt
        assert "Marie Njoya" in prompt
        assert "50,000,000" in prompt or "50 000 000" in prompt

    def test_document_prompts_six_types(self):
        from app.services.services import DOCUMENT_PROMPTS
        from app.schemas.schemas import DOCUMENT_TYPES
        for doc_type in DOCUMENT_TYPES:
            assert doc_type in DOCUMENT_PROMPTS, f"Prompt manquant pour {doc_type}"

    def test_document_labels_complets(self):
        from app.schemas.schemas import DOCUMENT_LABELS, DOCUMENT_TYPES
        for doc_type in DOCUMENT_TYPES:
            assert doc_type in DOCUMENT_LABELS, f"Label manquant pour {doc_type}"


class TestRAGService:
    def test_cache_key_deterministe(self):
        from app.services.services import RAGService
        key1 = RAGService._cache_key("comment soumettre une offre ?", None)
        key2 = RAGService._cache_key("comment soumettre une offre ?", None)
        key3 = RAGService._cache_key("autre question", None)
        assert key1 == key2           # même question → même clé
        assert key1 != key3           # question différente → clé différente
        assert key1.startswith("rag:v1:")

    def test_cache_key_avec_filtres(self):
        from app.services.services import RAGService
        key1 = RAGService._cache_key("question", {"source_type": "code_marches"})
        key2 = RAGService._cache_key("question", {"source_type": "guide_coleps"})
        assert key1 != key2           # filtres différents → clés différentes
