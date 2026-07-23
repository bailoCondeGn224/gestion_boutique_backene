import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotification1753000000003 implements MigrationInterface {
  name = 'CreateNotification1753000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums if they don't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_type_enum" AS ENUM ('NOUVELLE_COMMANDE', 'COMMANDE_CONFIRMEE', 'COMMANDE_PRETE', 'COMMANDE_LIVREE', 'COMMANDE_ANNULEE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_recipient_type_enum" AS ENUM ('BOUTIQUE', 'CLIENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    const tableExists = await queryRunner.hasTable('notification');

    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "notification" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "type" "notification_type_enum" NOT NULL,
          "recipientType" "notification_recipient_type_enum" NOT NULL,
          "recipientId" uuid NOT NULL,
          "title" varchar(255) NOT NULL,
          "message" text NOT NULL,
          "data" jsonb,
          "isRead" boolean NOT NULL DEFAULT false,
          "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "organizationId" uuid,
          CONSTRAINT "PK_notification" PRIMARY KEY ("id")
        )
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_recipientType_recipientId" ON "notification" ("recipientType", "recipientId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_organizationId" ON "notification" ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_organizationId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_recipientType_recipientId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_recipient_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
  }
}
