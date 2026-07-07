"""
Script d'ingestion — base de connaissances Marché-IA
Indexe les PDFs officiels dans Qdrant pour le moteur RAG.

Usage :
  python scripts/ingest.py --source all
  python scripts/ingest.py --source code_marches
  python scripts/ingest.py --source guide_coleps
"""
import asyncio
import argparse
import logging
import os
import re
import uuid
from pathlib import Path

import pypdf
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s")
log = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────
QDRANT_URL     = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
COLLECTION    = "marche_ia_knowledge"
EMBED_MODEL   = "paraphrase-multilingual-MiniLM-L12-v2"
EMBED_DIM     = 384
CHUNK_SIZE    = 500
CHUNK_OVERLAP = 60
BATCH         = 32
KB_DIR        = Path(__file__).parent.parent / "knowledge_base"

# ── Sources disponibles ───────────────────────────────────────
SOURCES = {
    # Circulaires
    "circulaire_marches": (
        "CIRCULAIRE CODE MARCHES PUBLICS_compressed.pdf",
        "Circulaire Code des Marchés Publics",
        "circulaire",
    ),
    "circulaire_conditions_eco": (
        "Circulaire003-CAB-PMprecisantlesmodalitedegestiondeschangementsdesconditionseconomiquesdesMP.pdf",
        "Circulaire 003/CAB/PM — Gestion des conditions économiques des marchés",
        "circulaire",
    ),
    "lettre_circulaire": (
        "lettre-circulaire.pdf",
        "Lettre circulaire marchés publics",
        "circulaire",
    ),
    # Guides procéduraux
    "guide_regulation": (
        "VF GUIDE AMENDE DE LA REGULATION ATELIER 3 (4).pdf",
        "Guide amendé de la régulation des marchés publics",
        "guide",
    ),
    "guide_controle_passation": (
        "VF Guide amendé du controle de la passation des marchés publics Atelier 4 (1).pdf",
        "Guide amendé du contrôle de la passation des marchés publics",
        "guide",
    ),
    "guide_suivi_execution": (
        "VF Guide amendé du suivi et du contrôle de l'xécution des marchés publics Atelier 5 (2).pdf",
        "Guide amendé du suivi et contrôle de l'exécution des marchés publics",
        "guide",
    ),
    "manuel_procedures": (
        "VF Manuel des Procédures de Passation des Marchés  Amandé Atelier 2 (1).pdf",
        "Manuel des Procédures de Passation des Marchés Publics",
        "guide",
    ),
    "recueil_facilitation": (
        "VF RECUEIL DES DOCUMENTS DE FACILITATION.pdf",
        "Recueil des Documents de Facilitation",
        "guide",
    ),
    # Dossiers Types d'Appel d'Offres
    "dtao_travaux": (
        "DTAO_final_TVX_MS_du_02_04_2024 ok.pdf",
        "DTAO Travaux — Dossier Type d'Appel d'Offres",
        "dao_type",
    ),
    "dtao_travaux_accord_cadre": (
        "02 PF DTAO TRAVAUX Accord-cadre 27-3-2024.pdf",
        "DTAO Travaux Accord-cadre",
        "dao_type",
    ),
    "dtao_travaux_projet": (
        "Projet DTAO TRAVAUX  final ok 03 4 2024.pdf",
        "Projet DTAO Travaux",
        "dao_type",
    ),
    "dtao_services": (
        "Avant_projet_DTAO_AC_MS_Services_ok 13_03_2024.pdf",
        "DTAO Accord-cadre Services",
        "dao_type",
    ),
    "dtao_fournitures": (
        "Avant_projet_DTAO_AC_MS_Fournitures final_13_03_2024 ok.pdf",
        "DTAO Accord-cadre Fournitures",
        "dao_type",
    ),
    "dtao_ac_fournitures": (
        "Avant projet DTAO AC F  final 21 3 2024.pdf",
        "DTAO Accord-cadre Fournitures (version finale)",
        "dao_type",
    ),
    "dao_services_nonq": (
        "Avant projet DAO Type_Serv_NonQ_22 2 2024 final ok 20 3 2024.pdf",
        "DAO Type Services Non Qualifiés",
        "dao_type",
    ),
    "dao_si": (
        "Avant projet DAO type conception et développement des systèmes d'information des SI- ok 21 3 2024.pdf",
        "DAO Type Systèmes d'Information",
        "dao_type",
    ),
    "dao_assurance": (
        "DAO TYPE ASSURANCE FINAL ok 23 2 2024.pdf",
        "DAO Type Assurance",
        "dao_type",
    ),
    "demande_cotation": (
        "DT DEMANDE COTATION  final def.pdf",
        "Dossier Type Demande de Cotation",
        "dao_type",
    ),
}


def extract_pdf(path: Path) -> str:
    reader = pypdf.PdfReader(str(path))
    return "\n\n".join(p.extract_text() or "" for p in reader.pages)


def chunk_by_article(text: str, source_name: str, source_type: str) -> list[dict]:
    pattern = re.compile(
        r"(ARTICLE\s+\d+[\w.-]*[^\n]*\n.+?)(?=ARTICLE\s+\d+|\Z)",
        re.DOTALL | re.IGNORECASE,
    )
    chunks = []
    matches = list(pattern.finditer(text))

    if not matches:
        return chunk_fixed(text, source_name, source_type)

    for m in matches:
        body = m.group(0).strip()
        if len(body) < 40:
            continue
        ref = re.match(r"(ARTICLE\s+\d+[\w.-]*)", body, re.IGNORECASE)
        article_ref = ref.group(1) if ref else ""
        if len(body) > CHUNK_SIZE * 5:
            chunks.extend(chunk_fixed(body, source_name, source_type, article_ref))
        else:
            chunks.append({
                "id": str(uuid.uuid4()),
                "content": body,
                "source_name": source_name,
                "source_type": source_type,
                "article_ref": article_ref,
            })
    return chunks


def chunk_fixed(text: str, source_name: str, source_type: str, article_ref: str = "") -> list[dict]:
    words = text.split()
    step  = CHUNK_SIZE - CHUNK_OVERLAP
    chunks = []
    for i in range(0, len(words), step):
        piece = " ".join(words[i:i + CHUNK_SIZE])
        if len(piece) < 30:
            break
        chunks.append({
            "id": str(uuid.uuid4()),
            "content": piece,
            "source_name": source_name,
            "source_type": source_type,
            "article_ref": article_ref,
        })
    return chunks


async def ensure_collection(client: AsyncQdrantClient):
    existing = {c.name for c in (await client.get_collections()).collections}
    if COLLECTION not in existing:
        await client.create_collection(
            COLLECTION,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )
        await client.create_payload_index(COLLECTION, "source_type", PayloadSchemaType.KEYWORD)
        await client.create_payload_index(COLLECTION, "article_ref",  PayloadSchemaType.KEYWORD)
        log.info(f"Collection '{COLLECTION}' créée.")
    else:
        log.info(f"Collection '{COLLECTION}' déjà existante.")


async def index_chunks(client: AsyncQdrantClient, model: SentenceTransformer, chunks: list[dict]) -> int:
    total = 0
    for i in range(0, len(chunks), BATCH):
        batch   = chunks[i:i + BATCH]
        vectors = model.encode([c["content"] for c in batch], show_progress_bar=False).tolist()
        points  = [
            PointStruct(
                id=c["id"], vector=v,
                payload={
                    "content":     c["content"],
                    "source_name": c["source_name"],
                    "source_type": c["source_type"],
                    "article_ref": c["article_ref"],
                },
            )
            for c, v in zip(batch, vectors)
        ]
        await client.upsert(COLLECTION, points=points)
        total += len(points)
        log.info(f"  {total}/{len(chunks)} chunks indexés...")
    return total


async def ingest(keys: list[str]):
    log.info("Chargement du modèle d'embedding...")
    model  = SentenceTransformer(EMBED_MODEL)
    client = AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
    await ensure_collection(client)

    for key in keys:
        if key not in SOURCES:
            log.warning(f"Source inconnue : '{key}' — ignorée.")
            continue
        fname, sname, stype = SOURCES[key]
        fpath = KB_DIR / fname
        if not fpath.exists():
            log.warning(f"Fichier introuvable : {fpath}")
            log.info(f"  → Placer le PDF dans : knowledge_base/{fname}")
            continue
        log.info(f"Traitement : {sname}")
        text   = extract_pdf(fpath)
        chunks = chunk_by_article(text, sname, stype)
        log.info(f"  {len(chunks)} chunks extraits")
        total  = await index_chunks(client, model, chunks)
        log.info(f"  ✓ {total} chunks indexés")

    await client.close()
    log.info("Ingestion terminée.")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Ingestion base de connaissances Marché-IA")
    p.add_argument("--source", default="all",
                   help=f"{' | '.join(SOURCES)} | all")
    args = p.parse_args()
    keys = list(SOURCES) if args.source == "all" else [args.source]
    asyncio.run(ingest(keys))
