-- ============================================================
--  Migration 006 — Corrige deux contraintes CHECK désynchronisées du code
-- ============================================================
--
-- 1) chk_users_role (+ le trigger validate_user_role) attendait
--    'company' / 'institution', mais le formulaire d'inscription
--    (frontend) envoie 'enterprise' depuis toujours et le schéma
--    backend (RegisterRequest) restreint désormais explicitement à
--    citizen/enterprise/authority. Conséquence en production : toute
--    inscription "Entreprise" échouait avec une violation de contrainte.
--
-- 2) chk_tenders_procedure_type n'autorisait que des codes courts
--    (AONO, AOIO, AOR, DC, gre_a_gre, AMI, DDP) alors que le scraper ARMP
--    (_map_proc_type) produit des libellés français complets
--    ("Appel d'Offres National Ouvert", etc.) ou, depuis un changement
--    récent du site armp.cm, des libellés anglais bruts non mappés.
--    Conséquence en production : 0 marché inséré (chaque échec avortait
--    la transaction pour tout le lot en cours, faute de rollback — voir
--    aussi le correctif apporté à TenderService.upsert_tender).

-- ── users.role ──────────────────────────────────────────────
-- Le trigger doit être corrigé AVANT l'UPDATE de normalisation ci-dessous,
-- sinon celui-ci échoue en tentant d'écrire 'enterprise' avant que le
-- trigger n'accepte cette valeur.
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role NOT IN ('citizen', 'enterprise', 'authority', 'admin') THEN
        RAISE EXCEPTION 'Rôle invalide: %. Valeurs autorisées: citizen, enterprise, authority, admin', NEW.role;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

-- Normaliser les comptes existants créés avec l'ancienne valeur 'company'
-- AVANT de resserrer la contrainte (sinon l'ADD CONSTRAINT échoue sur ces lignes).
UPDATE users SET role = 'enterprise' WHERE role = 'company';

ALTER TABLE users
    ADD CONSTRAINT chk_users_role
    CHECK (role IN ('citizen', 'enterprise', 'authority', 'admin'));

-- ── tenders.procedure_type ──────────────────────────────────
-- Libellé descriptif dérivé d'une source externe évolutive (site ARMP) :
-- une énumération figée est trop fragile. On retire la contrainte plutôt
-- que de la maintenir en permanence en synchro avec sync_worker.py.
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS chk_tenders_procedure_type;
