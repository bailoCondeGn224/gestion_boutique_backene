import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTauxPrecision1778600000000 implements MigrationInterface {
  name = 'FixTauxPrecision1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Augmenter la précision des colonnes de taux pour gérer des pourcentages extrêmes
    // Avant: decimal(5,2) max ±999.99
    // Après: decimal(8,2) max ±999,999.99

    await queryRunner.query(`
      ALTER TABLE "inventaire"
      ALTER COLUMN "tauxMarge" TYPE decimal(8,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "inventaire"
      ALTER COLUMN "tauxRentabilite" TYPE decimal(8,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restaurer l'ancienne précision
    await queryRunner.query(`
      ALTER TABLE "inventaire"
      ALTER COLUMN "tauxMarge" TYPE decimal(5,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "inventaire"
      ALTER COLUMN "tauxRentabilite" TYPE decimal(5,2)
    `);
  }
}
