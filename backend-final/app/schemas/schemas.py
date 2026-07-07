"""
Schémas Pydantic — validation des entrées/sorties de l'API.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date, datetime
import uuid

# Rôles auto-attribuables à l'inscription. "admin" en est volontairement exclu —
# il ne peut être accordé que manuellement (base de données / outil d'administration),
# jamais via l'API publique.
SELF_SERVICE_ROLES = ("citizen", "enterprise", "authority")


# ── AUTH ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email        : EmailStr
    full_name    : str  = Field(..., min_length=2, max_length=100)
    password     : str  = Field(..., min_length=8)
    phone        : Optional[str] = None
    role         : Literal["citizen", "enterprise", "authority"] = "citizen"
    organization : Optional[str] = None
    region       : Optional[str] = None
    sectors      : list[str] = []


class LoginRequest(BaseModel):
    email    : EmailStr
    password : str


class TokenResponse(BaseModel):
    access_token : str
    token_type   : str = "bearer"
    expires_in   : int


class UserOut(BaseModel):
    id           : uuid.UUID
    email        : str
    full_name    : str
    phone        : Optional[str]
    role         : str
    organization : Optional[str]
    region       : Optional[str]
    sectors      : list[str] = []
    is_verified  : bool
    is_active    : bool
    created_at   : datetime
    class Config: from_attributes = True


class UserUpdate(BaseModel):
    full_name    : Optional[str] = None
    phone        : Optional[str] = None
    organization : Optional[str] = None
    region       : Optional[str] = None
    sectors      : Optional[list[str]] = None
    preferences  : Optional[dict] = None


class PasswordChange(BaseModel):
    current_password : str
    new_password     : str = Field(..., min_length=8)


# ── CHAT ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role    : str
    content : str


class RAGSource(BaseModel):
    rank            : int
    source_name     : str
    article_ref     : str = ""
    content_snippet : str
    score           : float
    source_type     : str


class ChatRequest(BaseModel):
    question        : str = Field(..., min_length=3, max_length=2000)
    conversation_id : Optional[uuid.UUID] = None
    filters         : Optional[dict] = None


class ChatResponse(BaseModel):
    message_id      : uuid.UUID
    conversation_id : uuid.UUID
    answer          : str
    sources         : list[RAGSource]
    tokens_used     : int
    latency_ms      : float
    from_cache      : bool


class ConversationOut(BaseModel):
    id         : uuid.UUID
    title      : str
    status     : str
    created_at : str
    updated_at : str


# ── TENDERS ───────────────────────────────────────────────────────────────────

class TenderOut(BaseModel):
    id                  : uuid.UUID
    reference           : str
    title               : str
    authority           : str
    sector              : Optional[str]
    region              : Optional[str]
    procedure_type      : Optional[str]
    estimated_amount    : Optional[int]
    publication_date    : Optional[date]
    deadline            : Optional[date]
    status              : str
    description         : Optional[str]
    source_url          : Optional[str]
    raw_data            : Optional[dict] = None
    synced_at           : datetime
    days_until_deadline : Optional[int] = None
    class Config: from_attributes = True


class TenderListResponse(BaseModel):
    items : list[TenderOut]
    total : int
    page  : int
    pages : int
    limit : int


# ── ALERTS ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    name       : str = Field("Ma veille", max_length=100)
    sectors    : list[str] = []
    regions    : list[str] = []
    keywords   : list[str] = []
    min_amount : Optional[int] = None
    max_amount : Optional[int] = None
    channel    : str = "in_app"


class AlertUpdate(BaseModel):
    name       : Optional[str]       = None
    sectors    : Optional[list[str]] = None
    regions    : Optional[list[str]] = None
    keywords   : Optional[list[str]] = None
    min_amount : Optional[int]       = None
    max_amount : Optional[int]       = None
    channel    : Optional[str]       = None
    active     : Optional[bool]      = None


class AlertOut(BaseModel):
    id            : uuid.UUID
    name          : str
    sectors       : list[str]
    regions       : list[str]
    keywords      : list[str]
    min_amount    : Optional[int]
    max_amount    : Optional[int]
    channel       : str
    active        : bool
    last_fired    : Optional[datetime]
    created_at    : datetime
    match_preview : Optional[int] = None
    class Config: from_attributes = True


class NotificationOut(BaseModel):
    id           : uuid.UUID
    alert_name   : str
    tender_ref   : str
    tender_title : str
    notified     : bool
    matched_at   : datetime


# ── DOCUMENTS ─────────────────────────────────────────────────────────────────

DOCUMENT_TYPES = [
    "submission_letter", "technical_offer", "financial_offer",
    "qualification_file", "recourse", "contract_draft",
]

DOCUMENT_LABELS = {
    "submission_letter":  "Lettre de soumission",
    "technical_offer":    "Offre technique",
    "financial_offer":    "Offre financière",
    "qualification_file": "Dossier de qualification",
    "recourse":           "Requête de recours ARMP",
    "contract_draft":     "Projet de marché",
}


class DocumentGenerateRequest(BaseModel):
    type             : str
    tender_id        : Optional[uuid.UUID] = None
    tender_reference : Optional[str]       = None
    tender_title     : Optional[str]       = None
    company_name     : str
    company_ninea    : Optional[str] = None
    company_address  : Optional[str] = None
    representative   : str
    contact_email    : Optional[str] = None
    contact_phone    : Optional[str] = None
    proposed_amount      : Optional[int] = None
    execution_duration   : Optional[str] = None
    validity_duration    : Optional[str] = None
    recourse_grounds     : Optional[str] = None
    recourse_stage       : Optional[str] = None
    additional_params    : dict = {}


class DocumentUpdate(BaseModel):
    title   : Optional[str] = None
    content : Optional[str] = None
    status  : Optional[str] = None


class DocumentOut(BaseModel):
    id         : uuid.UUID
    type       : str
    title      : str
    content    : str
    status     : str
    version    : int
    tender_id  : Optional[uuid.UUID]
    created_at : datetime
    updated_at : datetime
    class Config: from_attributes = True


class DocumentListOut(BaseModel):
    id         : uuid.UUID
    type       : str
    title      : str
    status     : str
    version    : int
    tender_id  : Optional[uuid.UUID]
    created_at : datetime
    class Config: from_attributes = True


# ── RECLAMATIONS ──────────────────────────────────────────────────────────────

RECLAMATION_TYPES = [
    "exclusion", "specification", "evaluation",
    "attribution", "corruption", "delai", "autre",
]

RECLAMATION_STATUTS = ["soumise", "en_instruction", "resolue", "rejetee", "classee"]


class ReclamationCreate(BaseModel):
    type             : str = Field(..., description="Type d'irrégularité")
    description      : str = Field(..., min_length=30, max_length=5000)
    marche_reference : Optional[str] = None
    autorite_name    : Optional[str] = None
    region           : Optional[str] = None
    tender_id        : Optional[uuid.UUID] = None
    plaignant_nom    : Optional[str] = None
    plaignant_email  : Optional[str] = None
    plaignant_phone  : Optional[str] = None
    plaignant_region : Optional[str] = None
    is_anonyme       : bool = False
    preuves          : list[dict] = []


class ReclamationAdminUpdate(BaseModel):
    """Traitement d'une réclamation — réservé aux administrateurs (voir require_role("admin"))."""
    statut    : Optional[Literal["soumise", "en_instruction", "resolue", "rejetee", "classee"]] = None
    decision  : Optional[str] = None


class ReclamationOut(BaseModel):
    id               : uuid.UUID
    reference        : str
    type             : str
    statut           : str
    description      : str
    marche_reference : Optional[str]
    autorite_name    : Optional[str]
    region           : Optional[str]
    tender_id        : Optional[uuid.UUID]
    plaignant_nom    : Optional[str]
    plaignant_email  : Optional[str]
    plaignant_phone  : Optional[str]
    plaignant_region : Optional[str]
    is_anonyme       : bool
    preuves          : list[dict]
    decision         : Optional[str]
    traite_at        : Optional[datetime]
    created_at       : datetime
    updated_at       : datetime
    class Config: from_attributes = True


# ── DASHBOARD ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_tenders     : int
    open_tenders      : int
    awarded_tenders   : int
    cancelled_tenders : int
    total_amount_fcfa : Optional[int]
    avg_amount_fcfa   : Optional[int]
    avg_award_days    : Optional[float]
    last_sync_at      : Optional[str]


class TendersByMonth(BaseModel):
    month     : str
    total     : int
    open      : int
    awarded   : int
    cancelled : int


class TendersBySector(BaseModel):
    sector       : str
    total        : int
    total_amount : Optional[int]
    pct          : float


class TendersByRegion(BaseModel):
    region       : str
    total        : int
    total_amount : Optional[int]


class TendersByProcedure(BaseModel):
    procedure_type : str
    total          : int
    pct            : float


class TopAuthority(BaseModel):
    authority    : str
    total        : int
    total_amount : Optional[int]


class DashboardFull(BaseModel):
    stats           : DashboardStats
    by_month        : list[TendersByMonth]
    by_sector       : list[TendersBySector]
    by_region       : list[TendersByRegion]
    by_procedure    : list[TendersByProcedure]
    top_authorities : list[TopAuthority]
