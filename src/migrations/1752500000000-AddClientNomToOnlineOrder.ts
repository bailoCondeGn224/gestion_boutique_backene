import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientNomToOnlineOrder1752500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter le champ clientNom pour stocker le nom du client (commandes publiques)
    await queryRunner.query(`
      ALTER TABLE "online_order"
      ADD COLUMN IF NOT EXISTS "clientNom" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "online_order"
      DROP COLUMN IF EXISTS "clientNom"
    `);
  }
}
