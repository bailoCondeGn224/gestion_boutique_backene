import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatutToOrganization1778930000000 implements MigrationInterface {
  name = 'AddStatutToOrganization1778930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ajouter la colonne statut si elle n'existe pas
    const statutExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organization' AND column_name = 'statut'
    `);

    if (statutExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "organization"
        ADD COLUMN "statut" varchar(20) NOT NULL DEFAULT 'en_attente'
      `);

      // Mettre à jour les organisations existantes (actives) à "approuve"
      await queryRunner.query(`
        UPDATE "organization"
        SET "statut" = 'approuve'
        WHERE "actif" = true
      `);
    }

    // 2. Ajouter la colonne motifRejet si elle n'existe pas
    const motifRejetExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organization' AND column_name = 'motifRejet'
    `);

    if (motifRejetExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "organization"
        ADD COLUMN "motifRejet" text NULL
      `);
    }

    // 3. Modifier la valeur par défaut de actif à false
    await queryRunner.query(`
      ALTER TABLE "organization"
      ALTER COLUMN "actif" SET DEFAULT false
    `);

    // 4. Créer un index sur le statut
    const indexExists = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'organization' AND indexname = 'IDX_organization_statut'
    `);

    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_organization_statut"
        ON "organization" ("statut")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer l'index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_organization_statut"
    `);

    // Remettre la valeur par défaut de actif à true
    await queryRunner.query(`
      ALTER TABLE "organization"
      ALTER COLUMN "actif" SET DEFAULT true
    `);

    // Supprimer la colonne motifRejet
    await queryRunner.query(`
      ALTER TABLE "organization"
      DROP COLUMN IF EXISTS "motifRejet"
    `);

    // Supprimer la colonne statut
    await queryRunner.query(`
      ALTER TABLE "organization"
      DROP COLUMN IF EXISTS "statut"
    `);
  }
}
