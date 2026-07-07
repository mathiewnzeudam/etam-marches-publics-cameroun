"""
Worker Celery — Marché-IA Cameroun
Tâches planifiées automatiques :
  • sync_armp_feed      → toutes les heures (min 0)
  • match_and_notify   → toutes les heures (min 20)
  • close_expired      → toutes les heures (min 40)
  • nightly_cleanup    → chaque nuit à 3h

Lancement :
  celery -A app.workers.sync_worker worker --beat --loglevel=info -c 2
"""
import asyncio
import logging
import re
from datetime import datetime, timedelta

import feedparser
import httpx
from bs4 import BeautifulSoup
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

log = logging.getLogger(__name__)

# ── App Celery ────────────────────────────────────────────────────────────────
celery_app = Celery("marche_ia", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Douala",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "sync-armp":        {"task": "app.workers.sync_worker.sync_armp_feed",    "schedule": crontab(minute=0)},
        "match-alerts":     {"task": "app.workers.sync_worker.match_and_notify",  "schedule": crontab(minute=20)},
        "close-expired":    {"task": "app.workers.sync_worker.close_expired",     "schedule": crontab(minute=40)},
        "nightly-cleanup":  {"task": "app.workers.sync_worker.nightly_cleanup",   "schedule": crontab(hour=3, minute=0)},
    },
)


def run(coro):
    """Exécute une coroutine depuis un contexte synchrone Celery."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# ════════════════════════════════════════════════════════════════
#  TÂCHE 1 — Synchronisation ARMP (toutes les heures, min 0)
# ════════════════════════════════════════════════════════════════

@celery_app.task(name="app.workers.sync_worker.sync_armp_feed",
                 bind=True, max_retries=3, default_retry_delay=300)
def sync_armp_feed(self):
    """Récupère les nouveaux appels d'offres depuis armp.cm."""
    return run(_sync(self))


# ── Helpers partagés ─────────────────────────────────────────────────────────

# Nombre de pages à scraper à chaque sync horaire (~10 marchés réels/page)
SYNC_PAGES = 50

REGION_MAP = {
    "CENTER": "Centre", "CENTRE": "Centre", "CENTRAL SERVICES": "Centre",
    "LITTORAL": "Littoral",
    "WEST": "Ouest", "OUEST": "Ouest",
    "NORTHWEST": "Nord-Ouest", "NORTH-WEST": "Nord-Ouest", "NORD-OUEST": "Nord-Ouest",
    "SOUTHWEST": "Sud-Ouest", "SOUTH-WEST": "Sud-Ouest", "SUD-OUEST": "Sud-Ouest",
    "FAR NORTH": "Extrême-Nord", "EXTREME NORTH": "Extrême-Nord",
    "EXTREME-NORTH": "Extrême-Nord", "EXTRÊME-NORD": "Extrême-Nord",
    "ADAMAWA": "Adamaoua", "ADAMAOUA": "Adamaoua",
    "NORTH": "Nord", "NORD": "Nord",
    "SOUTH": "Sud", "SUD": "Sud",
    "EAST": "Est", "EST": "Est",
}

PROC_TYPE_MAP = {
    "National Call for Tenders":            "Appel d'Offres National Ouvert",
    "International Call for Tenders":       "Appel d'Offres International",
    "Restricted Call for Tenders":          "Appel d'Offres Restreint",
    "Call for Tenders":                     "Appel d'Offres",
    "Request for Cotation":                 "Demande de Cotation",
    "Request for Proposal":                 "Demande de Proposition",
    "Expression of Interest":               "Appel à Manifestation d'Intérêt",
    "Call for Expression of Interest":      "Appel à Manifestation d'Intérêt",
    "Request for Expressions of Interest":  "Appel à Manifestation d'Intérêt",
    "Addendum":                             "Additif / Rectificatif",
    "Communique":                           "Communiqué",
    "Award Decision":                       "Décision d'Attribution",
    "Infructuous Decision":                 "Décision d'Infructuosité",
    "Cancellation Decision":                "Décision d'Annulation",
}

PROC_CODE_MAP = {
    "AO":       "Appel d'Offres National Ouvert",
    "AOI":      "Appel d'Offres International",
    "AOR":      "Appel d'Offres Restreint",
    "DC":       "Demande de Cotation",
    "DP":       "Demande de Proposition",
    "AMI":      "Appel à Manifestation d'Intérêt",
    "ADDITIF":  "Additif / Rectificatif",
    "COMM":     "Communiqué",
    "DEC-ATTR": "Décision d'Attribution",
    "DEC-INF":  "Décision d'Infructuosité",
    "DEC-ANN":  "Décision d'Annulation",
    "DEC-RES":  "Résiliation",
}


def _clean_text(raw: str) -> str:
    """Normalise les espaces et supprime les caractères de remplacement."""
    if not raw:
        return ""
    # \xa0 = espace insécable, \x85 = points de suspension, \x96/\x97 = tirets Windows
    raw = (raw
           .replace("\xa0", " ")
           .replace("\x85", "...")
           .replace("\x96", "-")
           .replace("\x97", "-")
           .replace("�", "")   # caractère de remplacement unicode
           .replace("&#039;", "'")
           .replace("&amp;", "&"))
    return re.sub(r"\s+", " ", raw).strip()


def _to_date(text: str):
    """dd-mm-yyyy ou dd/mm/yyyy → date object."""
    from datetime import date as _d
    m = re.search(r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})", str(text or ""))
    if m:
        try:
            return _d(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    return None


def _to_amount(text: str):
    """Extrait le montant en FCFA."""
    for n in re.findall(r"([\d][\d\s]{2,}\d)\s*FCFA", text or "", re.IGNORECASE):
        try:
            v = float(re.sub(r"\s", "", n))
            if 100_000 <= v <= 500_000_000_000:
                return int(v)
        except ValueError:
            pass
    return None


def _detect_sector(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["travaux", "construction", "réhabilitation", "rehabilitation",
                              "route", "pont", "bâtiment", "batiment", "génie civil",
                              "terrassement", "bloc de", "salle de class"]):
        return "travaux"
    if any(k in t for k in ["fourniture", "matériel", "materiel", "équipement", "equipement",
                              "mobilier", "véhicule", "vehicule", "acquisition"]):
        return "fournitures"
    if any(k in t for k in ["informatique", "logiciel", "réseau", "reseau",
                              "système d'information", "numérique", "numerique", "chromatographe"]):
        return "informatique"
    if "assurance" in t:
        return "assurance"
    return "services"


def _map_region(region_raw: str) -> str | None:
    if not region_raw:
        return None
    key = region_raw.strip().upper()
    return REGION_MAP.get(key)


def _map_proc_type(type_raw: str, pub_code: str) -> str:
    if type_raw:
        mapped = PROC_TYPE_MAP.get(type_raw.strip())
        if mapped:
            return mapped
    return PROC_CODE_MAP.get(pub_code, type_raw or pub_code)


def _extract_reference(title: str, pub_type: str, pub_id: str) -> str:
    """Extrait la référence officielle du titre (ex: N°004/DC/COM-ESSE/...)."""
    m = re.search(
        r"N[°º°]\s*[\w/_-]{3,}(?:/\d{4})",
        title, re.UNICODE
    )
    if m:
        return _clean_text(m.group(0))[:255]
    # Chercher un pattern type/numéro/année sans N°
    m2 = re.search(r"\b\d{2,4}/[A-Z]{2,}/[A-Z][\w/\-]{3,}/\d{4}\b", title)
    if m2:
        return m2.group(0)[:255]
    return f"{pub_type}/{pub_id}"


def _parse_listing_item(li, soup_ctx=None) -> dict | None:
    """Parse un <li class='list-group-item'> depuis la page de listing armp.cm."""
    from datetime import date as _d
    try:
        # ── Titre ─────────────────────────────────────────────────────────
        strong = li.find("strong")
        if not strong:
            return None
        title_raw = _clean_text(strong.get_text(" ", strip=True))
        # Supprimer le suffixe FINANCEMENT (présent dans les titres de listing)
        for cut in ["FINANCEMENT :", "Source de financement", "BUDGET INVESTISSEMENT"]:
            idx = title_raw.upper().find(cut.upper())
            if idx > 20:
                title_raw = title_raw[:idx].strip().rstrip(".,;")
                break
        if not title_raw or len(title_raw) < 10:
            return None

        # ── Métadonnées via les cellules d-table-row ──────────────────────
        meta_div = li.find("div", class_=re.compile(r"row\s+mt-4"))
        if not meta_div:
            return None
        fields: dict[str, str] = {}
        for row in meta_div.find_all("div", class_="d-table-row"):
            cells = row.find_all("div", class_="d-table-cell")
            if len(cells) >= 2:
                label = _clean_text(cells[0].get_text(" ", strip=True)).rstrip(":").strip().upper()
                value = _clean_text(cells[1].get_text(" ", strip=True))
                if label and value:
                    fields[label] = value

        authority     = fields.get("PO/CA", "ARMP")
        proc_type_raw = fields.get("TYPE", "")
        region_raw    = fields.get("REGION", None)
        amount        = _to_amount(fields.get("AMOUNT", ""))
        pub_raw       = fields.get("PUBLISHED ON THE", "")
        close_raw     = fields.get("CLOSING DATE", "") or fields.get("CLOSING DATE  ", "")

        pub_date = _to_date(pub_raw) or _d.today()
        deadline = None
        if close_raw and close_raw.strip() not in ("01-01-1970", "", "N/A"):
            deadline = _to_date(close_raw)

        # ── Identifiants ──────────────────────────────────────────────────
        link = li.find("a", href=re.compile(r"type_publication="))
        if not link:
            return None
        href = link.get("href", "")
        id_m = re.search(r"type_publication=([A-Z\-]+)&id_publication=(\d+)", href)
        if not id_m:
            return None
        pub_type = id_m.group(1)
        pub_id   = id_m.group(2)

        # ── Calculs finaux ────────────────────────────────────────────────
        today = _d.today()
        if pub_type in ("DEC-INF", "DEC-ANN"):
            status = "cancelled"
        elif pub_type in ("DEC-ATTR",):
            status = "awarded"
        elif deadline and deadline < today:
            status = "closed"
        else:
            status = "open"

        reference = _extract_reference(title_raw, pub_type, pub_id)
        # Le code source fait autorité sur le champ Type de l'ARMP (parfois incohérent)
        proc_type = PROC_CODE_MAP.get(pub_type) or _map_proc_type(proc_type_raw, pub_type)
        region    = _map_region(region_raw)

        return {
            "external_id":      f"{pub_type}-{pub_id}",
            "reference":        reference,
            "title":            title_raw[:400],
            "authority":        authority[:250],
            "sector":           _detect_sector(title_raw),
            "region":           region,
            "procedure_type":   proc_type,
            "estimated_amount": amount,
            "publication_date": pub_date,
            "deadline":         deadline,
            "description":      title_raw[:500],
            "source_url":       f"https://armp.cm/details?type_publication={pub_type}&id_publication={pub_id}",
            "source":           "armp_scraping",
            "status":           status,
        }
    except Exception as exc:
        log.debug(f"_parse_listing_item échoué : {exc}")
        return None


async def _scrape_pages(client: httpx.AsyncClient, pages: int = SYNC_PAGES) -> list[dict]:
    """Scrape N pages du listing armp.cm et retourne tous les items parsés."""
    results = []
    seen_ext_ids: set[str] = set()

    for page_num in range(1, pages + 1):
        url = "https://armp.cm" if page_num == 1 else f"https://armp.cm?page={page_num}"
        try:
            resp = None
            for attempt in range(3):
                try:
                    resp = await client.get(url, timeout=45)
                    break
                except (httpx.TimeoutException, httpx.ConnectError) as retry_exc:
                    if attempt == 2:
                        raise
                    log.warning(f"Page {page_num} tentative {attempt + 1}/3 échouée ({retry_exc}), nouvel essai...")
                    await asyncio.sleep(3)
            if resp.status_code != 200:
                log.warning(f"Page {page_num} → HTTP {resp.status_code}")
                break
            # Détection encodage : essayer UTF-8, fallback Windows-1252 si caractères invalides
            try:
                html_text = resp.content.decode("utf-8")
            except UnicodeDecodeError:
                html_text = resp.content.decode("windows-1252", errors="replace")
            soup = BeautifulSoup(html_text, "html.parser")
            items = soup.find_all("li", class_="list-group-item")
            if not items:
                log.info(f"Page {page_num} vide — arrêt pagination")
                break
            page_new = 0
            for li in items:
                data = _parse_listing_item(li)
                if data and data["external_id"] not in seen_ext_ids:
                    seen_ext_ids.add(data["external_id"])
                    results.append(data)
                    page_new += 1
            log.info(f"Page {page_num} : {page_new} nouveaux items (total {len(results)})")
            await asyncio.sleep(0.5)
        except Exception as exc:
            log.warning(f"Erreur page {page_num} : {exc}")
            break

    return results


async def _sync(task):
    from app.db.session import async_session_factory
    from app.services.services import TenderService

    job_id = None
    try:
        async with async_session_factory() as db:
            svc = TenderService(db)
            job_id = await svc.create_sync_job("armp_feed")

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            data = await _scrape_pages(client, pages=SYNC_PAGES)

        log.info(f"Scraping terminé : {len(data)} marchés récupérés")

        new_count = 0
        async with async_session_factory() as db:
            svc = TenderService(db)
            for d in data:
                if await svc.upsert_tender(d):
                    new_count += 1
            await svc.complete_sync_job(job_id, new_count)

        log.info(f"Sync ARMP terminée : {new_count} nouveaux / {len(data)} traités")
        return {"new": new_count, "total": len(data)}

    except Exception as exc:
        log.error(f"Sync ARMP échouée : {exc}", exc_info=True)
        if job_id:
            async with async_session_factory() as db:
                await TenderService(db).fail_sync_job(job_id, str(exc))
        raise task.retry(exc=exc)


# ════════════════════════════════════════════════════════════════
#  TÂCHE 2 — Matching alertes + notifications (min 20)
# ════════════════════════════════════════════════════════════════

@celery_app.task(name="app.workers.sync_worker.match_and_notify", bind=True)
def match_and_notify(self):
    """Notifie les utilisateurs dont les alertes correspondent à de nouveaux marchés."""
    return run(_match())


async def _match():
    from app.db.session import async_session_factory
    from app.services.services import AlertService, NotificationService

    notified = 0
    since = datetime.utcnow() - timedelta(hours=2)

    async with async_session_factory() as db:
        alert_svc = AlertService(db)
        notif_svc = NotificationService()

        for alert in await alert_svc.get_active_alerts():
            for tender in await alert_svc.find_matches(alert, since):
                if await alert_svc.is_notified(alert.id, tender.id):
                    continue
                await notif_svc.send(alert, tender, alert.channel)
                await alert_svc.mark_notified(alert.id, tender.id)
                notified += 1

    log.info(f"Notifications envoyées : {notified}")
    return {"notified": notified}


# ════════════════════════════════════════════════════════════════
#  TÂCHE 3 — Fermeture des marchés expirés (min 40)
# ════════════════════════════════════════════════════════════════

@celery_app.task(name="app.workers.sync_worker.close_expired")
def close_expired():
    """Passe les marchés ouverts dont la deadline est passée à 'closed'."""
    return run(_close_expired())


async def _close_expired():
    from app.db.session import async_session_factory
    from app.services.services import TenderService

    async with async_session_factory() as db:
        count = await TenderService(db).close_expired()

    log.info(f"Marchés fermés automatiquement : {count}")
    return {"closed": count}


# ════════════════════════════════════════════════════════════════
#  TÂCHE 4 — Nettoyage nocturne (3h00)
# ════════════════════════════════════════════════════════════════

@celery_app.task(name="app.workers.sync_worker.nightly_cleanup")
def nightly_cleanup():
    """Purge les audit_logs et sync_jobs de plus de 90 jours."""
    return run(_cleanup())


async def _cleanup():
    from app.db.session import async_session_factory
    from sqlalchemy import text

    cutoff = datetime.utcnow() - timedelta(days=90)
    async with async_session_factory() as db:
        r1 = await db.execute(text("DELETE FROM audit_logs WHERE created_at < :c"), {"c": cutoff})
        r2 = await db.execute(text("DELETE FROM sync_jobs  WHERE started_at < :c"), {"c": cutoff})
        await db.commit()

    deleted = r1.rowcount + r2.rowcount
    log.info(f"Nettoyage nocturne : {deleted} enregistrements supprimés")
    return {"deleted": deleted}
