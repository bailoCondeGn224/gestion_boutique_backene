import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Suppression du code des catégories.
 * Le nom reste unique par boutique, il suffit à identifier une catégorie.
 * Les valeurs déjà saisies sont perdues, la migration inverse ne recrée qu'une colonne vide.
 */
export class DropCodeFromCategorie1780000000005 implements MigrationInterface {
  name = 'DropCodeFromCategorie1780000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categorie_code"`);
    await queryRunner.query(`
      ALTER TABLE "categorie"
      DROP COLUMN IF EXISTS "code"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categorie"
      ADD COLUMN IF NOT EXISTS "code" character varying NOT NULL DEFAULT ''
    `);
  }
}
