-- ============================================================
-- PERFORMANCE INDEXES - Optimisation des requêtes
-- ============================================================

-- ARTICLE - Table des articles/produits
CREATE INDEX IF NOT EXISTS "IDX_article_organizationId" ON "article" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_article_categorieId" ON "article" ("categorieId");
CREATE INDEX IF NOT EXISTS "IDX_article_createdAt" ON "article" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_article_nom" ON "article" ("nom");
CREATE INDEX IF NOT EXISTS "IDX_article_zone" ON "article" ("zone");
CREATE INDEX IF NOT EXISTS "IDX_article_org_created" ON "article" ("organizationId", "createdAt" DESC);

-- VENTE - Table des ventes
CREATE INDEX IF NOT EXISTS "IDX_vente_organizationId" ON "vente" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_vente_clientId" ON "vente" ("clientId");
CREATE INDEX IF NOT EXISTS "IDX_vente_numero" ON "vente" ("numero");
CREATE INDEX IF NOT EXISTS "IDX_vente_date" ON "vente" ("date");
CREATE INDEX IF NOT EXISTS "IDX_vente_createdAt" ON "vente" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_vente_modePaiement" ON "vente" ("modePaiement");
CREATE INDEX IF NOT EXISTS "IDX_vente_org_date" ON "vente" ("organizationId", "date" DESC);
CREATE INDEX IF NOT EXISTS "IDX_vente_org_created" ON "vente" ("organizationId", "createdAt" DESC);

-- COMMANDE - Table des commandes clients
CREATE INDEX IF NOT EXISTS "IDX_commande_organizationId" ON "commande" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_commande_clientId" ON "commande" ("clientId");
CREATE INDEX IF NOT EXISTS "IDX_commande_venteId" ON "commande" ("venteId");
CREATE INDEX IF NOT EXISTS "IDX_commande_userId" ON "commande" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_commande_dateLivraison" ON "commande" ("dateLivraison");
CREATE INDEX IF NOT EXISTS "IDX_commande_createdAt" ON "commande" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_commande_org_statut" ON "commande" ("organizationId", "statut");
CREATE INDEX IF NOT EXISTS "IDX_commande_org_dateLiv" ON "commande" ("organizationId", "dateLivraison");

-- APPROVISIONNEMENT - Table des approvisionnements
CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_organizationId" ON "approvisionnement" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_fournisseurId" ON "approvisionnement" ("fournisseurId");
CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_numero" ON "approvisionnement" ("numero");
CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_dateLivraison" ON "approvisionnement" ("dateLivraison");
CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_createdAt" ON "approvisionnement" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_org_created" ON "approvisionnement" ("organizationId", "createdAt" DESC);

-- LIGNE_VENTE - Lignes de détail des ventes
CREATE INDEX IF NOT EXISTS "IDX_ligne_vente_venteId" ON "ligne_vente" ("venteId");
CREATE INDEX IF NOT EXISTS "IDX_ligne_vente_articleId" ON "ligne_vente" ("articleId");

-- LIGNE_COMMANDE - Lignes de détail des commandes
CREATE INDEX IF NOT EXISTS "IDX_ligne_commande_commandeId" ON "ligne_commande" ("commandeId");
CREATE INDEX IF NOT EXISTS "IDX_ligne_commande_articleId" ON "ligne_commande" ("articleId");

-- LIGNE_APPROVISIONNEMENT - Lignes de détail des approvisionnements
CREATE INDEX IF NOT EXISTS "IDX_ligne_appro_approId" ON "ligne_approvisionnement" ("approvisionnementId");
CREATE INDEX IF NOT EXISTS "IDX_ligne_appro_articleId" ON "ligne_approvisionnement" ("articleId");

-- CLIENT - Table des clients
CREATE INDEX IF NOT EXISTS "IDX_client_organizationId" ON "client" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_client_nom" ON "client" ("nom");
CREATE INDEX IF NOT EXISTS "IDX_client_telephone" ON "client" ("telephone");
CREATE INDEX IF NOT EXISTS "IDX_client_createdAt" ON "client" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_client_org_nom" ON "client" ("organizationId", "nom");

-- FOURNISSEUR - Table des fournisseurs
CREATE INDEX IF NOT EXISTS "IDX_fournisseur_organizationId" ON "fournisseur" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_fournisseur_nom" ON "fournisseur" ("nom");
CREATE INDEX IF NOT EXISTS "IDX_fournisseur_telephone" ON "fournisseur" ("telephone");
CREATE INDEX IF NOT EXISTS "IDX_fournisseur_createdAt" ON "fournisseur" ("createdAt");

-- CATEGORIE - Table des catégories
CREATE INDEX IF NOT EXISTS "IDX_categorie_organizationId" ON "categorie" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_categorie_code" ON "categorie" ("code");

-- ZONES - Table des zones
CREATE INDEX IF NOT EXISTS "IDX_zones_organizationId" ON "zones" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_zones_nom" ON "zones" ("nom");

-- VERSEMENT_CLIENT - Versements des clients
CREATE INDEX IF NOT EXISTS "IDX_versement_client_organizationId" ON "versement_client" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_versement_client_clientId" ON "versement_client" ("clientId");
CREATE INDEX IF NOT EXISTS "IDX_versement_client_venteId" ON "versement_client" ("venteId");
CREATE INDEX IF NOT EXISTS "IDX_versement_client_userId" ON "versement_client" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_versement_client_date" ON "versement_client" ("date");
CREATE INDEX IF NOT EXISTS "IDX_versement_client_createdAt" ON "versement_client" ("createdAt");

-- VERSEMENT - Versements aux fournisseurs
CREATE INDEX IF NOT EXISTS "IDX_versement_organizationId" ON "versement" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_versement_fournisseurId" ON "versement" ("fournisseurId");
CREATE INDEX IF NOT EXISTS "IDX_versement_date" ON "versement" ("date");
CREATE INDEX IF NOT EXISTS "IDX_versement_statut" ON "versement" ("statut");
CREATE INDEX IF NOT EXISTS "IDX_versement_createdAt" ON "versement" ("createdAt");

-- MOUVEMENT_STOCK - Historique des mouvements
CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_organizationId" ON "mouvement_stock" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_articleId" ON "mouvement_stock" ("articleId");
CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_type" ON "mouvement_stock" ("type");
CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_createdAt" ON "mouvement_stock" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_org_created" ON "mouvement_stock" ("organizationId", "createdAt" DESC);

-- USER - Table des utilisateurs
CREATE INDEX IF NOT EXISTS "IDX_user_organizationId" ON "user" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_user_roleId" ON "user" ("roleId");

-- ORGANIZATION - Table des organisations
CREATE INDEX IF NOT EXISTS "IDX_organization_planId" ON "organization" ("planId");
CREATE INDEX IF NOT EXISTS "IDX_organization_createdAt" ON "organization" ("createdAt");

-- TRANSACTION - Table des transactions/paiements
CREATE INDEX IF NOT EXISTS "IDX_transaction_organizationId" ON "transaction" ("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_transaction_createdAt" ON "transaction" ("createdAt");

-- Afficher le nombre d'index créés
SELECT 'Performance indexes created successfully!' AS status;
