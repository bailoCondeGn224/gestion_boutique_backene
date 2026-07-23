import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixVentesClientInfo1752600000000 implements MigrationInterface {
  name = 'FixVentesClientInfo1752600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pour les ventes qui ont un clientId mais pas de nom,
    // récupérer les infos du client
    await queryRunner.query(`
      UPDATE vente v
      SET
        nom = c.nom,
        prenom = '',
        tel = COALESCE(c.telephone, '')
      FROM client c
      WHERE v."clientId"::uuid = c.id
        AND v."clientId" IS NOT NULL
        AND (v.nom IS NULL OR v.nom = '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Pas de rollback nécessaire
    console.log('No rollback for FixVentesClientInfo');
  }
}
