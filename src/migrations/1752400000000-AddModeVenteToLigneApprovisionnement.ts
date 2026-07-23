import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeVenteToLigneApprovisionnement1752400000000
  implements MigrationInterface
{
  name = 'AddModeVenteToLigneApprovisionnement1752400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter les colonnes pour le mode gros/détail
    await queryRunner.query(`
      ALTER TABLE "ligne_approvisionnement"
      ADD COLUMN IF NOT EXISTS "modeVenteId" uuid,
      ADD COLUMN IF NOT EXISTS "modeQuantiteStock" integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "quantiteUnites" integer
    `);

    // Pour les lignes existantes, quantiteUnites = quantite (mode détail par défaut)
    await queryRunner.query(`
      UPDATE "ligne_approvisionnement"
      SET "quantiteUnites" = quantite
      WHERE "quantiteUnites" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ligne_approvisionnement"
      DROP COLUMN IF EXISTS "modeVenteId",
      DROP COLUMN IF EXISTS "modeQuantiteStock",
      DROP COLUMN IF EXISTS "quantiteUnites"
    `);
  }
}
