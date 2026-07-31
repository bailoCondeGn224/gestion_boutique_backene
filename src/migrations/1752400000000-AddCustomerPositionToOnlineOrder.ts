import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerPositionToOnlineOrder1752400000000 implements MigrationInterface {
  name = 'AddCustomerPositionToOnlineOrder1752400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter les colonnes de position GPS du client
    await queryRunner.query(`
      ALTER TABLE "online_order"
      ADD COLUMN IF NOT EXISTS "customerLatitude" decimal(10,8),
      ADD COLUMN IF NOT EXISTS "customerLongitude" decimal(11,8),
      ADD COLUMN IF NOT EXISTS "customerLastPositionAt" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "online_order"
      DROP COLUMN IF EXISTS "customerLatitude",
      DROP COLUMN IF EXISTS "customerLongitude",
      DROP COLUMN IF EXISTS "customerLastPositionAt"
    `);
  }
}
