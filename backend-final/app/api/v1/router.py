"""
Router principal — regroupe tous les endpoints de l'API v1.
"""
from __future__ import annotations
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import uuid, csv, io
from urllib.parse import quote, urlparse as _urlparse

log = logging.getLogger(__name__)

from app.core.deps import get_db, get_current_user, get_optional_user, require_role
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.models.models import AuditLog
from app.services.services import (
    UserService, ConversationService, TenderService,
    AlertService, DocumentService, DashboardService, rag_service,
    ReclamationService,
)
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserOut, UserUpdate, PasswordChange,
    ChatRequest, ChatResponse, ConversationOut,
    TenderOut, TenderListResponse,
    AlertCreate, AlertUpdate, AlertOut, NotificationOut,
    DocumentGenerateRequest, DocumentUpdate, DocumentOut, DocumentListOut, DOCUMENT_TYPES,
    DashboardFull, DashboardStats,
    ReclamationCreate, ReclamationOut, ReclamationAdminUpdate, RECLAMATION_TYPES, RECLAMATION_STATUTS,
)

api = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def log_action(db, user_id, action, entity_type=None, entity_id=None, ip=None):
    db.add(AuditLog(user_id=user_id, action=action, entity_type=entity_type,
                    entity_id=entity_id, ip_address=ip))
    await db.commit()


# ════════════════════════════════════════════════════════════════
#  AUTH
# ════════════════════════════════════════════════════════════════

auth = APIRouter(prefix="/auth", tags=["Authentification"])


@auth.post("/register", response_model=TokenResponse, status_code=201,
           summary="Créer un compte",
           dependencies=[Depends(rate_limit("register", max_requests=5, window_seconds=3600))])
async def register(req: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    svc = UserService(db)
    if await svc.get_by_email(req.email):
        raise HTTPException(400, "Un compte existe déjà avec cet email")
    data = req.model_dump()
    data["hashed_password"] = hash_password(data.pop("password"))
    user = await svc.create(data)
    ip = request.client.host if request.client else None
    await log_action(db, user.id, "auth.register", ip=ip)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@auth.post("/login", response_model=TokenResponse, summary="Se connecter",
           dependencies=[Depends(rate_limit("login", max_requests=10, window_seconds=300))])
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    svc = UserService(db)
    user = await svc.get_by_email(req.email)
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(403, "Compte désactivé — contactez l'administration")
    await svc.update_last_login(user.id)
    ip = request.client.host if request.client else None
    await log_action(db, user.id, "auth.login", ip=ip)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@auth.get("/me", response_model=UserOut, summary="Mon profil")
async def me(current_user=Depends(get_current_user)):
    return current_user


@auth.patch("/me", response_model=UserOut, summary="Mettre à jour mon profil")
async def update_me(data: UserUpdate, current_user=Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    return await UserService(db).update(current_user.id, data.model_dump(exclude_none=True))


@auth.post("/change-password", status_code=204, summary="Changer de mot de passe")
async def change_password(data: PasswordChange, current_user=Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Mot de passe actuel incorrect")
    await UserService(db).update(current_user.id, {"hashed_password": hash_password(data.new_password)})


# ════════════════════════════════════════════════════════════════
#  ADMINISTRATION — comptes utilisateurs
# ════════════════════════════════════════════════════════════════

admin_users_r = APIRouter(prefix="/admin/users", tags=["Administration"],
                          dependencies=[Depends(require_role("admin"))])


@admin_users_r.get("", response_model=list[UserOut], summary="Lister les utilisateurs")
async def admin_list_users(
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Recherche par nom ou email"),
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await UserService(db).list_all(role=role, search=search, limit=limit, offset=offset)


@admin_users_r.get("/count", summary="Nombre total de comptes")
async def admin_count_users(db: AsyncSession = Depends(get_db)):
    return {"total": await UserService(db).count_all()}


@admin_users_r.patch("/{user_id}/active", response_model=UserOut,
                     summary="Activer / désactiver un compte")
async def admin_set_user_active(
    user_id: uuid.UUID, is_active: bool,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(400, "Impossible de désactiver son propre compte")
    user = await UserService(db).set_active(user_id, is_active)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    await log_action(db, current_user.id, "admin.user.set_active" if is_active else "admin.user.deactivate",
                     "user", user_id)
    return user


# ════════════════════════════════════════════════════════════════
#  CHAT IA
# ════════════════════════════════════════════════════════════════

chat_r = APIRouter(prefix="/chat", tags=["Assistant IA"])


@chat_r.post("", response_model=ChatResponse, summary="Poser une question",
             dependencies=[Depends(rate_limit("chat", max_requests=20, window_seconds=60))])
async def ask(req: ChatRequest, current_user=Depends(get_current_user),
              db: AsyncSession = Depends(get_db)):
    conv_svc = ConversationService(db)
    conv = await conv_svc.get_or_create(current_user.id, req.conversation_id)
    history = await conv_svc.get_history(conv.id, limit=10)
    try:
        result = await rag_service.chat(
            question=req.question, history=history,
            user_id=str(current_user.id), filters=req.filters,
        )
    except Exception as e:
        raise HTTPException(503, f"Service IA indisponible : {e}")
    await conv_svc.save_message(conv.id, "user", req.question)
    msg = await conv_svc.save_message(
        conv.id, "assistant", result["answer"],
        sources=result["sources"], tokens_input=result["tokens_input"],
        tokens_output=result["tokens_output"], latency_ms=result["latency_ms"],
        model_used=result["model"],
    )
    await log_action(db, current_user.id, "chat.message", "message", msg.id)
    return ChatResponse(
        message_id=msg.id, conversation_id=conv.id,
        answer=result["answer"], sources=result["sources"],
        tokens_used=result["tokens_input"] + result["tokens_output"],
        latency_ms=result["latency_ms"], from_cache=result["from_cache"],
    )


@chat_r.post("/stream", summary="Réponse en streaming (SSE)",
             dependencies=[Depends(rate_limit("chat", max_requests=20, window_seconds=60))])
async def ask_stream(req: ChatRequest, current_user=Depends(get_current_user),
                     db: AsyncSession = Depends(get_db)):
    conv_svc = ConversationService(db)
    conv = await conv_svc.get_or_create(current_user.id, req.conversation_id)
    history = await conv_svc.get_history(conv.id, limit=10)
    await conv_svc.save_message(conv.id, "user", req.question)
    return StreamingResponse(
        rag_service.chat_stream(question=req.question, history=history, filters=req.filters),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
                 "X-Conversation-Id": str(conv.id)},
    )


@chat_r.get("/history", response_model=list[ConversationOut], summary="Mes conversations")
async def history(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                  current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    convs = await ConversationService(db).list_conversations(current_user.id, min(limit, 100), offset)
    return [ConversationOut(id=c.id, title=c.title, status=c.status,
                            created_at=c.created_at.isoformat(), updated_at=c.updated_at.isoformat())
            for c in convs]


@chat_r.delete("/history/{conv_id}", status_code=204, summary="Archiver une conversation")
async def archive_conv(conv_id: uuid.UUID, current_user=Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    await ConversationService(db).archive(conv_id, current_user.id)


@chat_r.post("/feedback/{message_id}", summary="Évaluer une réponse (-1 / 0 / 1)")
async def feedback(message_id: uuid.UUID, score: int,
                   current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if score not in (-1, 0, 1):
        raise HTTPException(422, "Le score doit être -1, 0 ou 1")
    await ConversationService(db).update_feedback(message_id, current_user.id, score)
    return {"status": "ok"}


# ════════════════════════════════════════════════════════════════
#  TENDERS (public)
# ════════════════════════════════════════════════════════════════

tenders = APIRouter(prefix="/tenders", tags=["Appels d'offres (public)"])

SORTABLE_TENDER_FIELDS = {
    "reference", "title", "authority", "sector", "region", "procedure_type",
    "estimated_amount", "publication_date", "deadline", "status", "synced_at", "created_at",
}


@tenders.get("", response_model=TenderListResponse, summary="Liste des appels d'offres")
async def list_tenders(
    search: str = None, status: str = None, sector: str = None,
    region: str = None, procedure_type: str = None,
    min_amount: int = None, max_amount: int = None,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    sort_by: str = "publication_date", sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
):
    if sort_by not in SORTABLE_TENDER_FIELDS:
        raise HTTPException(422, f"sort_by invalide. Valeurs : {', '.join(sorted(SORTABLE_TENDER_FIELDS))}")
    if sort_dir not in ("asc", "desc"):
        raise HTTPException(422, "sort_dir doit être 'asc' ou 'desc'")
    return await TenderService(db).list(
        search=search, status=status, sector=sector, region=region,
        procedure_type=procedure_type, min_amount=min_amount, max_amount=max_amount,
        page=page, limit=min(limit, 100), sort_by=sort_by, sort_dir=sort_dir,
    )


@tenders.get("/export", summary="Exporter en CSV")
async def export_csv(status: str = None, sector: str = None, region: str = None,
                     db: AsyncSession = Depends(get_db)):
    result = await TenderService(db).list(status=status, sector=sector, region=region, limit=1000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "reference", "title", "authority", "sector", "region",
        "procedure_type", "estimated_amount", "publication_date", "deadline", "status",
    ])
    writer.writeheader()
    for t in result.items:
        writer.writerow({
            "reference": t.reference, "title": t.title, "authority": t.authority,
            "sector": t.sector, "region": t.region, "procedure_type": t.procedure_type,
            "estimated_amount": t.estimated_amount, "publication_date": t.publication_date,
            "deadline": t.deadline, "status": t.status,
        })
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=marches_publics.csv"})


@tenders.get("/{tender_id}", response_model=TenderOut, summary="Détail d'un marché")
async def get_tender(tender_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from datetime import date as d
    tender = await TenderService(db).get_by_id(tender_id)
    if not tender:
        raise HTTPException(404, "Appel d'offres introuvable")
    out = TenderOut.model_validate(tender)
    if tender.deadline and tender.status == "open":
        out.days_until_deadline = (tender.deadline - d.today()).days
    return out


@tenders.get("/{tender_id}/download/{doc_type}",
             summary="Télécharger un document ARMP (piece|dao)")
async def download_armp_pdf(tender_id: uuid.UUID, doc_type: str,
                            db: AsyncSession = Depends(get_db)):
    """
    Proxy de téléchargement : résout l'iframe ARMP et streame le PDF au client.
    doc_type = "piece" (pièce d'origine) ou "dao" (dossier d'appel d'offres).
    """
    import httpx, re as _re
    if doc_type not in ("piece", "dao"):
        raise HTTPException(400, "doc_type doit être 'piece' ou 'dao'")

    tender = await TenderService(db).get_by_id(tender_id)
    if not tender:
        raise HTTPException(404, "Appel d'offres introuvable")

    # Extraire pub_type et pub_id depuis external_id (format "AO-12345") ou source_url
    ext_id = tender.external_id or ""
    m_ext = _re.match(r"^([A-Z\-]+)-(\d+)$", ext_id)
    if not m_ext and tender.source_url:
        m_ext = _re.search(r"type_publication=([A-Z\-]+)&id_publication=(\d+)", tender.source_url)
    if not m_ext:
        raise HTTPException(422, "Impossible de déterminer les identifiants ARMP pour ce marché")

    pub_type = m_ext.group(1)
    pub_id   = m_ext.group(2)

    # Construire l'URL de l'iframe ARMP
    if doc_type == "piece":
        iframe_url = f"https://pridesoft.armp.cm/0903_publications_dl?type_publication={pub_type}&id_publication={pub_id}"
    else:
        iframe_url = f"https://pridesoft.armp.cm/0903_dao_dl?type_publication={pub_type}&id_publication={pub_id}"

    _headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://armp.cm/",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30, headers=_headers) as client:
            # Récupérer la page HTML contenant l'iframe
            iframe_resp = await client.get(iframe_url)
            if iframe_resp.status_code == 404:
                raise HTTPException(404, "Ce document n'est pas disponible sur ARMP")
            if iframe_resp.status_code not in (200, 302):
                if tender.source_url:
                    return JSONResponse(status_code=409, content={
                        "detail": "ARMP n'a pas pu fournir le document directement. Ouvrez la page officielle pour poursuivre.",
                        "redirect_url": tender.source_url,
                    })
                raise HTTPException(502, f"ARMP a retourné HTTP {iframe_resp.status_code}")

            html = iframe_resp.text

            # Extraire l'URL du fichier depuis src="..." (peut contenir des espaces et être .docx/.pdf)
            # Pattern : tout ce qui est entre guillemets après src=
            doc_url = None
            m = _re.search(r'<iframe[^>]+src=["\']([^"\']+)["\']', html, _re.IGNORECASE)
            if m:
                doc_url = m.group(1).strip()

            if not doc_url:
                log.warning(f"URL introuvable dans la réponse ARMP ({pub_type}-{pub_id}): {html[:300]}")
                if tender.source_url:
                    return JSONResponse(status_code=409, content={
                        "detail": "ARMP n'a pas fourni de lien de téléchargement exploitable. Ouvrez la page officielle pour récupérer le document.",
                        "redirect_url": tender.source_url,
                    })
                raise HTTPException(404, "Document non trouvé — ce marché n'a peut-être pas de document disponible")

            # L'URL peut être relative ou contenir des espaces — normaliser
            if doc_url.startswith('/'):
                doc_url = f"{iframe_resp.url.scheme}://{iframe_resp.url.host}{doc_url}"
            elif not doc_url.startswith('http'):
                doc_url = str(iframe_resp.url.join(doc_url))

            # Sécurité : ne jamais suivre une URL hors du domaine ARMP officiel
            # (empêche un HTML manipulé/compromis de faire fetcher une URL arbitraire par le serveur — SSRF)
            doc_host = _urlparse(doc_url).hostname or ""
            if doc_host != "armp.cm" and not doc_host.endswith(".armp.cm"):
                log.warning(f"URL hors domaine ARMP rejetée ({pub_type}-{pub_id}): {doc_url}")
                if tender.source_url:
                    return JSONResponse(status_code=409, content={
                        "detail": "ARMP a fourni un lien invalide. Ouvrez la page officielle pour récupérer le document.",
                        "redirect_url": tender.source_url,
                    })
                raise HTTPException(502, "Lien de document invalide fourni par ARMP")

            doc_url_encoded = quote(doc_url, safe=':/?=&%')

            # Télécharger le document avec le bon Referer
            doc_headers = {**_headers, "Referer": str(iframe_resp.url)}
            doc_resp = await client.get(doc_url_encoded, headers=doc_headers)
            if doc_resp.status_code != 200:
                if tender.source_url:
                    return JSONResponse(status_code=409, content={
                        "detail": "Le document n'est pas directement accessible sur ARMP. La page officielle a été ouverte pour finaliser le téléchargement.",
                        "redirect_url": tender.source_url,
                    })
                raise HTTPException(502, f"Impossible de récupérer le document (HTTP {doc_resp.status_code})")

            content_type = doc_resp.headers.get("content-type", "application/octet-stream")
            if "html" in content_type:
                if tender.source_url:
                    return JSONResponse(status_code=409, content={
                        "detail": "Le document n'est pas encore disponible sur ARMP. Ouvrez la page officielle pour vérifier le fichier.",
                        "redirect_url": tender.source_url,
                    })
                raise HTTPException(404, "Le document n'est pas encore disponible sur ARMP")

            # Déduire l'extension et le nom de fichier depuis l'URL
            ext = doc_url.rsplit(".", 1)[-1].lower() if "." in doc_url.rsplit("/", 1)[-1] else "pdf"
            label = "piece_origine" if doc_type == "piece" else "dao"
            filename = f"{pub_type}_{pub_id}_{label}.{ext}"

            # Content-type correct selon l'extension
            mime_map = {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "doc": "application/msword", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
            mime = mime_map.get(ext, "application/octet-stream")

            return StreamingResponse(
                iter([doc_resp.content]),
                media_type=mime,
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Length": str(len(doc_resp.content)),
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"download_armp_pdf error ({pub_type}-{pub_id}): {e}")
        raise HTTPException(502, f"Erreur lors du téléchargement : {str(e)}")


# ════════════════════════════════════════════════════════════════
#  ALERTS
# ════════════════════════════════════════════════════════════════

alerts_r = APIRouter(prefix="/alerts", tags=["Alertes de veille"])


@alerts_r.get("", response_model=list[AlertOut], summary="Mes alertes")
async def list_alerts(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    svc = AlertService(db)
    result = []
    for a in await svc.get_by_user(current_user.id):
        out = AlertOut.model_validate(a)
        out.match_preview = await svc.count_preview(current_user.id, {
            "sectors": a.sectors, "regions": a.regions, "keywords": a.keywords,
            "min_amount": a.min_amount, "max_amount": a.max_amount,
        })
        result.append(out)
    return result


@alerts_r.post("", response_model=AlertOut, status_code=201, summary="Créer une alerte")
async def create_alert(data: AlertCreate, current_user=Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    svc = AlertService(db)
    alert = await svc.create(current_user.id, data.model_dump())
    await log_action(db, current_user.id, "alert.create", "alert", alert.id)
    out = AlertOut.model_validate(alert)
    out.match_preview = await svc.count_preview(current_user.id, data.model_dump())
    return out


@alerts_r.get("/preview", summary="Aperçu : combien de marchés correspondent ?")
async def preview(sectors: str = "", regions: str = "", keywords: str = "",
                  min_amount: int = None, max_amount: int = None,
                  current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    count = await AlertService(db).count_preview(current_user.id, {
        "sectors":  [s.strip() for s in sectors.split(",")  if s.strip()],
        "regions":  [r.strip() for r in regions.split(",")  if r.strip()],
        "keywords": [k.strip() for k in keywords.split(",") if k.strip()],
        "min_amount": min_amount, "max_amount": max_amount,
    })
    return {"count": count, "period": "30 derniers jours"}


@alerts_r.get("/notifications", response_model=list[NotificationOut], summary="Mes notifications")
async def notifications(unread_only: bool = False, current_user=Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select as sel
    from app.models.models import AlertMatch, Alert as A, Tender as T
    q = (sel(AlertMatch, A.name, T.reference, T.title)
         .join(A, AlertMatch.alert_id == A.id)
         .join(T, AlertMatch.tender_id == T.id)
         .where(A.user_id == current_user.id))
    if unread_only:
        q = q.where(AlertMatch.notified == False)
    q = q.order_by(AlertMatch.matched_at.desc()).limit(50)
    rows = (await db.execute(q)).all()
    return [NotificationOut(id=row.AlertMatch.id, alert_name=row.name,
                            tender_ref=row.reference, tender_title=row.title,
                            notified=row.AlertMatch.notified, matched_at=row.AlertMatch.matched_at)
            for row in rows]


@alerts_r.get("/{alert_id}", response_model=AlertOut, summary="Détail d'une alerte")
async def get_alert(alert_id: uuid.UUID, current_user=Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    alert = await AlertService(db).get_by_id(alert_id, current_user.id)
    if not alert:
        raise HTTPException(404, "Alerte introuvable")
    return AlertOut.model_validate(alert)


@alerts_r.patch("/{alert_id}", response_model=AlertOut, summary="Modifier une alerte")
async def update_alert(alert_id: uuid.UUID, data: AlertUpdate,
                       current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    svc = AlertService(db)
    if not await svc.get_by_id(alert_id, current_user.id):
        raise HTTPException(404, "Alerte introuvable")
    updated = await svc.update(alert_id, current_user.id, data.model_dump(exclude_none=True))
    return AlertOut.model_validate(updated)


@alerts_r.patch("/{alert_id}/toggle", response_model=AlertOut, summary="Activer/désactiver")
async def toggle_alert(alert_id: uuid.UUID, current_user=Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    svc = AlertService(db)
    alert = await svc.get_by_id(alert_id, current_user.id)
    if not alert:
        raise HTTPException(404, "Alerte introuvable")
    updated = await svc.update(alert_id, current_user.id, {"active": not alert.active})
    return AlertOut.model_validate(updated)


@alerts_r.delete("/{alert_id}", status_code=204, summary="Supprimer une alerte")
async def delete_alert(alert_id: uuid.UUID, current_user=Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    svc = AlertService(db)
    if not await svc.get_by_id(alert_id, current_user.id):
        raise HTTPException(404, "Alerte introuvable")
    await svc.delete(alert_id, current_user.id)
    await log_action(db, current_user.id, "alert.delete", "alert", alert_id)


# ════════════════════════════════════════════════════════════════
#  DOCUMENTS
# ════════════════════════════════════════════════════════════════

docs_r = APIRouter(prefix="/documents", tags=["Documents IA"])


@docs_r.get("/types", summary="Types de documents disponibles (public)")
async def doc_types():
    from app.schemas.schemas import DOCUMENT_LABELS
    return [{"type": t, "label": DOCUMENT_LABELS[t]} for t in DOCUMENT_TYPES]


@docs_r.get("", response_model=list[DocumentListOut], summary="Mes documents")
async def list_docs(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await DocumentService(db).list_by_user(current_user.id)


@docs_r.post("", response_model=DocumentOut, status_code=201, summary="Générer un document par IA")
async def generate_doc(req: DocumentGenerateRequest, current_user=Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    if req.type not in DOCUMENT_TYPES:
        raise HTTPException(422, f"Type invalide. Valeurs : {', '.join(DOCUMENT_TYPES)}")
    try:
        doc = await DocumentService(db).generate(current_user.id, req)
    except Exception as e:
        raise HTTPException(503, f"Génération IA impossible : {e}")
    await log_action(db, current_user.id, "doc.generate", "document", doc.id)
    return DocumentOut.model_validate(doc)


@docs_r.get("/{doc_id}", response_model=DocumentOut, summary="Détail d'un document")
async def get_doc(doc_id: uuid.UUID, current_user=Depends(get_current_user),
                  db: AsyncSession = Depends(get_db)):
    doc = await DocumentService(db).get_by_id(doc_id, current_user.id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    return DocumentOut.model_validate(doc)


@docs_r.patch("/{doc_id}", response_model=DocumentOut, summary="Modifier un document")
async def update_doc(doc_id: uuid.UUID, data: DocumentUpdate,
                     current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    svc = DocumentService(db)
    if not await svc.get_by_id(doc_id, current_user.id):
        raise HTTPException(404, "Document introuvable")
    updated = await svc.update(doc_id, current_user.id, data.model_dump(exclude_none=True))
    return DocumentOut.model_validate(updated)


@docs_r.delete("/{doc_id}", status_code=204, summary="Supprimer un document")
async def delete_doc(doc_id: uuid.UUID, current_user=Depends(get_current_user),
                     db: AsyncSession = Depends(get_db)):
    svc = DocumentService(db)
    if not await svc.get_by_id(doc_id, current_user.id):
        raise HTTPException(404, "Document introuvable")
    await svc.delete(doc_id, current_user.id)


@docs_r.get("/{doc_id}/download", summary="Télécharger le document")
async def download_doc(doc_id: uuid.UUID, current_user=Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    doc = await DocumentService(db).get_by_id(doc_id, current_user.id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    return StreamingResponse(
        iter([doc.content.encode("utf-8")]),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{doc.type}_{str(doc.id)[:8]}.txt"'},
    )


# ════════════════════════════════════════════════════════════════
#  DASHBOARD (public)
# ════════════════════════════════════════════════════════════════

dash_r = APIRouter(prefix="/dashboard", tags=["Transparence (public)"])


@dash_r.get("", response_model=DashboardFull, summary="Tableau de bord complet")
async def dashboard(db: AsyncSession = Depends(get_db)):
    return await DashboardService(db).get_full()


@dash_r.get("/stats", response_model=DashboardStats, summary="KPIs uniquement")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    return await DashboardService(db).get_stats()


# ════════════════════════════════════════════════════════════════
#  RECLAMATIONS
# ════════════════════════════════════════════════════════════════

recl_r = APIRouter(prefix="/reclamations", tags=["Réclamations"])


@recl_r.get("/types", summary="Types de réclamations disponibles (public)")
async def reclamation_types():
    labels = {
        "exclusion":     "Exclusion injustifiée",
        "specification": "Spécifications discriminatoires",
        "evaluation":    "Évaluation irrégulière",
        "attribution":   "Attribution irrégulière",
        "corruption":    "Corruption / Favoritisme",
        "delai":         "Délais non respectés",
        "autre":         "Autre irrégularité",
    }
    return [{"type": t, "label": labels[t]} for t in RECLAMATION_TYPES]


@recl_r.post("", response_model=ReclamationOut, status_code=201,
             summary="Soumettre une réclamation (authentification optionnelle)")
async def create_reclamation(
    req: ReclamationCreate, request: Request,
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if req.type not in RECLAMATION_TYPES:
        raise HTTPException(422, f"Type invalide. Valeurs : {', '.join(RECLAMATION_TYPES)}")
    user_id = str(current_user.id) if current_user else None
    svc = ReclamationService(db)
    recl = await svc.create(user_id, req.model_dump())
    if user_id:
        await log_action(db, user_id, "reclamation.create", "reclamation", recl.id,
                         ip=request.client.host if request.client else None)
    return ReclamationOut.model_validate(recl)


@recl_r.get("/mes-reclamations", response_model=list[ReclamationOut],
            summary="Mes réclamations soumises")
async def my_reclamations(
    limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReclamationService(db).list_by_user(str(current_user.id), limit, offset)


@recl_r.get("/{recl_id}", response_model=ReclamationOut,
            summary="Détail d'une réclamation")
async def get_reclamation(
    recl_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = ReclamationService(db)
    # Un administrateur peut consulter n'importe quelle réclamation ; un utilisateur
    # standard uniquement les siennes (protection IDOR via le filtre user_id).
    owner_filter = None if current_user.role == "admin" else str(current_user.id)
    recl = await svc.get_by_id(recl_id, owner_filter)
    if not recl:
        raise HTTPException(404, "Réclamation introuvable")
    return ReclamationOut.model_validate(recl)


@recl_r.get("/admin/toutes", response_model=list[ReclamationOut],
            summary="Lister toutes les réclamations (admin)",
            dependencies=[Depends(require_role("admin"))])
async def admin_list_reclamations(
    statut: Optional[str] = Query(None),
    type_: Optional[str] = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    if statut and statut not in RECLAMATION_STATUTS:
        raise HTTPException(422, f"Statut invalide. Valeurs : {', '.join(RECLAMATION_STATUTS)}")
    if type_ and type_ not in RECLAMATION_TYPES:
        raise HTTPException(422, f"Type invalide. Valeurs : {', '.join(RECLAMATION_TYPES)}")
    return await ReclamationService(db).list_all(statut, type_, limit, offset)


@recl_r.patch("/{recl_id}", response_model=ReclamationOut,
              summary="Traiter une réclamation (admin)",
              dependencies=[Depends(require_role("admin"))])
async def admin_update_reclamation(
    recl_id: uuid.UUID, req: ReclamationAdminUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = req.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(422, "Aucune donnée à mettre à jour")
    if "statut" in data and data["statut"] in ("resolue", "rejetee", "classee"):
        from datetime import datetime as _dt
        data["traite_at"] = _dt.utcnow()
    recl = await ReclamationService(db).update(recl_id, data, actor_role=current_user.role)
    if not recl:
        raise HTTPException(404, "Réclamation introuvable")
    await log_action(db, current_user.id, "admin.reclamation.update", "reclamation", recl_id)
    return ReclamationOut.model_validate(recl)


# ── Enregistrement de tous les routers ───────────────────────────────────────
PREFIX = "/api/v1"

def include_all(app):
    app.include_router(auth,     prefix=PREFIX)
    app.include_router(admin_users_r, prefix=PREFIX)
    app.include_router(chat_r,   prefix=PREFIX)
    app.include_router(tenders,  prefix=PREFIX)
    app.include_router(alerts_r, prefix=PREFIX)
    app.include_router(docs_r,   prefix=PREFIX)
    app.include_router(dash_r,   prefix=PREFIX)
    app.include_router(recl_r,   prefix=PREFIX)
