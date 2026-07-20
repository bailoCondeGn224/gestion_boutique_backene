import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateOnlineOrder1753000000002 implements MigrationInterface {
  name = 'CreateOnlineOrder1753000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer les enums
    await queryRunner.query(`
      CREATE TYPE "online_order_statut_enum" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'PRETE', 'LIVREE', 'ANNULEE')
    `);
    await queryRunner.query(`
      CREATE TYPE "online_order_mode_livraison_enum" AS ENUM ('LIVRAISON', 'RETRAIT_BOUTIQUE')
    `);

    // Table online_order
    await queryRunner.createTable(
      new Table({
        name: 'online_order',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'numero',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'customerAccountId',
            type: 'uuid',
          },
          {
            name: 'clientId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'statut',
            type: 'online_order_statut_enum',
            default: "'EN_ATTENTE'",
          },
          {
            name: 'modeLivraison',
            type: 'online_order_mode_livraison_enum',
          },
          {
            name: 'adresseLivraison',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'telephoneLivraison',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'fraisLivraison',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'sousTotal',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'motifAnnulation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confirmeePar',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'confirmeeLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'preteLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'livreeLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'annuleeLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'venteId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'online_order',
      new TableIndex({
        name: 'IDX_online_order_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'online_order',
      new TableIndex({
        name: 'IDX_online_order_statut',
        columnNames: ['statut'],
      }),
    );

    // Table online_order_item
    await queryRunner.createTable(
      new Table({
        name: 'online_order_item',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'onlineOrderId',
            type: 'uuid',
          },
          {
            name: 'articleId',
            type: 'uuid',
          },
          {
            name: 'articleNom',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'modeVenteId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'modeVenteNom',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'quantite',
            type: 'int',
          },
          {
            name: 'prixUnitaire',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'sousTotal',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'online_order_item',
      new TableIndex({
        name: 'IDX_online_order_item_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createForeignKey(
      'online_order_item',
      new TableForeignKey({
        columnNames: ['onlineOrderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'online_order',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const itemTable = await queryRunner.getTable('online_order_item');
    const foreignKey = itemTable?.foreignKeys.find(fk => fk.columnNames.indexOf('onlineOrderId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('online_order_item', foreignKey);
    }
    await queryRunner.dropIndex('online_order_item', 'IDX_online_order_item_organizationId');
    await queryRunner.dropTable('online_order_item');

    await queryRunner.dropIndex('online_order', 'IDX_online_order_statut');
    await queryRunner.dropIndex('online_order', 'IDX_online_order_organizationId');
    await queryRunner.dropTable('online_order');

    await queryRunner.query(`DROP TYPE "online_order_mode_livraison_enum"`);
    await queryRunner.query(`DROP TYPE "online_order_statut_enum"`);
  }
}
