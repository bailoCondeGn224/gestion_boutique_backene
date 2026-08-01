import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGpsToOnlineOrder1752400000000 implements MigrationInterface {
  name = 'AddGpsToOnlineOrder1752400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add GPS coordinates columns for delivery location
    await queryRunner.query(`
      ALTER TABLE "online_order"
      ADD COLUMN IF NOT EXISTS "latitudeLivraison" decimal(10, 7) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "online_order"
      ADD COLUMN IF NOT EXISTS "longitudeLivraison" decimal(10, 7) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "online_order"
      DROP COLUMN IF EXISTS "longitudeLivraison"
    `);

    await queryRunner.query(`
      ALTER TABLE "online_order"
      DROP COLUMN IF EXISTS "latitudeLivraison"
    `);
  }
}
