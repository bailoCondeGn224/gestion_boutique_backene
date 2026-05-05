import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1777971287912 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ============================================================
        // ARTICLE - Table des articles/produits
        // ============================================================
        // organizationId - filtrage multi-tenant (CRITIQUE)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_article_organizationId" ON "article" ("organizationId")`);

        // categorieId - jointure avec categories
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_article_categorieId" ON "article" ("categorieId")`);

        // createdAt - tri chronologique
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_article_createdAt" ON "article" ("createdAt")`);

        // nom - recherche par nom
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_article_nom" ON "article" ("nom")`);

        // zone - filtrage par zone de stockage
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_article_zone" ON "article" ("zone")`);

        // Composite: organizationId + createdAt (requêtes paginées filtrées)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_article_org_created" ON "article" ("organizationId", "createdAt" DESC)`);

        // ============================================================
        // VENTE - Table des ventes
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_organizationId" ON "vente" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_clientId" ON "vente" ("clientId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_numero" ON "vente" ("numero")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_date" ON "vente" ("date")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_createdAt" ON "vente" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_modePaiement" ON "vente" ("modePaiement")`);

        // Composite: organizationId + date (requêtes paginées par date)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_org_date" ON "vente" ("organizationId", "date" DESC)`);

        // Composite: organizationId + createdAt
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vente_org_created" ON "vente" ("organizationId", "createdAt" DESC)`);

        // ============================================================
        // COMMANDE - Table des commandes clients
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_organizationId" ON "commande" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_clientId" ON "commande" ("clientId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_venteId" ON "commande" ("venteId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_userId" ON "commande" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_dateLivraison" ON "commande" ("dateLivraison")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_createdAt" ON "commande" ("createdAt")`);

        // Composite: organizationId + statut (filtrage par statut)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_org_statut" ON "commande" ("organizationId", "statut")`);

        // Composite: organizationId + dateLivraison (livraisons à venir)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commande_org_dateLiv" ON "commande" ("organizationId", "dateLivraison")`);

        // ============================================================
        // APPROVISIONNEMENT - Table des approvisionnements
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_organizationId" ON "approvisionnement" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_fournisseurId" ON "approvisionnement" ("fournisseurId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_numero" ON "approvisionnement" ("numero")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_date" ON "approvisionnement" ("date")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_createdAt" ON "approvisionnement" ("createdAt")`);

        // Composite: organizationId + date
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approvisionnement_org_date" ON "approvisionnement" ("organizationId", "date" DESC)`);

        // ============================================================
        // LIGNE_VENTE - Lignes de détail des ventes
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ligne_vente_venteId" ON "ligne_vente" ("venteId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ligne_vente_articleId" ON "ligne_vente" ("articleId")`);

        // ============================================================
        // LIGNE_COMMANDE - Lignes de détail des commandes
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ligne_commande_commandeId" ON "ligne_commande" ("commandeId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ligne_commande_articleId" ON "ligne_commande" ("articleId")`);

        // ============================================================
        // LIGNE_APPROVISIONNEMENT - Lignes de détail des approvisionnements
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ligne_appro_approId" ON "ligne_approvisionnement" ("approvisionnementId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ligne_appro_articleId" ON "ligne_approvisionnement" ("articleId")`);

        // ============================================================
        // CLIENT - Table des clients
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_organizationId" ON "client" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_nom" ON "client" ("nom")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_telephone" ON "client" ("telephone")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_createdAt" ON "client" ("createdAt")`);

        // Composite: organizationId + nom (recherche clients)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_org_nom" ON "client" ("organizationId", "nom")`);

        // ============================================================
        // FOURNISSEUR - Table des fournisseurs
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fournisseur_organizationId" ON "fournisseur" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fournisseur_nom" ON "fournisseur" ("nom")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fournisseur_telephone" ON "fournisseur" ("telephone")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fournisseur_createdAt" ON "fournisseur" ("createdAt")`);

        // ============================================================
        // CATEGORIE - Table des catégories
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_categorie_organizationId" ON "categorie" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_categorie_code" ON "categorie" ("code")`);

        // ============================================================
        // ZONE - Table des zones
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_zone_organizationId" ON "zone" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_zone_nom" ON "zone" ("nom")`);

        // ============================================================
        // VERSEMENT_CLIENT - Versements des clients
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_versement_client_venteId" ON "versement_client" ("venteId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_versement_client_commandeId" ON "versement_client" ("commandeId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_versement_client_createdAt" ON "versement_client" ("createdAt")`);

        // ============================================================
        // VERSEMENT - Versements aux fournisseurs
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_versement_approId" ON "versement" ("approvisionnementId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_versement_createdAt" ON "versement" ("createdAt")`);

        // ============================================================
        // MOUVEMENT_STOCK - Historique des mouvements
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_organizationId" ON "mouvement_stock" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_articleId" ON "mouvement_stock" ("articleId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_type" ON "mouvement_stock" ("type")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_createdAt" ON "mouvement_stock" ("createdAt")`);

        // Composite: organizationId + createdAt (historique paginé)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mouvement_stock_org_created" ON "mouvement_stock" ("organizationId", "createdAt" DESC)`);

        // ============================================================
        // USER - Table des utilisateurs
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_organizationId" ON "user" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_roleId" ON "user" ("roleId")`);

        // ============================================================
        // RETOUR_CLIENT - Retours de clients
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_client_organizationId" ON "retour_client" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_client_venteId" ON "retour_client" ("venteId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_client_articleId" ON "retour_client" ("articleId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_client_createdAt" ON "retour_client" ("createdAt")`);

        // ============================================================
        // RETOUR_FOURNISSEUR - Retours aux fournisseurs
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_fournisseur_organizationId" ON "retour_fournisseur" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_fournisseur_approId" ON "retour_fournisseur" ("approvisionnementId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_fournisseur_articleId" ON "retour_fournisseur" ("articleId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retour_fournisseur_createdAt" ON "retour_fournisseur" ("createdAt")`);

        console.log('✅ Performance indexes created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Supprimer tous les index en ordre inverse
        // RETOUR_FOURNISSEUR
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_fournisseur_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_fournisseur_articleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_fournisseur_approId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_fournisseur_organizationId"`);

        // RETOUR_CLIENT
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_client_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_client_articleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_client_venteId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_retour_client_organizationId"`);

        // USER
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_roleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_organizationId"`);

        // MOUVEMENT_STOCK
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mouvement_stock_org_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mouvement_stock_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mouvement_stock_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mouvement_stock_articleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mouvement_stock_organizationId"`);

        // VERSEMENT
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_versement_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_versement_approId"`);

        // VERSEMENT_CLIENT
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_versement_client_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_versement_client_commandeId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_versement_client_venteId"`);

        // ZONE
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_zone_nom"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_zone_organizationId"`);

        // CATEGORIE
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categorie_code"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categorie_organizationId"`);

        // FOURNISSEUR
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fournisseur_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fournisseur_telephone"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fournisseur_nom"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fournisseur_organizationId"`);

        // CLIENT
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_org_nom"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_telephone"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_nom"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_organizationId"`);

        // LIGNE_APPROVISIONNEMENT
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ligne_appro_articleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ligne_appro_approId"`);

        // LIGNE_COMMANDE
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ligne_commande_articleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ligne_commande_commandeId"`);

        // LIGNE_VENTE
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ligne_vente_articleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ligne_vente_venteId"`);

        // APPROVISIONNEMENT
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approvisionnement_org_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approvisionnement_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approvisionnement_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approvisionnement_numero"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approvisionnement_fournisseurId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approvisionnement_organizationId"`);

        // COMMANDE
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_org_dateLiv"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_org_statut"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_dateLivraison"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_userId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_venteId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_clientId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commande_organizationId"`);

        // VENTE
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_org_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_org_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_modePaiement"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_numero"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_clientId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vente_organizationId"`);

        // ARTICLE
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_org_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_zone"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_nom"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_categorieId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_organizationId"`);

        console.log('✅ Performance indexes dropped successfully');
    }

}
