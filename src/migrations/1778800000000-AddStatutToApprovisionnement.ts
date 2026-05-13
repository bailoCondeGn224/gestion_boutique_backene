import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatutToApprovisionnement1778800000000 implements MigrationInterface {
  name = 'AddStatutToApprovisionnement1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier et ajouter la colonne statut si elle n'existe pas
    const statutExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'approvisionnement' AND column_name = 'statut'
    `);

    if (statutExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "approvisionnement"
        ADD COLUMN "statut" varchar(20) NOT NULL DEFAULT 'VALIDE'
      `);

      await queryRunner.query(`
        COMMENT ON COLUMN "approvisionnement"."statut"
        IS 'Statut de l''approvisionnement (VALIDE ou ANNULE)'
      `);
    }

    // Vérifier et ajouter la colonne annuleLe
    const annuleLeExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'approvisionnement' AND column_name = 'annuleLe'
    `);

    if (annuleLeExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "approvisionnement"
        ADD COLUMN "annuleLe" timestamp NULL
      `);

      await queryRunner.query(`
        COMMENT ON COLUMN "approvisionnement"."annuleLe"
        IS 'Date d''annulation si l''approvisionnement a été annulé'
      `);
    }

    // Vérifier et ajouter la colonne annulePar
    const annuleParExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'approvisionnement' AND column_name = 'annulePar'
    `);

    if (annuleParExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "approvisionnement"
        ADD COLUMN "annulePar" varchar(200) NULL
      `);

      await queryRunner.query(`
        COMMENT ON COLUMN "approvisionnement"."annulePar"
        IS 'Utilisateur qui a annulé l''approvisionnement'
      `);
    }

    // Vérifier et ajouter la colonne motifAnnulation
    const motifExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'approvisionnement' AND column_name = 'motifAnnulation'
    `);

    if (motifExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "approvisionnement"
        ADD COLUMN "motifAnnulation" text NULL
      `);

      await queryRunner.query(`
        COMMENT ON COLUMN "approvisionnement"."motifAnnulation"
        IS 'Raison de l''annulation'
      `);
    }

    // Vérifier et créer l'index
    const indexExists = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'approvisionnement' AND indexname = 'IDX_approvisionnement_statut'
    `);

    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_approvisionnement_statut"
        ON "approvisionnement" ("statut")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer l'index
    await queryRunner.query(`
      DROP INDEX "IDX_approvisionnement_statut"
    `);

    // Supprimer les colonnes
    await queryRunner.query(`
      ALTER TABLE "approvisionnement"
      DROP COLUMN "motifAnnulation"
    `);

    await queryRunner.query(`
      ALTER TABLE "approvisionnement"
      DROP COLUMN "annulePar"
    `);

    await queryRunner.query(`
      ALTER TABLE "approvisionnement"
      DROP COLUMN "annuleLe"
    `);

    await queryRunner.query(`
      ALTER TABLE "approvisionnement"
      DROP COLUMN "statut"
    `);
  }
}
