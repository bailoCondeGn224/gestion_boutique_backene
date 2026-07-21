import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotification1753000000003 implements MigrationInterface {
  name = 'CreateNotification1753000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer les enums
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM ('NOUVELLE_COMMANDE', 'COMMANDE_CONFIRMEE', 'COMMANDE_PRETE', 'COMMANDE_LIVREE', 'COMMANDE_ANNULEE')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_recipient_type_enum" AS ENUM ('BOUTIQUE', 'CLIENT')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'notification',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'notification_type_enum',
          },
          {
            name: 'recipientType',
            type: 'notification_recipient_type_enum',
          },
          {
            name: 'recipientId',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notification',
      new TableIndex({
        name: 'IDX_notification_recipientType_recipientId',
        columnNames: ['recipientType', 'recipientId'],
      }),
    );

    await queryRunner.createIndex(
      'notification',
      new TableIndex({
        name: 'IDX_notification_organizationId',
        columnNames: ['organizationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('notification', 'IDX_notification_organizationId');
    await queryRunner.dropIndex('notification', 'IDX_notification_recipientType_recipientId');
    await queryRunner.dropTable('notification');
    await queryRunner.query(`DROP TYPE "notification_recipient_type_enum"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
