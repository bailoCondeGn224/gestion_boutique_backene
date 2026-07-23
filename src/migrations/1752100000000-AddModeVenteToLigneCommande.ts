import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeVenteToLigneCommande1752100000000
  implements MigrationInterface
{
  name = 'AddModeVenteToLigneCommande1752100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les colonnes existantes avec mauvais type (si elles existent)
    await queryRunner.query(`
      ALTER TABLE "ligne_commande" DROP CONSTRAINT IF EXISTS "FK_ligne_commande_mode_vente"
    `);
    await queryRunner.query(`
      ALTER TABLE "ligne_commande" DROP COLUMN IF EXISTS "modeVenteId"
    `);
    await queryRunner.query(`
      ALTER TABLE "ligne_commande" DROP COLUMN IF EXISTS "quantiteBase"
    `);

    // Ajouter les champs avec le bon type uuid
    await queryRunner.query(`
      ALTER TABLE "ligne_commande"
      ADD COLUMN "modeVenteId" uuid,
      ADD COLUMN "quantiteBase" integer
    `);

    // Ajouter la clé étrangère pour modeVenteId
    await queryRunner.query(`
      ALTER TABLE "ligne_commande"
      ADD CONSTRAINT "FK_ligne_commande_mode_vente"
      FOREIGN KEY ("modeVenteId") REFERENCES "mode_vente"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la contrainte FK
    await queryRunner.query(`
      ALTER TABLE "ligne_commande" DROP CONSTRAINT IF EXISTS "FK_ligne_commande_mode_vente"
    `);

    // Supprimer les colonnes
    await queryRunner.query(`
      ALTER TABLE "ligne_commande"
      DROP COLUMN IF EXISTS "modeVenteId",
      DROP COLUMN IF EXISTS "quantiteBase"
    `);
  }
}
