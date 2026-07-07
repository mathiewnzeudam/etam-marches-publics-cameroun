"""
Modèles SQLAlchemy — toutes les tables de la base de données.
Ordre : respecte les dépendances FK.
"""
from __future__ import annotations
import uuid
from datetime import datetime, date
from sqlalchemy import (
    String, Text, Boolean, Integer, BigInteger, Float,
    SmallInteger, Date, DateTime, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


# ── users ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id               : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email            : Mapped[str]             = mapped_column(Text, unique=True, nullable=False, index=True)
    full_name        : Mapped[str]             = mapped_column(Text, nullable=False)
    hashed_password  : Mapped[str]             = mapped_column(Text, nullable=False)
    phone            : Mapped[str | None]      = mapped_column(String(20))
    role             : Mapped[str]             = mapped_column(String(50), nullable=False, default="citizen")
    organization     : Mapped[str | None]      = mapped_column(Text)
    region           : Mapped[str | None]      = mapped_column(String(100))
    sectors          : Mapped[list | None]     = mapped_column(ARRAY(Text), default=list)
    is_verified      : Mapped[bool]            = mapped_column(Boolean, nullable=False, default=False)
    is_active        : Mapped[bool]            = mapped_column(Boolean, nullable=False, default=True)
    preferences      : Mapped[dict]            = mapped_column(JSONB, default=dict)
    created_at       : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at       : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login       : Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    conversations = relationship("Conversation",  back_populates="user", cascade="all, delete-orphan")
    alerts        = relationship("Alert",         back_populates="user", cascade="all, delete-orphan")
    documents     = relationship("Document",      back_populates="user", cascade="all, delete-orphan")
    reclamations  = relationship("Reclamation",   back_populates="user", cascade="all, delete-orphan", foreign_keys="Reclamation.user_id")


# ── tenders ───────────────────────────────────────────────────────────────────

class Tender(Base):
    __tablename__ = "tenders"

    id                : Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id       : Mapped[str | None]     = mapped_column(Text, unique=True)
    reference         : Mapped[str]            = mapped_column(Text, nullable=False)
    title             : Mapped[str]            = mapped_column(Text, nullable=False)
    authority         : Mapped[str]            = mapped_column(Text, nullable=False)
    sector            : Mapped[str | None]     = mapped_column(String(100), index=True)
    region            : Mapped[str | None]     = mapped_column(String(100), index=True)
    procedure_type    : Mapped[str | None]     = mapped_column(String(50))
    estimated_amount  : Mapped[int | None]     = mapped_column(BigInteger)
    publication_date  : Mapped[date | None]    = mapped_column(Date)
    deadline          : Mapped[date | None]    = mapped_column(Date, index=True)
    status            : Mapped[str]            = mapped_column(String(50), nullable=False, default="open", index=True)
    description       : Mapped[str | None]     = mapped_column(Text)
    source_url        : Mapped[str | None]     = mapped_column(Text)
    raw_data          : Mapped[dict | None]    = mapped_column(JSONB)
    synced_at         : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    created_at        : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


# ── conversations ─────────────────────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"

    id         : Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    : Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title      : Mapped[str]        = mapped_column(Text, nullable=False, default="Nouvelle conversation")
    status     : Mapped[str]        = mapped_column(String(50), nullable=False, default="active")
    metadata_  : Mapped[dict]       = mapped_column("metadata", JSONB, default=dict)
    created_at : Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at : Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user     = relationship("User",    back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id               : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id  : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role             : Mapped[str]             = mapped_column(String(20), nullable=False)
    content          : Mapped[str]             = mapped_column(Text, nullable=False)
    sources          : Mapped[dict | None]     = mapped_column(JSONB)
    tokens_input     : Mapped[int | None]      = mapped_column(Integer)
    tokens_output    : Mapped[int | None]      = mapped_column(Integer)
    model_used       : Mapped[str | None]      = mapped_column(String(100))
    latency_ms       : Mapped[float | None]    = mapped_column(Float)
    feedback         : Mapped[int | None]      = mapped_column(SmallInteger)
    created_at       : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


# ── alerts ────────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id          : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name        : Mapped[str]             = mapped_column(Text, nullable=False, default="Ma veille")
    sectors     : Mapped[list]            = mapped_column(ARRAY(Text), nullable=False, default=list)
    regions     : Mapped[list]            = mapped_column(ARRAY(Text), nullable=False, default=list)
    keywords    : Mapped[list]            = mapped_column(ARRAY(Text), nullable=False, default=list)
    min_amount  : Mapped[int | None]      = mapped_column(BigInteger)
    max_amount  : Mapped[int | None]      = mapped_column(BigInteger)
    channel     : Mapped[str]             = mapped_column(String(50), nullable=False, default="in_app")
    active      : Mapped[bool]            = mapped_column(Boolean, nullable=False, default=True, index=True)
    last_fired  : Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at  : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user    = relationship("User",       back_populates="alerts")
    matches = relationship("AlertMatch", back_populates="alert", cascade="all, delete-orphan")


class AlertMatch(Base):
    __tablename__ = "alert_matches"

    id          : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id    : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("alerts.id",  ondelete="CASCADE"), nullable=False, index=True)
    tender_id   : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False)
    score       : Mapped[float | None]    = mapped_column(Float)
    notified    : Mapped[bool]            = mapped_column(Boolean, nullable=False, default=False, index=True)
    notified_at : Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    matched_at  : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    alert = relationship("Alert", back_populates="matches")


# ── documents ─────────────────────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id          : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("users.id",    ondelete="CASCADE"),  nullable=False, index=True)
    tender_id   : Mapped[uuid.UUID | None]= mapped_column(UUID(as_uuid=True), ForeignKey("tenders.id",  ondelete="SET NULL"), index=True)
    type        : Mapped[str]             = mapped_column(String(100), nullable=False, index=True)
    title       : Mapped[str]             = mapped_column(Text, nullable=False)
    content     : Mapped[str]             = mapped_column(Text, nullable=False)
    metadata_   : Mapped[dict]            = mapped_column("metadata", JSONB, default=dict)
    status      : Mapped[str]             = mapped_column(String(50), nullable=False, default="draft")
    version     : Mapped[int]             = mapped_column(Integer, nullable=False, default=1)
    created_at  : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at  : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="documents")


# ── audit & sync ──────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     : Mapped[uuid.UUID | None]= mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action      : Mapped[str]             = mapped_column(String(100), nullable=False, index=True)
    entity_type : Mapped[str | None]      = mapped_column(String(100))
    entity_id   : Mapped[uuid.UUID | None]= mapped_column(UUID(as_uuid=True))
    ip_address  : Mapped[str | None]      = mapped_column(String(45))
    user_agent  : Mapped[str | None]      = mapped_column(Text)
    metadata_   : Mapped[dict]            = mapped_column("metadata", JSONB, default=dict)
    created_at  : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id              : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source          : Mapped[str]             = mapped_column(String(100), nullable=False)
    status          : Mapped[str]             = mapped_column(String(50),  nullable=False)
    records_synced  : Mapped[int]             = mapped_column(Integer, default=0)
    error_message   : Mapped[str | None]      = mapped_column(Text)
    started_at      : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    finished_at     : Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ── reclamations ─────────────────────────────────────────────────────────────

class Reclamation(Base):
    __tablename__ = "reclamations"

    id               : Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference        : Mapped[str]             = mapped_column(Text, unique=True, nullable=False)
    user_id          : Mapped[uuid.UUID | None]= mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    plaignant_nom    : Mapped[str | None]      = mapped_column(Text)
    plaignant_email  : Mapped[str | None]      = mapped_column(Text)
    plaignant_phone  : Mapped[str | None]      = mapped_column(Text)
    plaignant_region : Mapped[str | None]      = mapped_column(String(100))
    is_anonyme       : Mapped[bool]            = mapped_column(Boolean, nullable=False, default=False)
    type             : Mapped[str]             = mapped_column(String(50), nullable=False, index=True)
    statut           : Mapped[str]             = mapped_column(String(50), nullable=False, default="soumise", index=True)
    tender_id        : Mapped[uuid.UUID | None]= mapped_column(UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="SET NULL"), index=True)
    marche_reference : Mapped[str | None]      = mapped_column(Text)
    autorite_name    : Mapped[str | None]      = mapped_column(Text)
    region           : Mapped[str | None]      = mapped_column(String(100))
    description      : Mapped[str]             = mapped_column(Text, nullable=False)
    preuves          : Mapped[list]            = mapped_column(JSONB, default=list)
    traite_par       : Mapped[uuid.UUID | None]= mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    note_interne     : Mapped[str | None]      = mapped_column(Text)
    decision         : Mapped[str | None]      = mapped_column(Text)
    traite_at        : Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at       : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at       : Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="reclamations", foreign_keys=[user_id])


# ── knowledge chunks ──────────────────────────────────────────────────────────

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id          : Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type : Mapped[str]        = mapped_column(String(100), nullable=False, index=True)
    source_name : Mapped[str]        = mapped_column(Text, nullable=False)
    article_ref : Mapped[str | None] = mapped_column(Text, index=True)
    content     : Mapped[str]        = mapped_column(Text, nullable=False)
    qdrant_id   : Mapped[str | None] = mapped_column(Text, unique=True)
    token_count : Mapped[int | None] = mapped_column(Integer)
    created_at  : Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
