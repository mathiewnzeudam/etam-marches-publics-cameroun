-- ============================================================
--  Marché-IA Cameroun
--  Seed 001 — Données de test réalistes
--  NE PAS exécuter en production
-- ============================================================

-- Désactiver les vérifications d'intégrité temporairement
SET session_replication_role = 'replica';

-- ────────────────────────────────────────────────────────────
--  UTILISATEURS DE TEST
-- ────────────────────────────────────────────────────────────
-- Mot de passe de tous les comptes test : "Marche2026!"
-- Hash bcrypt correspondant :
-- $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm

INSERT INTO users (id, email, full_name, hashed_password, phone, role, organization, region, sectors, is_verified, is_active)
VALUES
    -- Admin plateforme
    (
        '00000000-0000-0000-0000-000000000001',
        'admin@marche-ia.cm',
        'Administrateur Système',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm',
        '+237699000001',
        'admin',
        'Marché-IA Cameroun',
        'Centre',
        ARRAY['travaux', 'fournitures', 'services', 'informatique'],
        TRUE, TRUE
    ),
    -- Entreprise BTP
    (
        '00000000-0000-0000-0000-000000000002',
        'contact@batipro-cm.com',
        'Jean-Baptiste Essomba',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm',
        '+237677123456',
        'company',
        'BatiPro Cameroun SARL',
        'Littoral',
        ARRAY['travaux', 'bâtiment'],
        TRUE, TRUE
    ),
    -- PME informatique
    (
        '00000000-0000-0000-0000-000000000003',
        'info@techcm-solutions.com',
        'Marie-Claire Njoya',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm',
        '+237655987654',
        'company',
        'TechCM Solutions',
        'Centre',
        ARRAY['informatique', 'services', 'fournitures'],
        TRUE, TRUE
    ),
    -- Bureau d'études
    (
        '00000000-0000-0000-0000-000000000004',
        'bureau@ingecam.cm',
        'Paul Mbarga',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm',
        '+237691234567',
        'company',
        'IngéCam Bureau d''Études',
        'Centre',
        ARRAY['études', 'services', 'travaux'],
        TRUE, TRUE
    ),
    -- Maître d'ouvrage (MINEE)
    (
        '00000000-0000-0000-0000-000000000005',
        'dpm@minee.cm',
        'Aboubakar Aliou',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm',
        '+237222234567',
        'authority',
        'Ministère de l''Eau et de l''Énergie (MINEE)',
        'Centre',
        NULL,
        TRUE, TRUE
    ),
    -- Citoyen / société civile
    (
        '00000000-0000-0000-0000-000000000006',
        'citoyen.ngando@gmail.com',
        'Rosine Ngando',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm',
        '+237670456789',
        'citizen',
        NULL,
        'Littoral',
        NULL,
        FALSE, TRUE
    ),
    -- Institution partenaire (université)
    (
        '00000000-0000-0000-0000-000000000007',
        'recherche@uy1.uninet.cm',
        'Dr. Simon Atangana',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiJoOK9/pFI0xYEJbMQH3ZxKvELm',
        '+237222205050',
        'institution',
        'Université de Yaoundé I',
        'Centre',
        ARRAY['études', 'formation'],
        TRUE, TRUE
    )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
--  APPELS D'OFFRES DE TEST — Réalistes (format ARMP)
-- ────────────────────────────────────────────────────────────
INSERT INTO tenders (
    id, external_id, reference, title, authority,
    sector, region, procedure_type, estimated_amount,
    publication_date, deadline, status, description, source_url
)
VALUES
    -- 1. Travaux route (ouvert, urgent)
    (
        '10000000-0000-0000-0000-000000000001',
        'ARMP-2026-001',
        '001/AONO/MINTP/CIPM/2026',
        'Travaux d''entretien et de réhabilitation de la route nationale RN2 tronçon Yaoundé-Bertoua (50 km)',
        'Ministère des Travaux Publics (MINTP)',
        'travaux', 'Centre', 'AONO',
        2500000000,
        '2026-03-15', '2026-05-05', 'open',
        'Les travaux portent sur l''entretien périodique et la réhabilitation de la chaussée, des ouvrages d''art et des équipements de sécurité sur le tronçon RN2 Yaoundé-Bertoua.',
        'https://armp.cm/avis/001'
    ),
    -- 2. Fournitures médicaments (ouvert)
    (
        '10000000-0000-0000-0000-000000000002',
        'ARMP-2026-002',
        '002/AONO/MINSANTE/CIPM/2026',
        'Fourniture de médicaments essentiels et consommables médicaux pour les hôpitaux régionaux - Lot 1 à 5',
        'Ministère de la Santé Publique (MINSANTE)',
        'fournitures', 'Centre', 'AONO',
        800000000,
        '2026-03-20', '2026-04-30', 'open',
        'Acquisition de médicaments essentiels, dispositifs médicaux et consommables pour 8 hôpitaux régionaux du Cameroun pour l''exercice 2026.',
        'https://armp.cm/avis/002'
    ),
    -- 3. Informatique (ouvert)
    (
        '10000000-0000-0000-0000-000000000003',
        'ARMP-2026-003',
        '003/AONO/MINFI/CIPM/2026',
        'Acquisition de matériels informatiques et licences logicielles pour la modernisation de l''administration fiscale',
        'Ministère des Finances (MINFI)',
        'informatique', 'Centre', 'AONO',
        350000000,
        '2026-03-25', '2026-04-25', 'open',
        'Fourniture de 500 ordinateurs de bureau, 200 imprimantes multifonctions et licences Microsoft 365 pour les services de la DGI.',
        'https://armp.cm/avis/003'
    ),
    -- 4. Électrification rurale (ouvert, Adamaoua)
    (
        '10000000-0000-0000-0000-000000000004',
        'ARMP-2026-004',
        '004/AONO/MINEE/CIPM/2026',
        'Travaux d''électrification rurale dans 12 villages du département du Faro et Déo, région de l''Adamaoua',
        'Ministère de l''Eau et de l''Énergie (MINEE)',
        'énergie', 'Adamaoua', 'AONO',
        1200000000,
        '2026-04-01', '2026-05-15', 'open',
        'Extension du réseau électrique basse tension, installation de transformateurs et raccordement de 1200 ménages dans les villages ciblés.',
        'https://armp.cm/avis/004'
    ),
    -- 5. Construction école (ouvert, Nord)
    (
        '10000000-0000-0000-0000-000000000005',
        'ARMP-2026-005',
        '005/AONO/MINEDUB/CIPM/2026',
        'Construction et équipement de 10 écoles primaires dans la région du Nord',
        'Ministère de l''Éducation de Base (MINEDUB)',
        'bâtiment', 'Nord', 'AONO',
        600000000,
        '2026-04-05', '2026-05-20', 'open',
        'Construction de salles de classe, latrines, clôtures et fourniture du mobilier scolaire dans 10 communes de la région du Nord.',
        'https://armp.cm/avis/005'
    ),
    -- 6. Étude faisabilité (AMI, services intellectuels)
    (
        '10000000-0000-0000-0000-000000000006',
        'ARMP-2026-006',
        '006/AMI/MINEPAT/CIPM/2026',
        'Recrutement d''un consultant pour l''étude de faisabilité du projet de modernisation du cadastre national',
        'Ministère de l''Économie, de la Planification et de l''Aménagement du Territoire (MINEPAT)',
        'services', 'Centre', 'AMI',
        45000000,
        '2026-04-10', '2026-04-30', 'open',
        'Mission de 6 mois pour réaliser l''étude de faisabilité, l''analyse des besoins et la proposition d''architecture du système de modernisation.',
        'https://armp.cm/avis/006'
    ),
    -- 7. Marché attribué (eau potable)
    (
        '10000000-0000-0000-0000-000000000007',
        'ARMP-2025-089',
        '089/AONO/CAMWATER/CIPM/2025',
        'Réhabilitation et extension du réseau d''adduction d''eau potable de Bafoussam',
        'CAMWATER',
        'eau', 'Ouest', 'AONO',
        1850000000,
        '2025-10-05', '2025-11-20', 'awarded',
        'Travaux de réhabilitation de 35 km de réseau, construction de 2 châteaux d''eau et branchements de 5000 ménages.',
        'https://armp.cm/avis/089-2025'
    ),
    -- 8. Demande de cotation (petit marché)
    (
        '10000000-0000-0000-0000-000000000008',
        'ARMP-2026-008',
        '008/DC/MAIRIE-DLA/2026',
        'Fourniture de fournitures de bureau pour la Communauté Urbaine de Douala',
        'Communauté Urbaine de Douala',
        'fournitures', 'Littoral', 'DC',
        8500000,
        '2026-04-15', '2026-04-28', 'open',
        'Acquisition de papier ramettes, cartouches d''encre, stylos, classeurs et autres consommables bureautiques.',
        'https://armp.cm/avis/008'
    ),
    -- 9. Gré à gré (cas exceptionnel)
    (
        '10000000-0000-0000-0000-000000000009',
        'ARMP-2026-009',
        '009/GG/MINCOM/2026',
        'Renouvellement d''abonnement aux agences de presse internationales (AFP, Reuters)',
        'Ministère de la Communication (MINCOM)',
        'services', 'Centre', 'gre_a_gre',
        25000000,
        '2026-04-18', NULL, 'awarded',
        'Renouvellement annuel des abonnements aux fils d''actualité AFP et Reuters pour la CRTV et les médias publics.',
        'https://armp.cm/avis/009'
    ),
    -- 10. Marché annulé
    (
        '10000000-0000-0000-0000-000000000010',
        'ARMP-2026-010',
        '010/AONO/MINHDU/CIPM/2026',
        'Construction d''un centre culturel polyvalent à Garoua — ANNULÉ',
        'Ministère de l''Habitat et du Développement Urbain (MINHDU)',
        'bâtiment', 'Nord', 'AONO',
        900000000,
        '2026-02-10', '2026-03-25', 'cancelled',
        'Marché annulé suite à des irrégularités constatées dans le dossier d''appel d''offres lors de l''examen par la CSCM.',
        'https://armp.cm/avis/010'
    ),
    -- 11. Formation professionnelle (Littoral)
    (
        '10000000-0000-0000-0000-000000000011',
        'ARMP-2026-011',
        '011/DDP/MINEFOP/CIPM/2026',
        'Recrutement d''organismes de formation pour la mise en oeuvre du Programme d''Appui à la Formation Professionnelle',
        'Ministère de l''Emploi et de la Formation Professionnelle (MINEFOP)',
        'services', 'Littoral', 'DDP',
        120000000,
        '2026-04-12', '2026-05-12', 'open',
        'Sélection de 5 organismes de formation agréés pour assurer 50 000 heures de formation dans les secteurs BTP, mécanique et informatique.',
        'https://armp.cm/avis/011'
    ),
    -- 12. Santé (Nord-Ouest)
    (
        '10000000-0000-0000-0000-000000000012',
        'ARMP-2026-012',
        '012/AONO/MINSANTE/NW/2026',
        'Réhabilitation et équipement de l''Hôpital Régional de Bamenda',
        'Délégation Régionale Santé Nord-Ouest',
        'santé', 'Nord-Ouest', 'AONO',
        750000000,
        '2026-04-08', '2026-05-25', 'open',
        'Travaux de réhabilitation des blocs opératoires, acquisition d''équipements médicaux et installation de groupe électrogène.',
        'https://armp.cm/avis/012'
    )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
--  CONVERSATIONS ET MESSAGES DE TEST
-- ────────────────────────────────────────────────────────────
INSERT INTO conversations (id, user_id, title, status)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'Comment soumettre une offre sur COLEPS ?',
        'active'
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        'Délai de recours après une attribution',
        'active'
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000004',
        'Conditions du marché gré à gré',
        'active'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, role, content, sources, tokens_input, tokens_output, model_used, latency_ms, feedback)
VALUES
    -- Conversation 1 : comment soumettre une offre COLEPS
    (
        '30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'user',
        'Comment soumettre une offre sur COLEPS pour un appel d''offres ouvert ?',
        NULL, NULL, NULL, NULL, NULL, NULL
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001',
        'assistant',
        'Pour soumettre une offre sur COLEPS, vous devez suivre ces étapes :\n\n1. **Inscription et certificat numérique** : Créez votre compte sur marchespublics.cm et obtenez un certificat PKI auprès de l''ANTIC (obligatoire pour la signature électronique).\n\n2. **Téléchargement du DAO** : Accédez à l''avis d''appel d''offres concerné, téléchargez le Dossier d''Appel d''Offres et acquittez les frais de consultation si applicables.\n\n3. **Préparation des pièces** : Constituez votre dossier administratif (attestation DGI, quitus CNPS, RCCM, NINEA), votre offre technique et votre offre financière selon les exigences du DAO.\n\n4. **Soumission électronique** : Téléversez vos documents sur COLEPS avant la date et l''heure limite. Le système horodate et chiffre automatiquement votre soumission.\n\n**Base légale** : Article 38 du Décret n°2018/366 du 20 juin 2018 portant Code des marchés publics.\n\n⚠️ Attention : toute offre déposée après la date limite est automatiquement rejetée par le système.',
        '[{"rank":1,"source_name":"Décret n°2018/366","article_ref":"Article 38","score":0.92,"source_type":"code_marches"}]'::jsonb,
        1250, 380, 'claude-sonnet-4-6', 2340.5, 1
    ),
    -- Conversation 2 : délai de recours
    (
        '30000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000002',
        'user',
        'Quel est le délai pour introduire un recours après la publication d''une attribution de marché ?',
        NULL, NULL, NULL, NULL, NULL, NULL
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000002',
        'assistant',
        'Selon l''Article 74 du Code des marchés publics (Décret n°2018/366), le délai de recours est de **5 jours ouvrables** à compter de la publication de la décision d''attribution dans le Journal des Marchés Publics (JDM).\n\nVoici la procédure :\n\n1. **Destinataire** : Votre requête doit être adressée à l''ARMP (Agence de Régulation des Marchés Publics).\n\n2. **Forme** : La requête doit être écrite, datée, signée et accompagnée des pièces justificatives (copie de votre offre, décision d''attribution, motifs de contestation).\n\n3. **Délai de traitement** : L''ARMP dispose de 10 jours ouvrables pour statuer.\n\n4. **Effet suspensif** : Le recours peut suspendre la signature du contrat si l''ARMP le juge fondé.\n\n**Important** : Passé le délai de 5 jours, le recours est irrecevable et le contrat peut être signé avec l''attributaire.',
        '[{"rank":1,"source_name":"Décret n°2018/366","article_ref":"Article 74","score":0.96,"source_type":"code_marches"},{"rank":2,"source_name":"Décret n°2018/366","article_ref":"Article 75","score":0.88,"source_type":"code_marches"}]'::jsonb,
        1100, 320, 'claude-sonnet-4-6', 1980.2, 1
    )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
--  ALERTES DE TEST
-- ────────────────────────────────────────────────────────────
INSERT INTO alerts (id, user_id, name, sectors, regions, keywords, min_amount, max_amount, channel, active)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'Marchés BTP Littoral',
        ARRAY['travaux', 'bâtiment'],
        ARRAY['Littoral', 'Centre'],
        ARRAY['réhabilitation', 'construction', 'route'],
        100000000, NULL,
        'whatsapp', TRUE
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        'Marchés Informatique Cameroun',
        ARRAY['informatique', 'fournitures'],
        ARRAY[]::TEXT[],
        ARRAY['informatique', 'logiciel', 'réseau', 'ordinateur'],
        5000000, 500000000,
        'email', TRUE
    ),
    (
        '40000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000004',
        'Études et missions intellectuelles',
        ARRAY['services', 'études'],
        ARRAY[]::TEXT[],
        ARRAY['étude', 'consultant', 'bureau', 'faisabilité'],
        NULL, NULL,
        'in_app', TRUE
    ),
    (
        '40000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000006',
        'Marchés région Littoral (transparence)',
        ARRAY[]::TEXT[],
        ARRAY['Littoral'],
        ARRAY[]::TEXT[],
        NULL, NULL,
        'in_app', TRUE
    )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
--  DOCUMENTS GÉNÉRÉS DE TEST
-- ────────────────────────────────────────────────────────────
INSERT INTO documents (id, user_id, tender_id, type, title, content, metadata, status)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000001',
        'submission_letter',
        'Lettre de soumission — 001/AONO/MINTP/CIPM/2026',
        'Yaoundé, le 20 avril 2026

À Monsieur le Président de la Commission de Passation des Marchés du MINTP
Ministère des Travaux Publics
B.P. 1234 Yaoundé

Objet : Soumission à l''appel d''offres national ouvert N°001/AONO/MINTP/CIPM/2026
pour les Travaux d''entretien et de réhabilitation de la route nationale RN2 tronçon Yaoundé-Bertoua

Monsieur le Président,

En réponse à votre avis d''appel d''offres susvisé, publié au Journal des Marchés Publics
en date du 15 mars 2026, j''ai l''honneur de soumettre, pour le compte de la société BatiPro Cameroun SARL,
la présente offre de soumission...

[Document généré automatiquement par Marché-IA]',
        '{"company_name": "BatiPro Cameroun SARL", "representative": "Jean-Baptiste Essomba", "tokens": 1850, "generated_at": "2026-04-20T10:30:00"}'::jsonb,
        'finalized'
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003',
        'technical_offer',
        'Offre technique — 003/AONO/MINFI/CIPM/2026',
        'OFFRE TECHNIQUE

Soumissionnaire : TechCM Solutions
NINEA : P0123456789
Objet : Acquisition de matériels informatiques et licences logicielles

1. COMPRÉHENSION DU BESOIN
TechCM Solutions a analysé avec attention le Dossier d''Appel d''Offres...

[Document généré automatiquement par Marché-IA]',
        '{"company_name": "TechCM Solutions", "representative": "Marie-Claire Njoya", "tokens": 2100, "generated_at": "2026-04-21T14:15:00"}'::jsonb,
        'draft'
    )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
--  SYNC JOBS DE TEST
-- ────────────────────────────────────────────────────────────
INSERT INTO sync_jobs (id, source, status, records_synced, started_at, finished_at)
VALUES
    (
        '60000000-0000-0000-0000-000000000001',
        'armp_feed', 'success', 12,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours' + INTERVAL '45 seconds'
    ),
    (
        '60000000-0000-0000-0000-000000000002',
        'armp_feed', 'success', 3,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '3 hours' + INTERVAL '38 seconds'
    ),
    (
        '60000000-0000-0000-0000-000000000003',
        'armp_feed', 'failed', 0,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '5 hours' + INTERVAL '10 seconds'
    )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
--  AUDIT LOGS DE TEST
-- ────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, entity_type, metadata)
VALUES
    ('00000000-0000-0000-0000-000000000002', 'auth.register',  NULL,       '{"ip": "41.202.219.10"}'::jsonb),
    ('00000000-0000-0000-0000-000000000002', 'auth.login',     NULL,       '{"ip": "41.202.219.10"}'::jsonb),
    ('00000000-0000-0000-0000-000000000002', 'chat.message',   'message',  '{"question_length": 52}'::jsonb),
    ('00000000-0000-0000-0000-000000000003', 'auth.register',  NULL,       '{"ip": "102.244.133.5"}'::jsonb),
    ('00000000-0000-0000-0000-000000000003', 'alert.create',   'alert',    '{"alert_name": "Marchés Informatique"}'::jsonb),
    ('00000000-0000-0000-0000-000000000003', 'doc.generate',   'document', '{"doc_type": "technical_offer"}'::jsonb),
    ('00000000-0000-0000-0000-000000000004', 'auth.login',     NULL,       '{"ip": "197.234.1.22"}'::jsonb),
    ('00000000-0000-0000-0000-000000000004', 'chat.message',   'message',  '{"question_length": 68}'::jsonb);


-- Réactiver les contraintes
SET session_replication_role = 'origin';


-- ────────────────────────────────────────────────────────────
--  VÉRIFICATION FINALE
-- ────────────────────────────────────────────────────────────
SELECT 'users'           AS table_name, COUNT(*) FROM users
UNION ALL
SELECT 'tenders',                        COUNT(*) FROM tenders
UNION ALL
SELECT 'conversations',                  COUNT(*) FROM conversations
UNION ALL
SELECT 'messages',                       COUNT(*) FROM messages
UNION ALL
SELECT 'alerts',                         COUNT(*) FROM alerts
UNION ALL
SELECT 'documents',                      COUNT(*) FROM documents
UNION ALL
SELECT 'sync_jobs',                      COUNT(*) FROM sync_jobs
UNION ALL
SELECT 'audit_logs',                     COUNT(*) FROM audit_logs
ORDER BY table_name;
