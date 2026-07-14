import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModeVenteTable1752000000000 implements MigrationInterface {
  name = 'CreateModeVenteTable1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Créer la table mode_vente
    await queryRunner.query(`
      CREATE TABLE "mode_vente" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "articleId" uuid NOT NULL,
        "nom" character varying NOT NULL,
        "quantiteStock" numeric(15,4) NOT NULL DEFAULT '1',
        "prixVente" numeric(15,2) NOT NULL,
        "codeBarre" character varying,
        "parDefaut" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mode_vente" PRIMARY KEY ("id")
      )
    `);

    // 2. Ajouter les index
    await queryRunner.query(`
      CREATE INDEX "IDX_mode_vente_organization" ON "mode_vente" ("organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_mode_vente_article_org" ON "mode_vente" ("articleId", "organizationId")
    `);

    // 3. Ajouter les clés étrangères
    await queryRunner.query(`
      ALTER TABLE "mode_vente"
      ADD CONSTRAINT "FK_mode_vente_article"
      FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "mode_vente"
      ADD CONSTRAINT "FK_mode_vente_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE
    `);

    // 4. Ajouter le champ uniteStock à la table article
    await queryRunner.query(`
      ALTER TABLE "article"
      ADD COLUMN IF NOT EXISTS "uniteStock" character varying NOT NULL DEFAULT 'Unité'
    `);

    // 5. Ajouter les champs à ligne_vente
    await queryRunner.query(`
      ALTER TABLE "ligne_vente"
      ADD COLUMN IF NOT EXISTS "modeVenteId" uuid,
      ADD COLUMN IF NOT EXISTS "quantiteBase" integer
    `);

    // 6. Ajouter la clé étrangère pour modeVenteId
    await queryRunner.query(`
      ALTER TABLE "ligne_vente"
      ADD CONSTRAINT "FK_ligne_vente_mode_vente"
      FOREIGN KEY ("modeVenteId") REFERENCES "mode_vente"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Supprimer la contrainte FK sur ligne_vente
    await queryRunner.query(`
      ALTER TABLE "ligne_vente" DROP CONSTRAINT IF EXISTS "FK_ligne_vente_mode_vente"
    `);

    // 2. Supprimer les colonnes de ligne_vente
    await queryRunner.query(`
      ALTER TABLE "ligne_vente"
      DROP COLUMN IF EXISTS "modeVenteId",
      DROP COLUMN IF EXISTS "quantiteBase"
    `);

    // 3. Supprimer le champ uniteStock de article
    await queryRunner.query(`
      ALTER TABLE "article" DROP COLUMN IF EXISTS "uniteStock"
    `);

    // 4. Supprimer la table mode_vente
    await queryRunner.query(`DROP TABLE IF EXISTS "mode_vente"`);
  }
}
