import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDisponibleEnLigneTrue1752400000000 implements MigrationInterface {
  name = 'SetDisponibleEnLigneTrue1752400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mettre tous les articles existants comme disponibles en ligne
    await queryRunner.query(`
      UPDATE article
      SET "disponibleEnLigne" = true
      WHERE "disponibleEnLigne" = false OR "disponibleEnLigne" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remettre à false (état initial)
    await queryRunner.query(`
      UPDATE article
      SET "disponibleEnLigne" = false
    `);
  }
}
