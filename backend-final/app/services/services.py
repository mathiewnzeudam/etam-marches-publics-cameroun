"""
Services métier — toute la logique de la plateforme.
Chaque classe gère une responsabilité précise.
"""
from __future__ import annotations
import uuid, time, hashlib, json, logging, smtplib, asyncio, re
from datetime import datetime, timedelta, date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import AsyncGenerator, Optional

from fastapi import HTTPException
import anthropic
from groq import AsyncGroq
import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    import google.generativeai as genai
import httpx
import redis.asyncio as aioredis
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
from sqlalchemy import select, update, func, or_, and_, extract, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.models import (
    User, Tender, Conversation, Message,
    Alert, AlertMatch, Document, AuditLog, SyncJob, Reclamation
)
from app.schemas.schemas import (
    ChatMessage, RAGSource, TenderOut, TenderListResponse,
    DashboardStats, TendersByMonth, TendersBySector,
    TendersByRegion, TendersByProcedure, TopAuthority, DashboardFull,
    DOCUMENT_LABELS
)

log = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════
#  USER SERVICE
# ════════════════════════════════════════════════════════════════

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str | uuid.UUID) -> Optional[User]:
        r = await self.db.execute(select(User).where(User.id == uuid.UUID(str(user_id))))
        return r.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        r = await self.db.execute(select(User).where(User.email == email.lower().strip()))
        return r.scalar_one_or_none()

    async def create(self, data: dict) -> User:
        data["email"] = data["email"].lower().strip()
        user = User(**{k: v for k, v in data.items() if hasattr(User, k)})
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user_id: uuid.UUID, data: dict) -> Optional[User]:
        data = {k: v for k, v in data.items() if v is not None and hasattr(User, k)}
        if data:
            await self.db.execute(update(User).where(User.id == user_id).values(**data))
            await self.db.commit()
        return await self.get_by_id(user_id)

    async def update_last_login(self, user_id: uuid.UUID):
        await self.db.execute(update(User).where(User.id == user_id).values(last_login=datetime.utcnow()))
        await self.db.commit()

    async def list_all(self, role: str | None = None, search: str | None = None,
                       limit: int = 50, offset: int = 0) -> list[User]:
        q = select(User).order_by(User.created_at.desc())
        if role:
            q = q.where(User.role == role)
        if search:
            like = f"%{search.lower()}%"
            q = q.where(or_(func.lower(User.email).like(like), func.lower(User.full_name).like(like)))
        q = q.limit(limit).offset(offset)
        r = await self.db.execute(q)
        return list(r.scalars().all())

    async def count_all(self) -> int:
        r = await self.db.execute(select(func.count()).select_from(User))
        return r.scalar_one()

    async def set_active(self, user_id: uuid.UUID, is_active: bool) -> Optional[User]:
        await self.db.execute(update(User).where(User.id == user_id).values(is_active=is_active))
        await self.db.commit()
        return await self.get_by_id(user_id)


# ════════════════════════════════════════════════════════════════
#  CONVERSATION SERVICE
# ════════════════════════════════════════════════════════════════

class ConversationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self, user_id: uuid.UUID, conv_id: Optional[uuid.UUID]) -> Conversation:
        if conv_id:
            r = await self.db.execute(
                select(Conversation).where(
                    Conversation.id == conv_id,
                    Conversation.user_id == user_id,
                    Conversation.status == "active",
                )
            )
            conv = r.scalar_one_or_none()
            if conv:
                return conv
        conv = Conversation(user_id=user_id)
        self.db.add(conv)
        await self.db.commit()
        await self.db.refresh(conv)
        return conv

    async def get_history(self, conv_id: uuid.UUID, limit: int = 10) -> list[ChatMessage]:
        r = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conv_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        msgs = r.scalars().all()
        return [ChatMessage(role=m.role, content=m.content) for m in reversed(msgs)]

    async def save_message(self, conv_id: uuid.UUID, role: str, content: str,
                           sources=None, tokens_input=None, tokens_output=None,
                           latency_ms=None, model_used=None) -> Message:
        if role == "user":
            await self._auto_title(conv_id, content)
        msg = Message(conversation_id=conv_id, role=role, content=content,
                      sources=sources, tokens_input=tokens_input, tokens_output=tokens_output,
                      latency_ms=latency_ms, model_used=model_used)
        self.db.add(msg)
        await self.db.execute(
            update(Conversation).where(Conversation.id == conv_id).values(updated_at=datetime.utcnow())
        )
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def update_feedback(self, msg_id: uuid.UUID, user_id: uuid.UUID, score: int):
        r = await self.db.execute(
            select(Message).join(Conversation, Message.conversation_id == Conversation.id)
            .where(Message.id == msg_id, Conversation.user_id == user_id)
        )
        msg = r.scalar_one_or_none()
        if msg:
            msg.feedback = score
            await self.db.commit()

    async def list_conversations(self, user_id: uuid.UUID, limit: int = 20, offset: int = 0):
        r = await self.db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.status == "active")
            .order_by(Conversation.updated_at.desc())
            .limit(limit).offset(offset)
        )
        return r.scalars().all()

    async def archive(self, conv_id: uuid.UUID, user_id: uuid.UUID):
        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conv_id, Conversation.user_id == user_id)
            .values(status="archived")
        )
        await self.db.commit()

    async def _auto_title(self, conv_id: uuid.UUID, first_msg: str):
        r = await self.db.execute(select(func.count()).where(Message.conversation_id == conv_id))
        if r.scalar() == 0:
            title = first_msg[:60] + ("..." if len(first_msg) > 60 else "")
            await self.db.execute(update(Conversation).where(Conversation.id == conv_id).values(title=title))


# ════════════════════════════════════════════════════════════════
#  TENDER SERVICE
# ════════════════════════════════════════════════════════════════

class TenderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self, search=None, status=None, sector=None, region=None,
                   procedure_type=None, min_amount=None, max_amount=None,
                   date_from=None, date_to=None,
                   page=1, limit=20, sort_by="publication_date", sort_dir="desc") -> TenderListResponse:
        q = select(Tender)
        conds = []
        if search:
            t = f"%{search}%"
            conds.append(or_(Tender.title.ilike(t), Tender.reference.ilike(t), Tender.authority.ilike(t)))
        if status:       conds.append(Tender.status == status)
        if sector:       conds.append(Tender.sector == sector)
        if region:       conds.append(Tender.region == region)
        if procedure_type: conds.append(Tender.procedure_type == procedure_type)
        if min_amount is not None: conds.append(Tender.estimated_amount >= min_amount)
        if max_amount is not None: conds.append(Tender.estimated_amount <= max_amount)
        if date_from:    conds.append(Tender.publication_date >= date_from)
        if date_to:      conds.append(Tender.publication_date <= date_to)
        if conds:
            q = q.where(and_(*conds))

        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar()
        col = getattr(Tender, sort_by, Tender.publication_date)
        q = q.order_by(col.asc().nullslast() if sort_dir == "asc" else col.desc().nullslast())
        q = q.offset((page - 1) * limit).limit(limit)
        rows = (await self.db.execute(q)).scalars().all()

        today = date.today()
        items = []
        for r in rows:
            out = TenderOut.model_validate(r)
            if r.deadline and r.status == "open":
                out.days_until_deadline = (r.deadline - today).days
            items.append(out)

        return TenderListResponse(
            items=items, total=total, page=page,
            pages=max(1, -(-total // limit)), limit=limit,
        )

    async def get_by_id(self, tender_id: uuid.UUID) -> Optional[Tender]:
        r = await self.db.execute(select(Tender).where(Tender.id == tender_id))
        return r.scalar_one_or_none()

    async def upsert_tender(self, data: dict) -> bool:
        # Toute exception ici doit être suivie d'un rollback avant de retourner la main à
        # l'appelant : sans ça, la session reste dans un état "transaction avortée" et TOUTES
        # les lignes suivantes d'un même lot (scraping de centaines de marchés) échouent en
        # cascade même si elles sont valides — bug observé en production (0/469 insérés).
        try:
            existing = None
            if data.get("external_id"):
                r = await self.db.execute(select(Tender).where(Tender.external_id == data["external_id"]))
                existing = r.scalar_one_or_none()
            if existing:
                for k, v in data.items():
                    if hasattr(existing, k) and v is not None:
                        setattr(existing, k, v)
                existing.synced_at = datetime.utcnow()
                await self.db.commit()
                return False
            tender = Tender(**{k: v for k, v in data.items() if hasattr(Tender, k)})
            self.db.add(tender)
            await self.db.commit()
            return True
        except Exception:
            await self.db.rollback()
            raise

    async def get_recent(self, since: datetime) -> list[Tender]:
        r = await self.db.execute(
            select(Tender).where(Tender.synced_at >= since).order_by(Tender.synced_at.desc())
        )
        return r.scalars().all()

    async def close_expired(self) -> int:
        r = await self.db.execute(
            update(Tender)
            .where(Tender.status == "open", Tender.deadline < date.today(), Tender.deadline.isnot(None))
            .values(status="closed")
        )
        await self.db.commit()
        return r.rowcount

    # Sync jobs
    async def create_sync_job(self, source: str) -> uuid.UUID:
        job = SyncJob(source=source, status="running")
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job.id

    async def complete_sync_job(self, job_id: uuid.UUID, records_synced: int):
        await self.db.execute(
            update(SyncJob).where(SyncJob.id == job_id)
            .values(status="success", records_synced=records_synced, finished_at=datetime.utcnow())
        )
        await self.db.commit()

    async def fail_sync_job(self, job_id: uuid.UUID, error: str):
        await self.db.execute(
            update(SyncJob).where(SyncJob.id == job_id)
            .values(status="failed", error_message=error, finished_at=datetime.utcnow())
        )
        await self.db.commit()


# ════════════════════════════════════════════════════════════════
#  ALERT SERVICE
# ════════════════════════════════════════════════════════════════

class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, data: dict) -> Alert:
        alert = Alert(user_id=user_id, **{k: v for k, v in data.items() if hasattr(Alert, k)})
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def get_by_user(self, user_id: uuid.UUID) -> list[Alert]:
        r = await self.db.execute(
            select(Alert).where(Alert.user_id == user_id).order_by(Alert.created_at.desc())
        )
        return r.scalars().all()

    async def get_by_id(self, alert_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Alert]:
        r = await self.db.execute(
            select(Alert).where(Alert.id == alert_id, Alert.user_id == user_id)
        )
        return r.scalar_one_or_none()

    async def update(self, alert_id: uuid.UUID, user_id: uuid.UUID, data: dict) -> Optional[Alert]:
        data = {k: v for k, v in data.items() if v is not None and hasattr(Alert, k)}
        await self.db.execute(update(Alert).where(Alert.id == alert_id, Alert.user_id == user_id).values(**data))
        await self.db.commit()
        return await self.get_by_id(alert_id, user_id)

    async def delete(self, alert_id: uuid.UUID, user_id: uuid.UUID):
        alert = await self.get_by_id(alert_id, user_id)
        if alert:
            await self.db.delete(alert)
            await self.db.commit()

    async def get_active_alerts(self) -> list[Alert]:
        r = await self.db.execute(
            select(Alert).where(Alert.active == True).options(selectinload(Alert.user))
        )
        return r.scalars().all()

    async def find_matches(self, alert: Alert, since: datetime) -> list[Tender]:
        conds = [Tender.synced_at >= since, Tender.status == "open"]
        if alert.sectors:  conds.append(Tender.sector.in_(alert.sectors))
        if alert.regions:  conds.append(Tender.region.in_(alert.regions))
        if alert.min_amount is not None:
            conds.append(or_(Tender.estimated_amount >= alert.min_amount, Tender.estimated_amount.is_(None)))
        if alert.max_amount is not None:
            conds.append(or_(Tender.estimated_amount <= alert.max_amount, Tender.estimated_amount.is_(None)))
        if alert.keywords:
            conds.append(or_(*[Tender.title.ilike(f"%{kw}%") for kw in alert.keywords]))
        r = await self.db.execute(select(Tender).where(and_(*conds)).order_by(Tender.synced_at.desc()).limit(50))
        return r.scalars().all()

    async def is_notified(self, alert_id: uuid.UUID, tender_id: uuid.UUID) -> bool:
        r = await self.db.execute(
            select(AlertMatch).where(AlertMatch.alert_id == alert_id, AlertMatch.tender_id == tender_id)
        )
        return r.scalar_one_or_none() is not None

    async def mark_notified(self, alert_id: uuid.UUID, tender_id: uuid.UUID):
        match = AlertMatch(alert_id=alert_id, tender_id=tender_id, notified=True, notified_at=datetime.utcnow())
        self.db.add(match)
        await self.db.execute(update(Alert).where(Alert.id == alert_id).values(last_fired=datetime.utcnow()))
        await self.db.commit()

    async def count_preview(self, user_id: uuid.UUID, data: dict) -> int:
        alert = Alert(user_id=user_id, **{k: v for k, v in data.items() if hasattr(Alert, k)})
        since = datetime.utcnow() - timedelta(days=30)
        matches = await self.find_matches(alert, since)
        return len(matches)


# ════════════════════════════════════════════════════════════════
#  DOCUMENT SERVICE
# ════════════════════════════════════════════════════════════════

DOCUMENT_PROMPTS = {
    "submission_letter": (
        "Tu es expert en marchés publics camerounais (Décret n°2018/366). "
        "Génère une lettre de soumission officielle complète : en-tête société, objet précis avec référence, "
        "déclaration de candidature, engagement sur les délais, validité de l'offre, signature. "
        "Langage juridique formel. Indique [À COMPLÉTER] si information manquante. "
        "Génère UNIQUEMENT le texte du document."
    ),
    "technical_offer": (
        "Tu es expert en marchés publics camerounais. Génère une offre technique structurée : "
        "compréhension du besoin, méthodologie, planning, équipe proposée, moyens matériels, références similaires. "
        "Format professionnel conforme COLEPS. Génère UNIQUEMENT le texte."
    ),
    "financial_offer": (
        "Tu es expert en marchés publics camerounais. Génère une offre financière avec bordereau des prix, "
        "TVA 19.25%, montant HT et TTC, conditions de paiement, validité. Génère UNIQUEMENT le texte."
    ),
    "qualification_file": (
        "Tu es expert en marchés publics camerounais. Génère un dossier de qualification listant toutes "
        "les pièces requises par le Code des marchés 2018 : DGI, CNPS, RCCM, NINEA, bilans, références. "
        "Génère UNIQUEMENT le document structuré."
    ),
    "recourse": (
        "Tu es juriste spécialisé marchés publics camerounais. Génère une requête de recours formelle "
        "adressée à l'ARMP (Article 74 du Code). Structure : identification requérant, marché contesté, "
        "exposé des faits, motifs juridiques avec articles de loi, demande, pièces jointes. "
        "Délai: 5 jours ouvrables. Génère UNIQUEMENT le texte de la requête."
    ),
    "contract_draft": (
        "Tu es expert en droit des marchés publics camerounais. Génère un projet de marché conforme "
        "au Décret n°2018/366 avec toutes les clauses obligatoires : objet, parties, prix, délais, "
        "paiement, garanties, pénalités, résiliation, litiges (OHADA). Génère UNIQUEMENT le texte."
    ),
}


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> tuple[str, int]:
        """Appelle Groq, Gemini ou Anthropic selon LLM_PROVIDER. Retourne (texte, tokens)."""
        if settings.LLM_PROVIDER == "groq":
            client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            resp = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "system", "content": system_prompt},
                          {"role": "user", "content": user_prompt}],
                max_tokens=3000, temperature=0.2,
            )
            text = resp.choices[0].message.content
            tokens = resp.usage.total_tokens if resp.usage else 0
            return text, tokens
        elif settings.LLM_PROVIDER == "gemini":
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name=settings.LLM_MODEL,
                system_instruction=system_prompt,
            )
            response = await asyncio.to_thread(
                model.generate_content, user_prompt,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=3000, temperature=0.2
                )
            )
            text = response.text
            tokens = response.usage_metadata.total_token_count if response.usage_metadata else 0
            return text, tokens
        else:
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model=settings.LLM_MODEL, max_tokens=3000, temperature=0.2,
                system=system_prompt, messages=[{"role": "user", "content": user_prompt}],
            )
            text = response.content[0].text
            tokens = response.usage.input_tokens + response.usage.output_tokens
            return text, tokens

    async def generate(self, user_id: uuid.UUID, req) -> Document:
        system_prompt = DOCUMENT_PROMPTS.get(req.type, DOCUMENT_PROMPTS["submission_letter"])
        user_prompt = self._build_prompt(req)
        content, tokens = await self._call_llm(system_prompt, user_prompt)
        title = f"{DOCUMENT_LABELS.get(req.type, req.type)} — {req.tender_reference or req.tender_title or 'Sans référence'}"
        doc = Document(
            user_id=user_id, tender_id=req.tender_id, type=req.type,
            title=title, content=content,
            metadata_={"company_name": req.company_name, "representative": req.representative,
                       "tokens": tokens,
                       "generated_at": datetime.utcnow().isoformat()},
        )
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        return doc

    async def list_by_user(self, user_id: uuid.UUID) -> list[Document]:
        r = await self.db.execute(
            select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
        )
        return r.scalars().all()

    async def get_by_id(self, doc_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Document]:
        r = await self.db.execute(
            select(Document).where(Document.id == doc_id, Document.user_id == user_id)
        )
        return r.scalar_one_or_none()

    async def update(self, doc_id: uuid.UUID, user_id: uuid.UUID, data: dict) -> Optional[Document]:
        data = {k: v for k, v in data.items() if v is not None and hasattr(Document, k)}
        await self.db.execute(update(Document).where(Document.id == doc_id, Document.user_id == user_id).values(**data))
        await self.db.commit()
        return await self.get_by_id(doc_id, user_id)

    async def delete(self, doc_id: uuid.UUID, user_id: uuid.UUID):
        doc = await self.get_by_id(doc_id, user_id)
        if doc:
            await self.db.delete(doc)
            await self.db.commit()

    def _build_prompt(self, req) -> str:
        parts = [
            f"TYPE DE DOCUMENT : {DOCUMENT_LABELS.get(req.type, req.type)}",
            f"\nINFORMATIONS ENTREPRISE :",
            f"- Raison sociale   : {req.company_name}",
            f"- NINEA            : {req.company_ninea or 'À compléter'}",
            f"- Adresse          : {req.company_address or 'À compléter'}",
            f"- Représentant     : {req.representative}",
            f"- Email            : {req.contact_email or 'À compléter'}",
            f"- Téléphone        : {req.contact_phone or 'À compléter'}",
        ]
        if req.tender_reference or req.tender_title:
            parts.append("\nMARCHÉ CONCERNÉ :")
            if req.tender_reference: parts.append(f"- Référence : {req.tender_reference}")
            if req.tender_title:     parts.append(f"- Intitulé  : {req.tender_title}")
        if req.proposed_amount:    parts.append(f"\nMONTANT PROPOSÉ    : {req.proposed_amount:,} FCFA HT")
        if req.execution_duration: parts.append(f"DÉLAI D'EXÉCUTION  : {req.execution_duration}")
        if req.validity_duration:  parts.append(f"VALIDITÉ DE L'OFFRE: {req.validity_duration}")
        if req.recourse_grounds:   parts.append(f"\nMOTIFS DU RECOURS :\n{req.recourse_grounds}")
        if req.recourse_stage:     parts.append(f"ÉTAPE CONTESTÉE    : {req.recourse_stage}")
        if req.additional_params:  parts.append(f"\nINFOS COMPLÉMENTAIRES : {req.additional_params}")
        parts.append("\nGénère le document complet maintenant :")
        return "\n".join(parts)


# ════════════════════════════════════════════════════════════════
#  NOTIFICATION SERVICE
# ════════════════════════════════════════════════════════════════

class NotificationService:

    async def send(self, alert: Alert, tender: Tender, channel: str):
        subject, text, html = self._build(alert, tender)
        if channel in ("email", "all"):
            if alert.user and alert.user.email:
                await self._email(alert.user.email, subject, text, html)
            else:
                log.warning(f"Alerte {alert.id} : email destinataire introuvable, notification ignorée")
        if channel in ("whatsapp", "all"):
            if alert.user and alert.user.phone:
                await self._whatsapp(alert.user.phone, alert, tender)
            else:
                log.warning(f"Alerte {alert.id} : téléphone destinataire introuvable, notification WhatsApp ignorée")

    def _build(self, alert, tender):
        deadline = tender.deadline.strftime("%d/%m/%Y") if tender.deadline else "Non précisé"
        amount   = f"{tender.estimated_amount:,} FCFA" if tender.estimated_amount else "Non précisé"
        subject  = f"[Marché-IA] Nouveau marché : {tender.reference}"
        text = (
            f"Bonjour,\n\nUn nouveau marché correspond à votre alerte « {alert.name} » :\n\n"
            f"Référence  : {tender.reference}\nIntitulé   : {tender.title}\n"
            f"Autorité   : {tender.authority}\nMontant    : {amount}\nDate limite: {deadline}\n\n"
            f"Détail : https://marche-ia.cm/tenders/{tender.id}\n\nCordialement,\nMarché-IA Cameroun"
        )
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px">
          <div style="background:#1B3A6B;padding:20px;text-align:center">
            <h2 style="color:#fff;margin:0">Marché-IA Cameroun</h2>
          </div>
          <div style="padding:24px;background:#f9f9f9">
            <p>Un nouveau marché correspond à votre alerte <b>« {alert.name} »</b></p>
            <table style="width:100%;border-collapse:collapse">
              <tr style="background:#1B3A6B;color:#fff"><td style="padding:8px">Champ</td><td style="padding:8px">Valeur</td></tr>
              <tr><td style="padding:8px;border:1px solid #eee">Référence</td><td style="padding:8px;border:1px solid #eee">{tender.reference}</td></tr>
              <tr><td style="padding:8px;border:1px solid #eee">Intitulé</td><td style="padding:8px;border:1px solid #eee">{tender.title}</td></tr>
              <tr><td style="padding:8px;border:1px solid #eee">Autorité</td><td style="padding:8px;border:1px solid #eee">{tender.authority}</td></tr>
              <tr><td style="padding:8px;border:1px solid #eee">Montant</td><td style="padding:8px;border:1px solid #eee">{amount}</td></tr>
              <tr><td style="padding:8px;border:1px solid #eee;color:#DC2626"><b>Date limite</b></td><td style="padding:8px;border:1px solid #eee;color:#DC2626"><b>{deadline}</b></td></tr>
            </table>
            <a href="https://marche-ia.cm/tenders/{tender.id}"
               style="display:inline-block;margin-top:16px;background:#1B3A6B;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">
              Voir le marché →
            </a>
          </div>
          <div style="padding:12px;text-align:center;font-size:12px;color:#999">
            <a href="https://marche-ia.cm/alerts">Gérer mes alertes</a>
          </div>
        </div>"""
        return subject, text, html

    @staticmethod
    def _send_smtp(to_email, subject, text, html):
        """Bloquant (I/O réseau synchrone) — toujours appelé via asyncio.to_thread pour ne pas geler l'event loop."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as srv:
            srv.starttls()
            srv.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            srv.send_message(msg)

    async def _email(self, to_email, subject, text, html):
        if not settings.SMTP_HOST:
            log.warning("SMTP non configuré")
            return
        try:
            await asyncio.to_thread(self._send_smtp, to_email, subject, text, html)
        except Exception as e:
            log.error(f"Email error: {e}")

    async def _whatsapp(self, to_phone, alert, tender):
        if not settings.WHATSAPP_TOKEN:
            log.warning("WhatsApp non configuré")
            return
        deadline = tender.deadline.strftime("%d/%m/%Y") if tender.deadline else "N/A"
        msg_text = (
            f"*Marché-IA* — Alerte « {alert.name} »\n\n"
            f"📋 *{tender.reference}*\n{tender.title}\n\n"
            f"🏛️ {tender.authority}\n⏰ Date limite : *{deadline}*\n\n"
            f"👉 https://marche-ia.cm/tenders/{tender.id}"
        )
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_ID}/messages",
                    headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
                    json={"messaging_product": "whatsapp", "to": to_phone,
                          "type": "text", "text": {"body": msg_text}},
                )
        except Exception as e:
            log.error(f"WhatsApp error: {e}")


# ════════════════════════════════════════════════════════════════
#  DASHBOARD SERVICE
# ════════════════════════════════════════════════════════════════

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_full(self) -> DashboardFull:
        return DashboardFull(
            stats=await self.get_stats(),
            by_month=await self._by_month(),
            by_sector=await self._by_sector(),
            by_region=await self._by_region(),
            by_procedure=await self._by_procedure(),
            top_authorities=await self._top_authorities(),
        )

    async def get_stats(self) -> DashboardStats:
        year = date.today().year
        r = await self.db.execute(select(
            func.count().label("total"),
            func.count().filter(Tender.status == "open").label("open"),
            func.count().filter(Tender.status == "awarded").label("awarded"),
            func.count().filter(Tender.status == "cancelled").label("cancelled"),
            func.sum(Tender.estimated_amount).label("total_amount"),
            func.avg(Tender.estimated_amount).label("avg_amount"),
        ).where(extract("year", Tender.publication_date) == year))
        row = r.one()
        last_sync = (await self.db.execute(
            select(SyncJob.finished_at).where(SyncJob.status == "success")
            .order_by(SyncJob.finished_at.desc()).limit(1)
        )).scalar()
        return DashboardStats(
            total_tenders=row.total or 0, open_tenders=row.open or 0,
            awarded_tenders=row.awarded or 0, cancelled_tenders=row.cancelled or 0,
            total_amount_fcfa=int(row.total_amount) if row.total_amount else None,
            avg_amount_fcfa=int(row.avg_amount) if row.avg_amount else None,
            avg_award_days=None,
            last_sync_at=last_sync.isoformat() if last_sync else None,
        )

    async def _by_month(self):
        r = await self.db.execute(select(
            func.to_char(Tender.publication_date, "YYYY-MM").label("month"),
            func.count().label("total"),
            func.count().filter(Tender.status == "open").label("open"),
            func.count().filter(Tender.status == "awarded").label("awarded"),
            func.count().filter(Tender.status == "cancelled").label("cancelled"),
        ).where(Tender.publication_date >= date(date.today().year - 1, date.today().month, 1))
        .group_by("month").order_by("month"))
        return [TendersByMonth(month=row.month, total=row.total, open=row.open,
                               awarded=row.awarded, cancelled=row.cancelled) for row in r.all()]

    async def _by_sector(self):
        r = await self.db.execute(select(
            Tender.sector, func.count().label("total"),
            func.sum(Tender.estimated_amount).label("total_amount"),
        ).where(Tender.sector.isnot(None)).group_by(Tender.sector).order_by(func.count().desc()))
        rows = r.all()
        grand = sum(row.total for row in rows) or 1
        return [TendersBySector(sector=row.sector, total=row.total,
                                total_amount=int(row.total_amount) if row.total_amount else None,
                                pct=round(row.total / grand * 100, 1)) for row in rows]

    async def _by_region(self):
        r = await self.db.execute(select(
            Tender.region, func.count().label("total"),
            func.sum(Tender.estimated_amount).label("total_amount"),
        ).where(Tender.region.isnot(None)).group_by(Tender.region).order_by(func.count().desc()))
        return [TendersByRegion(region=row.region, total=row.total,
                                total_amount=int(row.total_amount) if row.total_amount else None) for row in r.all()]

    async def _by_procedure(self):
        r = await self.db.execute(select(
            Tender.procedure_type, func.count().label("total"),
        ).where(Tender.procedure_type.isnot(None)).group_by(Tender.procedure_type).order_by(func.count().desc()))
        rows = r.all()
        grand = sum(row.total for row in rows) or 1
        return [TendersByProcedure(procedure_type=row.procedure_type, total=row.total,
                                   pct=round(row.total / grand * 100, 1)) for row in rows]

    async def _top_authorities(self):
        r = await self.db.execute(select(
            Tender.authority, func.count().label("total"),
            func.sum(Tender.estimated_amount).label("total_amount"),
        ).group_by(Tender.authority).order_by(func.count().desc()).limit(10))
        return [TopAuthority(authority=row.authority, total=row.total,
                             total_amount=int(row.total_amount) if row.total_amount else None) for row in r.all()]


# ════════════════════════════════════════════════════════════════
#  RAG SERVICE
# ════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Tu es un expert spécialisé dans le Code des marchés publics camerounais \
(Décret n°2018/366 du 20 juin 2018 et textes d'application).

RÈGLES ABSOLUES :
1. Cite toujours l'article ou le texte exact sur lequel tu te bases.
2. Si une information n'est pas dans le contexte fourni, dis-le clairement — n'invente JAMAIS.
3. Réponds en français par défaut, en anglais si l'utilisateur écrit en anglais.
4. Donne des réponses pratiques et actionnables, pas seulement théoriques.
5. Signale toujours les délais légaux quand ils sont pertinents.
6. Pour les recours, précise les délais et la procédure ARMP (Article 74).

FORMAT : Réponse directe en 2-3 paragraphes max. Sources citées en fin. Ton professionnel mais accessible."""


class RAGService:
    def __init__(self):
        self._model: Optional[SentenceTransformer] = None
        self._qdrant: Optional[AsyncQdrantClient] = None
        self._anthropic: Optional[anthropic.AsyncAnthropic] = None
        self._gemini: Optional[genai.GenerativeModel] = None
        self._groq: Optional[AsyncGroq] = None
        self._redis: Optional[aioredis.Redis] = None

    async def initialize(self):
        self._model  = SentenceTransformer(settings.EMBEDDING_MODEL)
        self._qdrant = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)
        if settings.LLM_PROVIDER == "gemini":
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._gemini = genai.GenerativeModel(
                model_name=settings.LLM_MODEL,
                system_instruction=SYSTEM_PROMPT,
            )
        elif settings.LLM_PROVIDER == "groq":
            self._groq = AsyncGroq(api_key=settings.GROQ_API_KEY)
        else:
            self._anthropic = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._redis = await aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        log.info(f"RAGService initialisé avec provider={settings.LLM_PROVIDER}.")

    async def close(self):
        if self._redis:  await self._redis.aclose()
        if self._qdrant: await self._qdrant.close()

    async def chat(self, question: str, history: list[ChatMessage],
                   user_id: str, filters: Optional[dict] = None) -> dict:
        start = time.monotonic()
        key = self._cache_key(question, filters)
        cached = await self._redis.get(key)
        if cached:
            r = json.loads(cached)
            r["from_cache"] = True
            return r

        vector = self._model.encode(question).tolist()
        chunks = await self._search(vector, filters)
        context, sources = self._context(chunks)
        messages = self._messages(history, question, context)

        if settings.LLM_PROVIDER == "gemini":
            gemini_msgs = [
                {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
                for m in messages
            ]
            response = await asyncio.to_thread(
                self._gemini.generate_content,
                gemini_msgs,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=settings.LLM_MAX_TOKENS,
                    temperature=settings.LLM_TEMPERATURE,
                )
            )
            answer = response.text
            tokens_in  = response.usage_metadata.prompt_token_count if response.usage_metadata else 0
            tokens_out = response.usage_metadata.candidates_token_count if response.usage_metadata else 0
        elif settings.LLM_PROVIDER == "groq":
            groq_msgs = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
            resp = await self._groq.chat.completions.create(
                model=settings.LLM_MODEL, messages=groq_msgs,
                max_tokens=settings.LLM_MAX_TOKENS, temperature=settings.LLM_TEMPERATURE,
            )
            answer = resp.choices[0].message.content
            tokens_in  = resp.usage.prompt_tokens if resp.usage else 0
            tokens_out = resp.usage.completion_tokens if resp.usage else 0
        else:
            resp = await self._anthropic.messages.create(
                model=settings.LLM_MODEL, max_tokens=settings.LLM_MAX_TOKENS,
                temperature=settings.LLM_TEMPERATURE, system=SYSTEM_PROMPT, messages=messages,
            )
            answer = resp.content[0].text
            tokens_in, tokens_out = resp.usage.input_tokens, resp.usage.output_tokens

        result = {
            "answer": answer,
            "sources": [s.model_dump() for s in sources],
            "tokens_input": tokens_in,
            "tokens_output": tokens_out,
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
            "model": settings.LLM_MODEL,
            "from_cache": False,
        }
        await self._redis.setex(key, settings.CACHE_TTL_SECONDS, json.dumps(result, ensure_ascii=False))
        return result

    async def chat_stream(self, question: str, history: list[ChatMessage],
                          filters: Optional[dict] = None) -> AsyncGenerator[str, None]:
        vector = self._model.encode(question).tolist()
        chunks = await self._search(vector, filters)
        context, sources = self._context(chunks)
        messages = self._messages(history, question, context)
        yield f"data: {json.dumps({'type': 'sources', 'data': [s.model_dump() for s in sources]})}\n\n"
        if settings.LLM_PROVIDER == "gemini":
            gemini_msgs = [
                {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
                for m in messages
            ]
            response = await asyncio.to_thread(
                self._gemini.generate_content, gemini_msgs,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=settings.LLM_MAX_TOKENS,
                    temperature=settings.LLM_TEMPERATURE,
                )
            )
            yield f"data: {json.dumps({'type': 'token', 'data': response.text})}\n\n"
        elif settings.LLM_PROVIDER == "groq":
            groq_msgs = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
            stream = await self._groq.chat.completions.create(
                model=settings.LLM_MODEL, messages=groq_msgs,
                max_tokens=settings.LLM_MAX_TOKENS, temperature=settings.LLM_TEMPERATURE,
                stream=True,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"
        else:
            async with self._anthropic.messages.stream(
                model=settings.LLM_MODEL, max_tokens=settings.LLM_MAX_TOKENS,
                temperature=settings.LLM_TEMPERATURE, system=SYSTEM_PROMPT, messages=messages,
            ) as stream:
                async for token in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"
        yield "data: [DONE]\n\n"

    async def _search(self, vector, filters):
        qf = None
        if filters and filters.get("source_type"):
            qf = Filter(must=[FieldCondition(key="source_type", match=MatchValue(value=filters["source_type"]))])
        # qdrant-client >= 1.11 a retiré .search() au profit de .query_points() (l'ancienne API
        # existe toujours côté serveur Qdrant, seule la méthode du client Python a changé de nom/forme).
        resp = await self._qdrant.query_points(
            collection_name=settings.QDRANT_COLLECTION, query=vector,
            limit=settings.RAG_TOP_K, query_filter=qf,
            score_threshold=settings.RAG_MIN_SCORE, with_payload=True,
        )
        return resp.points

    def _context(self, chunks):
        parts, sources = [], []
        for i, hit in enumerate(chunks, 1):
            p = hit.payload
            src = RAGSource(rank=i, source_name=p.get("source_name", ""),
                            article_ref=p.get("article_ref", ""),
                            content_snippet=p.get("content", "")[:300],
                            score=round(hit.score, 3), source_type=p.get("source_type", ""))
            sources.append(src)
            parts.append(f"[SOURCE {i}] {src.source_name}"
                         + (f" — {src.article_ref}" if src.article_ref else "")
                         + f"\n{p.get('content', '')}\n")
        return "\n---\n".join(parts), sources

    def _messages(self, history, question, context):
        msgs = [{"role": m.role, "content": m.content} for m in history[-10:]]
        content = (f"CONTEXTE JURIDIQUE :\n{context}\n\nQUESTION : {question}") if context else question
        msgs.append({"role": "user", "content": content})
        return msgs

    @staticmethod
    def _cache_key(question: str, filters: Optional[dict]) -> str:
        raw = question.lower().strip() + json.dumps(filters or {}, sort_keys=True)
        return f"rag:v1:{hashlib.sha256(raw.encode()).hexdigest()[:16]}"


# Singleton partagé
rag_service = RAGService()


# ════════════════════════════════════════════════════════════════
#  RECLAMATION SERVICE
# ════════════════════════════════════════════════════════════════

class ReclamationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _gen_reference() -> str:
        import random
        from datetime import date as d
        year = d.today().year
        num  = random.randint(10000, 99999)
        return f"RECL/{year}/{num}"

    async def create(self, user_id: str | None, data: dict) -> Reclamation:
        # Garantir l'unicité de la référence
        ref = self._gen_reference()
        while await self.get_by_reference(ref):
            ref = self._gen_reference()
        obj = Reclamation(
            reference=ref,
            user_id=uuid.UUID(str(user_id)) if user_id else None,
            **{k: v for k, v in data.items() if hasattr(Reclamation, k)},
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_reference(self, ref: str) -> Optional[Reclamation]:
        r = await self.db.execute(select(Reclamation).where(Reclamation.reference == ref))
        return r.scalar_one_or_none()

    async def get_by_id(self, recl_id: uuid.UUID, user_id: str | None = None) -> Optional[Reclamation]:
        q = select(Reclamation).where(Reclamation.id == recl_id)
        if user_id:
            q = q.where(Reclamation.user_id == uuid.UUID(str(user_id)))
        r = await self.db.execute(q)
        return r.scalar_one_or_none()

    async def list_by_user(self, user_id: str, limit: int = 50, offset: int = 0) -> list[Reclamation]:
        q = (select(Reclamation)
             .where(Reclamation.user_id == uuid.UUID(str(user_id)))
             .order_by(Reclamation.created_at.desc())
             .limit(limit).offset(offset))
        r = await self.db.execute(q)
        return list(r.scalars().all())

    async def list_all(self, statut: str | None = None, type_: str | None = None,
                       limit: int = 100, offset: int = 0) -> list[Reclamation]:
        q = select(Reclamation).order_by(Reclamation.created_at.desc())
        if statut:
            q = q.where(Reclamation.statut == statut)
        if type_:
            q = q.where(Reclamation.type == type_)
        q = q.limit(limit).offset(offset)
        r = await self.db.execute(q)
        return list(r.scalars().all())

    async def update(self, recl_id: uuid.UUID, data: dict, *, actor_role: str) -> Optional[Reclamation]:
        # Traitement d'une réclamation (statut, décision, note interne) réservé aux administrateurs —
        # vérifié ici, pas seulement au niveau de la route, pour qu'aucun futur endpoint ne puisse
        # l'oublier et permettre à un utilisateur de modifier la réclamation d'un tiers par IDOR.
        if actor_role != "admin":
            raise HTTPException(403, "Seul un administrateur peut traiter une réclamation")
        await self.db.execute(
            update(Reclamation).where(Reclamation.id == recl_id).values(**data)
        )
        await self.db.commit()
        return await self.get_by_id(recl_id)
