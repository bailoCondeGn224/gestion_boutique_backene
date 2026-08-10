import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrecisionLivraisonToOnlineOrder1780000000000
  implements MigrationInterface
{
  name = 'AddPrecisionLivraisonToOnlineOrder1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rayon d'incertitude en mètres du point de livraison, tel que renvoyé par
    // l'API de géolocalisation du navigateur (coords.accuracy).
    // Sans cette information, un point issu d'une triangulation Wi-Fi à 2 km
    // s'affiche exactement comme un point GPS à 5 m.
    await queryRunner.query(`
      ALTER TABLE "online_order"
      ADD COLUMN IF NOT EXISTS "precisionLivraison" decimal(10, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "online_order"
      DROP COLUMN IF EXISTS "precisionLivraison"
    `);
  }
}
