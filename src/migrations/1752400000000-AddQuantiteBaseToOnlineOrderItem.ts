import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuantiteBaseToOnlineOrderItem1752400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne quantiteBase si elle n'existe pas
    await queryRunner.query(`
      ALTER TABLE online_order_item
      ADD COLUMN IF NOT EXISTS "quantiteBase" int
    `);

    // Mettre à jour les anciennes données: quantiteBase = quantite pour les items sans mode de vente
    await queryRunner.query(`
      UPDATE online_order_item
      SET "quantiteBase" = quantite
      WHERE "quantiteBase" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE online_order_item
      DROP COLUMN IF EXISTS "quantiteBase"
    `);
  }
}
