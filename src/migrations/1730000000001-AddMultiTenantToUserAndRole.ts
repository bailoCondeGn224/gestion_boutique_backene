import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddMultiTenantToUserAndRole1730000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter organizationId à la table role (nullable pour roles système)
    await queryRunner.addColumn(
      'role',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Ajouter la foreign key vers organization
    await queryRunner.createForeignKey(
      'role',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Ajouter organizationId à la table user (nullable pour SUPER_ADMIN)
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Ajouter la foreign key vers organization
    await queryRunner.createForeignKey(
      'user',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Ajouter le flag isSuperAdmin à user
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'isSuperAdmin',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer isSuperAdmin
    await queryRunner.dropColumn('user', 'isSuperAdmin');

    // Supprimer les foreign keys
    const userTable = await queryRunner.getTable('user');
    const userForeignKey = userTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('organizationId') !== -1,
    );
    if (userForeignKey) {
      await queryRunner.dropForeignKey('user', userForeignKey);
    }

    const roleTable = await queryRunner.getTable('role');
    const roleForeignKey = roleTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('organizationId') !== -1,
    );
    if (roleForeignKey) {
      await queryRunner.dropForeignKey('role', roleForeignKey);
    }

    // Supprimer les colonnes organizationId
    await queryRunner.dropColumn('user', 'organizationId');
    await queryRunner.dropColumn('role', 'organizationId');
  }
}
