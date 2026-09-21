import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Note libre sur une vente (consigne de livraison, précision pour le client…).
 * Affichée dans le détail de la vente et imprimée sur la facture.
 */
export class AddNoteToVente1780000000003 implements MigrationInterface {
  name = 'AddNoteToVente1780000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vente"
      ADD COLUMN IF NOT EXISTS "note" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vente"
      DROP COLUMN IF EXISTS "note"
    `);
  }
}
