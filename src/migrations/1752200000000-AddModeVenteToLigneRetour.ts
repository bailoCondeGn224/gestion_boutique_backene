import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeVenteToLigneRetour1752200000000
  implements MigrationInterface
{
  name = 'AddModeVenteToLigneRetour1752200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter les champs modeVenteId et quantiteBase à ligne_retour_client
    await queryRunner.query(`
      ALTER TABLE "ligne_retour_client"
      ADD COLUMN IF NOT EXISTS "modeVenteId" uuid,
      ADD COLUMN IF NOT EXISTS "quantiteBase" integer
    `);

    // Ajouter la clé étrangère pour modeVenteId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ligne_retour_client_mode_vente') THEN
          ALTER TABLE "ligne_retour_client"
          ADD CONSTRAINT "FK_ligne_retour_client_mode_vente"
          FOREIGN KEY ("modeVenteId") REFERENCES "mode_vente"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la contrainte FK
    await queryRunner.query(`
      ALTER TABLE "ligne_retour_client" DROP CONSTRAINT IF EXISTS "FK_ligne_retour_client_mode_vente"
    `);

    // Supprimer les colonnes
    await queryRunner.query(`
      ALTER TABLE "ligne_retour_client"
      DROP COLUMN IF EXISTS "modeVenteId",
      DROP COLUMN IF EXISTS "quantiteBase"
    `);
  }
}
