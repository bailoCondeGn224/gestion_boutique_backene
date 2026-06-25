import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateExistingOrganizationsStatus1778930000001
  implements MigrationInterface
{
  name = 'UpdateExistingOrganizationsStatus1778930000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mettre à jour toutes les organisations existantes qui n'ont pas de statut
    // ou qui ont un statut NULL pour les passer en "approuve"
    // et les activer (actif = true)
    await queryRunner.query(`
      UPDATE "organization"
      SET
        "statut" = 'approuve',
        "actif" = true
      WHERE "statut" IS NULL
         OR "statut" = ''
    `);

    // Log du nombre d'organisations mises à jour
    const result = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "organization"
      WHERE "statut" = 'approuve'
    `);

    console.log(`Migration: ${result[0]?.count || 0} organisations ont été mises à jour avec le statut "approuve"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cette migration ne peut pas être annulée de manière fiable
    // car on ne sait pas quelles organisations étaient sans statut avant
    console.log('Cette migration ne peut pas être annulée automatiquement.');
  }
}
