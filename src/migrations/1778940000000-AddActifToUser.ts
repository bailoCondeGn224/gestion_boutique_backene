import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActifToUser1778940000000 implements MigrationInterface {
  name = 'AddActifToUser1778940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la colonne existe déjà
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'actif'
    `);

    if (columnExists.length === 0) {
      // Ajouter la colonne actif avec valeur par défaut true
      await queryRunner.query(`
        ALTER TABLE "user"
        ADD COLUMN "actif" boolean NOT NULL DEFAULT true
      `);

      console.log('Colonne "actif" ajoutée à la table "user"');
    } else {
      console.log('La colonne "actif" existe déjà');
    }

    // Mettre à jour tous les utilisateurs existants pour qu'ils soient actifs
    await queryRunner.query(`
      UPDATE "user"
      SET "actif" = true
      WHERE "actif" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "actif"
    `);
  }
}
