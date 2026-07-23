import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCommandesLivreesMontants1752500000000
  implements MigrationInterface
{
  name = 'FixCommandesLivreesMontants1752500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pour les commandes livrées, mettre à jour acompte et montantRestant
    // en se basant sur la vente associée
    await queryRunner.query(`
      UPDATE commande c
      SET
        acompte = COALESCE(v."montantPaye", c.acompte),
        "montantRestant" = COALESCE(v."montantRestant", c."montantRestant")
      FROM vente v
      WHERE c."venteId"::uuid = v.id
        AND c.statut = 'livree'
        AND c."venteId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Pas de rollback possible car on ne connaît pas les anciennes valeurs
    console.log('No rollback for FixCommandesLivreesMontants');
  }
}
