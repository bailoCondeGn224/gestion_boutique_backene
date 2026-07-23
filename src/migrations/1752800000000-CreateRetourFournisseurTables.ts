import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRetourFournisseurTables1752800000000 implements MigrationInterface {
  name = 'CreateRetourFournisseurTables1752800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer la table retour_fournisseur
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "retour_fournisseur" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "numero" character varying NOT NULL,
        "approvisionnementId" uuid NOT NULL,
        "approvisionnementNumero" character varying NOT NULL,
        "fournisseurId" uuid,
        "fournisseurNom" character varying,
        "total" numeric(15,2) NOT NULL,
        "remboursementRecu" boolean NOT NULL DEFAULT false,
        "montantRembourse" numeric(15,2) NOT NULL DEFAULT 0,
        "date" date NOT NULL,
        "note" text,
        "userId" uuid,
        "userNom" character varying,
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_retour_fournisseur" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_retour_fournisseur_numero_org" UNIQUE ("numero", "organizationId")
      )
    `);

    // Créer la table ligne_retour_fournisseur
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ligne_retour_fournisseur" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "retourFournisseurId" uuid NOT NULL,
        "articleId" uuid NOT NULL,
        "nom" character varying NOT NULL,
        "quantite" integer NOT NULL,
        "quantiteBase" integer,
        "modeVenteId" uuid,
        "prixUnitaire" numeric(15,2) NOT NULL,
        "sousTotal" numeric(15,2) NOT NULL,
        "raison" character varying,
        "noteArticle" text,
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ligne_retour_fournisseur" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ligne_retour_fournisseur_retour" FOREIGN KEY ("retourFournisseurId")
          REFERENCES "retour_fournisseur"("id") ON DELETE CASCADE
      )
    `);

    // Créer les index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_retour_fournisseur_organizationId"
      ON "retour_fournisseur" ("organizationId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_retour_fournisseur_fournisseurId"
      ON "retour_fournisseur" ("fournisseurId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ligne_retour_fournisseur_retourId"
      ON "ligne_retour_fournisseur" ("retourFournisseurId")
    `);

    console.log('Tables retour_fournisseur et ligne_retour_fournisseur créées avec succès');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ligne_retour_fournisseur"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "retour_fournisseur"`);
    console.log('Tables retour_fournisseur et ligne_retour_fournisseur supprimées');
  }
}
