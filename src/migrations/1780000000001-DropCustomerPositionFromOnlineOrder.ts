import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Supprime les colonnes de position client restées mortes.
 *
 * Créées par AddCustomerPositionToOnlineOrder1752400000000, elles n'ont jamais
 * été déclarées dans l'entité OnlineOrder ni lues par le code (backend comme
 * frontend). La position de livraison effectivement utilisée est portée par
 * latitudeLivraison / longitudeLivraison / precisionLivraison.
 *
 * En développement, synchronize: true les avait déjà retirées; cette migration
 * fait le même travail sur les environnements où synchronize est désactivé.
 */
export class DropCustomerPositionFromOnlineOrder1780000000001
  implements MigrationInterface
{
  name = 'DropCustomerPositionFromOnlineOrder1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "online_order"
      DROP COLUMN IF EXISTS "customerLatitude",
      DROP COLUMN IF EXISTS "customerLongitude",
      DROP COLUMN IF EXISTS "customerLastPositionAt"
    `);
  }

  /**
   * Recrée les colonnes à l'identique. Leur contenu n'est pas restaurable,
   * mais elles étaient vides: aucune écriture n'a jamais visé ces colonnes.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "online_order"
      ADD COLUMN IF NOT EXISTS "customerLatitude" decimal(10,8),
      ADD COLUMN IF NOT EXISTS "customerLongitude" decimal(11,8),
      ADD COLUMN IF NOT EXISTS "customerLastPositionAt" timestamp
    `);
  }
}
