-- Script pour diagnostiquer le problème des dépenses et inventaires

-- 1. Lister tous les inventaires avec leurs périodes
SELECT 
  id,
  date as date_inventaire,
  "dateDebut",
  "dateFin",
  "financesCalcules",
  statut,
  TO_CHAR(date, 'DD/MM/YYYY') as date_formatted,
  CASE 
    WHEN "dateDebut" IS NOT NULL THEN TO_CHAR("dateDebut", 'DD/MM/YYYY')
    ELSE 'N/A'
  END as debut_formatted,
  CASE 
    WHEN "dateFin" IS NOT NULL THEN TO_CHAR("dateFin", 'DD/MM/YYYY')
    ELSE 'N/A'
  END as fin_formatted
FROM inventaire
ORDER BY date DESC;

-- 2. Lister toutes les dépenses avec leur inventaire
SELECT 
  id,
  TO_CHAR(date, 'DD/MM/YYYY') as date_formatted,
  montant,
  description,
  CASE 
    WHEN "inventaireId" IS NOT NULL THEN 'Attachée à ' || "inventaireId"
    ELSE 'NON ATTACHÉE'
  END as statut_inventaire
FROM depense
ORDER BY date DESC;

-- 3. Compter les dépenses par statut
SELECT 
  CASE 
    WHEN "inventaireId" IS NOT NULL THEN 'Attachées'
    ELSE 'Non attachées'
  END as statut,
  COUNT(*) as nombre
FROM depense
GROUP BY CASE WHEN "inventaireId" IS NOT NULL THEN 'Attachées' ELSE 'Non attachées' END;
