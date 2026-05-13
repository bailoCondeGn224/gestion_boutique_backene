import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDepensesTable1778500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer l'enum pour les types de dépenses
    await queryRunner.query(`
      CREATE TYPE "type_depense_enum" AS ENUM (
        'LOYER',
        'TRANSPORT',
        'SALAIRES',
        'ELECTRICITE',
        'EAU',
        'INTERNET',
        'TELEPHONE',
        'FOURNITURES',
        'MAINTENANCE',
        'ASSURANCE',
        'TAXES',
        'MARKETING',
        'EMBALLAGE',
        'AUTRE'
      )
    `);

    // Créer l'enum pour les catégories de dépenses
    await queryRunner.query(`
      CREATE TYPE "categorie_depense_enum" AS ENUM (
        'FIXE',
        'VARIABLE',
        'EXCEPTIONNELLE'
      )
    `);

    // Créer la table depense
    await queryRunner.createTable(
      new Table({
        name: 'depense',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
            comment: 'Multi-tenant: ID de l\'organisation',
          },
          {
            name: 'type',
            type: 'type_depense_enum',
            isNullable: false,
            comment: 'Type de dépense (loyer, transport, etc.)',
          },
          {
            name: 'categorie',
            type: 'categorie_depense_enum',
            isNullable: false,
            comment: 'Catégorie de dépense (fixe, variable, exceptionnelle)',
          },
          {
            name: 'montant',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
            comment: 'Montant de la dépense en GNF',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Description détaillée de la dépense',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
            comment: 'Date de la dépense (utilisée pour calculer la période)',
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: 'Référence ou numéro de facture',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
            comment: 'Utilisateur qui a enregistré la dépense',
          },
          {
            name: 'userNom',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: 'Nom de l\'utilisateur (dénormalisé pour historique)',
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

    // Index sur organizationId (pour queries multi-tenant)
    await queryRunner.createIndex(
      'depense',
      new TableIndex({
        name: 'IDX_DEPENSE_ORGANIZATION',
        columnNames: ['organizationId'],
      }),
    );

    // Index sur date (pour queries par période)
    await queryRunner.createIndex(
      'depense',
      new TableIndex({
        name: 'IDX_DEPENSE_DATE',
        columnNames: ['date'],
      }),
    );

    // Index composé organization + date (optimise les queries fréquentes)
    await queryRunner.createIndex(
      'depense',
      new TableIndex({
        name: 'IDX_DEPENSE_ORG_DATE',
        columnNames: ['organizationId', 'date'],
      }),
    );

    // Index sur type (pour statistiques par type)
    await queryRunner.createIndex(
      'depense',
      new TableIndex({
        name: 'IDX_DEPENSE_TYPE',
        columnNames: ['type'],
      }),
    );

    // Foreign key vers organization
    await queryRunner.createForeignKey(
      'depense',
      new TableForeignKey({
        name: 'FK_DEPENSE_ORGANIZATION',
        columnNames: ['organizationId'],
        referencedTableName: 'organization',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key vers user (optionnelle)
    await queryRunner.createForeignKey(
      'depense',
      new TableForeignKey({
        name: 'FK_DEPENSE_USER',
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les foreign keys
    await queryRunner.dropForeignKey('depense', 'FK_DEPENSE_USER');
    await queryRunner.dropForeignKey('depense', 'FK_DEPENSE_ORGANIZATION');

    // Supprimer les indexes
    await queryRunner.dropIndex('depense', 'IDX_DEPENSE_TYPE');
    await queryRunner.dropIndex('depense', 'IDX_DEPENSE_ORG_DATE');
    await queryRunner.dropIndex('depense', 'IDX_DEPENSE_DATE');
    await queryRunner.dropIndex('depense', 'IDX_DEPENSE_ORGANIZATION');

    // Supprimer la table
    await queryRunner.dropTable('depense');

    // Supprimer les enums
    await queryRunner.query(`DROP TYPE "categorie_depense_enum"`);
    await queryRunner.query(`DROP TYPE "type_depense_enum"`);
  }
}
