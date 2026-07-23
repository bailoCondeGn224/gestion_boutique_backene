import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixVentesMontantPaye1752700000000 implements MigrationInterface {
  name = 'FixVentesMontantPaye1752700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Recalculer montantPaye pour chaque vente en ajoutant la somme des versements
    // montantPaye correct = total - montantRestant
    // Car montantRestant a été correctement mis à jour par les versements
    await queryRunner.query(`
      UPDATE vente
      SET "montantPaye" = total - "montantRestant"
      WHERE "montantRestant" >= 0
    `);

    console.log('Migration FixVentesMontantPaye: montantPaye recalculé pour toutes les ventes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Pas de rollback possible car on ne connaît pas les anciennes valeurs
    console.log('No rollback for FixVentesMontantPaye');
  }
}
