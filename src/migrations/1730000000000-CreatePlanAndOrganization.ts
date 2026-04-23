import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePlanAndOrganization1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer la table Plan
    await queryRunner.createTable(
      new Table({
        name: 'plan',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'nom',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'prixMensuel',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'limiteUtilisateurs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'limiteArticles',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'limiteClients',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'limiteVentes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'actif',
            type: 'boolean',
            default: true,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Créer la table Organization
    await queryRunner.createTable(
      new Table({
        name: 'organization',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nom',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'telephone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'logo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'actif',
            type: 'boolean',
            default: true,
          },
          {
            name: 'planId',
            type: 'uuid',
          },
          {
            name: 'abonnementDebut',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'abonnementExpire',
            type: 'timestamp',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Ajouter la foreign key vers Plan
    await queryRunner.createForeignKey(
      'organization',
      new TableForeignKey({
        columnNames: ['planId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'plan',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Insérer les plans par défaut
    await queryRunner.query(`
      INSERT INTO plan (id, code, nom, description, "prixMensuel", "limiteUtilisateurs", "limiteArticles", "limiteClients", "limiteVentes", actif)
      VALUES
        (uuid_generate_v4(), 'FREE', 'Gratuit', 'Plan gratuit avec limitations', 0, 2, 50, 100, 500, true),
        (uuid_generate_v4(), 'STARTER', 'Starter', 'Idéal pour démarrer', 9.99, 5, 500, 1000, 5000, true),
        (uuid_generate_v4(), 'PROFESSIONAL', 'Professionnel', 'Pour les PME', 29.99, 20, 5000, 10000, 50000, true),
        (uuid_generate_v4(), 'ENTERPRISE', 'Entreprise', 'Sans limites', 99.99, NULL, NULL, NULL, NULL, true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la foreign key
    const table = await queryRunner.getTable('organization');
    const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('planId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('organization', foreignKey);
    }

    // Supprimer les tables
    await queryRunner.dropTable('organization');
    await queryRunner.dropTable('plan');
  }
}
