import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remet à zéro les dettes fournisseurs négatives.
 * Une dette négative signifie un fournisseur payé en trop : il n'a plus de dette.
 * Ces valeurs faussaient le total affiché sur la page Analytics.
 */
export class CorrigerDettesNegatives1780000000006 implements MigrationInterface {
  name = 'CorrigerDettesNegatives1780000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "fournisseur" SET dette = 0 WHERE dette < 0`);
  }

  public async down(): Promise<void> {
    // Les anciennes valeurs négatives ne sont pas rétablies : elles étaient fausses
  }
}
