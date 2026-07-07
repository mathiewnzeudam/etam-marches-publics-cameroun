"""
Scrape COMPLET de armp.cm — toutes les pages, tous les types, classification officielle.
Extraction basée sur les sections HTML structurées (strong + paragraphes suivants).
Usage : python scripts/seed_armp.py
"""
import asyncio, re, sys, logging
from datetime import date
import httpx
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE = "https://armp.cm"

TYPE_LABELS = {
    "AO":       "Appel d'Offres National Ouvert",
    "AOI":      "Appel d'Offres International",
    "AOR":      "Appel d'Offres Restreint",
    "DC":       "Demande de Cotation",
    "AMI":      "Appel à Manifestation d'Intérêt",
    "DP":       "Demande de Proposition",
    "ADDITIF":  "Additif / Rectificatif",
    "DEC-INF":  "Décision d'Infructuosité",
    "COMM":     "Communiqué",
    "ATT":      "Attribution",
    "RES":      "Résultat",
}

REGIONS = ["Centre","Littoral","Ouest","Nord","Sud","Est",
           "Adamaoua","Extrême-Nord","Nord-Ouest","Sud-Ouest"]

REGION_MAP = {
    "CENTRE": "Centre", "LITTORAL": "Littoral", "OUEST": "Ouest",
    "NORD-OUEST": "Nord-Ouest", "SUD-OUEST": "Sud-Ouest",
    "EXTREME-NORD": "Extrême-Nord", "EXTRÊME-NORD": "Extrême-Nord",
    "ADAMAOUA": "Adamaoua", "NORD": "Nord", "SUD": "Sud", "EST": "Est",
}


def clean(t):
    t = (t or "")
    try:
        t = t.encode("latin-1").decode("utf-8")
    except Exception:
        pass
    t = t.replace("&#039;", "'").replace("&amp;", "&").replace("&quot;", '"')
    return re.sub(r"\s+", " ", t).strip()


def to_date(text):
    m = re.search(r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})", str(text))
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except Exception:
            pass
    return None


def to_amount(text):
    # Priorité aux montants exprimés en lettres (ex: "Quatre Cent Quarante Mille")
    # puis aux chiffres avec FCFA
    nums = re.findall(r"([\d][\d\s]{2,}(?:\d))\s*(?:Francs?\s*CFA|FCFA|F\.?CFA)", text, re.IGNORECASE)
    for n in nums:
        v_str = re.sub(r"\s", "", n)
        try:
            v = float(v_str)
            if 100_000 <= v <= 500_000_000_000:
                return v
        except Exception:
            pass
    # Fallback : premier gros nombre
    for m in re.findall(r"(\d[\d\s]{4,}(?:\d))", text):
        v_str = re.sub(r"\s", "", m)
        try:
            v = float(v_str)
            if 100_000 <= v <= 500_000_000_000:
                return v
        except Exception:
            pass
    return None


def detect_region(text):
    tu = text.upper()
    for k, v in REGION_MAP.items():
        if k in tu:
            return v
    return None


def detect_sector(text):
    t = text.lower()
    if any(k in t for k in ["travaux", "construction", "réhabilitation", "route", "bâtiment",
                             "génie civil", "terrassement", "pont", "ouvrage d'art", "boutique",
                             "marché communal", "bloc de", "salle de classe"]):
        return "travaux"
    if any(k in t for k in ["fourniture", "matériel", "équipement", "mobilier", "véhicule",
                             "acquisition de", "intrant", "achat de"]):
        return "fournitures"
    if any(k in t for k in ["informatique", "logiciel", "réseau", "système d'information",
                             "numérique", "serveur", "hardware", "développement"]):
        return "informatique"
    if "assurance" in t:
        return "assurance"
    return "services"


def determine_status(pub_type, deadline):
    if pub_type in ("DEC-INF",):
        return "cancelled"
    if pub_type in ("ATT", "RES"):
        return "awarded"
    if deadline and deadline < date.today():
        return "closed"
    return "open"


def _is_section_header(tag):
    """Vérifie si un tag est un en-tête de section ARMP (ex: '2.Consistance', '3.Cout')."""
    if not hasattr(tag, "find") or not hasattr(tag, "name") or not tag.name:
        return False
    s = tag.find("strong")
    if not s:
        return False
    t = s.get_text(strip=True)
    return bool(re.match(r"^\d+\.", t))


def section_text(soup, keyword):
    """Extrait le texte du div suivant une section <strong> identifiée par keyword.
    Structure ARMP : <div class='font-weight-bolder'><strong>N.Section</strong></div>
                     <div>Contenu (parfois avec <strong> intégré)...</div>
    """
    for strong in soup.find_all("strong"):
        if keyword.lower() in strong.get_text().lower():
            header_div = strong.find_parent("div")
            if header_div:
                for sib in header_div.next_siblings:
                    if not hasattr(sib, "get_text"):
                        continue
                    # Arrêter uniquement si c'est un en-tête de section (N.Titre)
                    if _is_section_header(sib):
                        break
                    t = sib.get_text(" ", strip=True)
                    if t and len(t) > 5:
                        return clean(t)[:600]
            # Fallback : siblings du parent du strong
            result = []
            for sib in strong.parent.next_siblings:
                if hasattr(sib, "find") and _is_section_header(sib):
                    break
                tag_text = sib.get_text(" ", strip=True) if hasattr(sib, "get_text") else str(sib).strip()
                if tag_text:
                    result.append(tag_text)
                if len(" ".join(result)) > 600:
                    break
            return clean(" ".join(result))[:600] if result else None
    return None


async def scrape_detail(client, pub_type, pub_id):
    url = f"{BASE}/details?type_publication={pub_type}&id_publication={pub_id}"
    try:
        r = await client.get(url, timeout=20)
        if r.status_code != 200:
            return None

        soup = BeautifulSoup(r.text, "html.parser")
        full_text = soup.get_text(" ", strip=True)

        # ── Autorité contractante (1ère table, 1ère cellule) ────────────────
        authority = "ARMP"
        tables = soup.find_all("table")
        if tables:
            first_td = tables[0].find("td") or tables[0].find("th")
            if first_td:
                auth_text = clean(first_td.get_text(" ", strip=True))
                if 5 < len(auth_text) < 250:
                    authority = auth_text

        # ── Titre : section 1.Objet ────────────────────────────────────────
        raw_objet = section_text(soup, "1.Objet") or section_text(soup, "Objet")
        title = None
        if raw_objet:
            # Cas 1 : le titre est directement après "pour (les) <mot-clé métier>..."
            m_pour = re.search(
                r"pour\s+(?:l[ae]s?\s+)?((?:travaux|fourniture|service|construction|"
                r"r\xe9habilitation|acquisition|mise en place|entretien|installation|"
                r"r\xe9alisation|\xe9tude|recrutement|prestation|livraison|achat|"
                r"location|maintenance)[^.]{10,})",
                raw_objet, re.IGNORECASE
            )
            if m_pour:
                title = clean(m_pour.group(1))[:400]
            else:
                # Cas 2 : supprimer le préambule d'autorité avant le verbe d'action
                cleaned = re.sub(
                    r"^.*?(?:lance[,\s]+|invite[,\s]+|publie[,\s]+|émet[,\s]+|procède[,\s]+)",
                    "", raw_objet, flags=re.IGNORECASE
                ).strip()
                # Supprimer "un/une Appel ... pour " résiduel en début
                cleaned = re.sub(
                    r"^(?:un|une)\s+(?:Appel|Avis)[^\n]{0,80}pour\s+(?:l[ae]s?\s+)?",
                    "", cleaned, flags=re.IGNORECASE
                ).strip()
                title = clean(cleaned)[:400] if cleaned and len(cleaned) > 10 else None

        # Fallback : chercher un strong de contenu (titre inséré dans balise strong)
        if not title:
            for s in soup.find_all("strong"):
                t = s.get_text(" ", strip=True)
                # Exclure les en-têtes de section (N.Xxx) et les éléments parasites
                if (20 < len(t) < 400
                        and not re.match(r"^\d+\.", t)
                        and "support@" not in t.lower()
                        and "marchespublics" not in t.lower()
                        and any(k in t.lower() for k in [
                            "travaux", "fourniture", "service", "construction",
                            "acquisition", "réhabilitation", "installation",
                            "entretien", "réalisation", "étude", "prestation",
                            "livraison", "achat", "maintenance", "recrutement"
                        ])):
                    title = clean(t)[:400]
                    break

        if not title:
            title = f"{TYPE_LABELS.get(pub_type, pub_type)} N°{pub_id}"

        # ── Montant (section 3.Cout Prévisionnel) ─────────────────────────
        cout_text = section_text(soup, "3.Cout") or section_text(soup, "Coût Prévisionnel") or ""
        estimated_amount = to_amount(cout_text)
        # Fallback : chercher FCFA dans tout le texte si pas trouvé
        if not estimated_amount:
            estimated_amount = to_amount(full_text[:3000])

        # ── Cautionnement (section 11) ──────────────────────────────────────
        caut_text = section_text(soup, "11.Cautionnement") or section_text(soup, "Cautionnement") or ""
        caution_amount = to_amount(caut_text)

        # ── Délai d'exécution (section 10) ─────────────────────────────────
        delai_text = section_text(soup, "10.Delai") or section_text(soup, "Délai de Livraison") or ""
        delai_exec = delai_text[:200] if delai_text else None

        # ── Financement (section 6) ─────────────────────────────────────────
        financing = section_text(soup, "6.Financement") or section_text(soup, "Financement")

        # ── Description complète (section 2 + objet) ───────────────────────
        consistance = section_text(soup, "2.Consistance") or ""
        description = clean(f"{title} {consistance}")[:2000] if consistance else title

        # ── Dates ──────────────────────────────────────────────────────────
        # Date de publication : chercher "Publié le" ou la 1ère date dans le texte
        pub_date = date.today()
        pub_m = re.search(r"Publi[ée]\s+le\s+(\d{1,2}[-/]\d{1,2}[-/]\d{4})", full_text, re.IGNORECASE)
        if pub_m:
            pub_date = to_date(pub_m.group(1)) or pub_date

        # Date limite : section 9 (Remise des offres) — chercher la date la plus proche dans le futur
        remise_text = section_text(soup, "9.Remises") or section_text(soup, "Remise des offres") or ""
        deadline = None
        all_dates = re.findall(r"\d{1,2}[/\-]\d{1,2}[/\-]\d{4}", remise_text + " " + full_text)
        today = date.today()
        for ds in all_dates:
            d_val = to_date(ds)
            if d_val and d_val >= today:
                deadline = d_val
                break
        # Si pas de date future, prendre la dernière date du texte de remise
        if not deadline and all_dates:
            for ds in reversed(all_dates[:10]):
                d_val = to_date(ds)
                if d_val:
                    deadline = d_val
                    break

        # ── Référence officielle ────────────────────────────────────────────
        reference = f"{pub_type}/{pub_id}/2026"
        ref_m = re.search(r"N[°º]\s*[\w/_-]{3,}[/\s\-]\d{4}", full_text)
        if ref_m:
            reference = clean(ref_m.group(0))[:255]

        region = detect_region(full_text)
        sector = detect_sector(full_text)
        status = determine_status(pub_type, deadline)
        tender_type = TYPE_LABELS.get(pub_type, pub_type)

        return {
            "external_id":       f"{pub_type}-{pub_id}",
            "reference":         reference,
            "title":             title[:400],
            "authority":         authority[:250],
            "sector":            sector,
            "region":            region,
            "procedure_type":    tender_type,
            "estimated_amount":  estimated_amount,
            "publication_date":  pub_date,
            "deadline":          deadline,
            "description":       description,
            "source_url":        url,
            "source":            "armp_scraping",
            "status":            status,
            "raw_data": {
                "caution_amount": caution_amount,
                "delai_execution": delai_exec,
                "financing": financing,
            },
        }

    except Exception as e:
        log.warning(f"✗ {pub_type}-{pub_id}: {e}")
        return None


async def collect_all_ids(client, max_pages=50):
    all_ids = []
    seen = set()
    page = 1
    while page <= max_pages:
        try:
            r = await client.get(f"{BASE}?page={page}", timeout=15)
            ids = re.findall(r"type_publication=([A-Z\-]+)&id_publication=(\d+)", r.text)
            seen_pairs = set()
            new = []
            for t, i in ids:
                if i not in seen and (t, i) not in seen_pairs:
                    new.append((t, i))
                    seen_pairs.add((t, i))
            if not new:
                log.info(f"Page {page}: aucun nouvel ID → arrêt")
                break
            for t, i in new:
                seen.add(i)
                all_ids.append((t, i))
            log.info(f"Page {page}: +{len(new)} marchés (total: {len(all_ids)})")
            page += 1
            await asyncio.sleep(0.3)
        except Exception as e:
            log.warning(f"Erreur page {page}: {e}")
            break
    return all_ids


async def main():
    log.info("═══════════════════════════════════════════")
    log.info("  Scraping COMPLET de armp.cm (v2 — données complètes)")
    log.info("═══════════════════════════════════════════\n")

    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        all_ids = await collect_all_ids(client)
        log.info(f"\n→ {len(all_ids)} fiches à scraper\n")

        tenders = []
        BATCH = 5
        for i in range(0, len(all_ids), BATCH):
            batch = all_ids[i:i + BATCH]
            results = await asyncio.gather(*[
                scrape_detail(client, t, pid) for t, pid in batch
            ])
            tenders.extend([r for r in results if r])
            if i % 50 == 0:
                log.info(f"  Progression : {i}/{len(all_ids)} ({len(tenders)} extraits)")
            await asyncio.sleep(0.8)

    log.info(f"\n→ {len(tenders)} fiches extraites — injection en base...\n")

    sys.path.insert(0, ".")
    from app.db.session import async_session_factory
    from app.services.services import TenderService

    inserted = updated = errors = 0
    async with async_session_factory() as db:
        svc = TenderService(db)
        for t in tenders:
            payload = {k: v for k, v in t.items() if not k.startswith("_")}
            try:
                result = await svc.upsert_tender(payload)
                if result:
                    inserted += 1
                else:
                    updated += 1
            except Exception as e:
                errors += 1
                log.warning(f"  upsert échoué {t['external_id']}: {e}")

    log.info("\n═══════════════════════════════════════════")
    log.info(f"  ✅ {inserted} insérés | {updated} mis à jour | {errors} erreurs")
    log.info("═══════════════════════════════════════════\n")

    from collections import Counter
    by_type   = Counter(t.get("procedure_type", "?") for t in tenders)
    by_region = Counter(t.get("region") or "—" for t in tenders)
    by_sector = Counter(t.get("sector", "?") for t in tenders)
    by_status = Counter(t.get("status", "?") for t in tenders)
    with_amount = sum(1 for t in tenders if t.get("estimated_amount"))
    with_deadline = sum(1 for t in tenders if t.get("deadline"))

    log.info(f"  Avec montant   : {with_amount}/{len(tenders)}")
    log.info(f"  Avec deadline  : {with_deadline}/{len(tenders)}")

    log.info("\n── Par type ──")
    for k, v in by_type.most_common():
        log.info(f"  {k:40} : {v}")
    log.info("\n── Par région ──")
    for k, v in by_region.most_common():
        log.info(f"  {k:20} : {v}")
    log.info("\n── Par secteur ──")
    for k, v in by_sector.most_common():
        log.info(f"  {k:20} : {v}")
    log.info("\n── Par statut ──")
    for k, v in by_status.most_common():
        log.info(f"  {k:20} : {v}")

    return inserted + updated


if __name__ == "__main__":
    asyncio.run(main())
