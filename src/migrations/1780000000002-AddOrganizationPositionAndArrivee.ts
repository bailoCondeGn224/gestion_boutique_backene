import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deux ajouts liés au suivi de livraison:
 *
 * - Position GPS de l'organisation. Elle rejoint `adresse`, déjà portée par la
 *   même table: c'est le lieu physique du commerce, saisi à l'inscription et
 *   rarement modifié ensuite. Sans elle, impossible de tracer l'itinéraire
 *   boutique -> client ni de mesurer la course à parcourir.
 * - Horodatage d'arrivée du livreur à destination, qui sert aussi de garde:
 *   il empêche de renotifier le client à chaque relevé GPS.
 */
export class AddOrganizationPositionAndArrivee1780000000002
  implements MigrationInterface
{
  name = 'AddOrganizationPositionAndArrivee1780000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization"
      ADD COLUMN IF NOT EXISTS "latitude" decimal(10, 7) NULL,
      ADD COLUMN IF NOT EXISTS "longitude" decimal(10, 7) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "online_order"
      ADD COLUMN IF NOT EXISTS "arriveeLe" timestamp NULL
    `);

    // notification.type est un vrai enum PostgreSQL: la nouvelle valeur doit y
    // être déclarée avant que le code puisse l'écrire.
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'LIVREUR_ARRIVE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL ne sait pas retirer une valeur d'un enum: LIVREUR_ARRIVE reste
    // en place. Sans conséquence, plus rien ne l'écrit après ce rollback.
    await queryRunner.query(`
      ALTER TABLE "online_order"
      DROP COLUMN IF EXISTS "arriveeLe"
    `);

    await queryRunner.query(`
      ALTER TABLE "organization"
      DROP COLUMN IF EXISTS "latitude",
      DROP COLUMN IF EXISTS "longitude"
    `);
  }
}
