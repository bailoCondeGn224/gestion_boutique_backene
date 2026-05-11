
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateInventaireTables1778266825923 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Table INVENTAIRE
        await queryRunner.createTable(
            new Table({
                name: 'inventaire',
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
                        name: 'date',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        comment: 'Date de l\'inventaire',
                    },
                    {
                        name: 'statut',
                        type: 'varchar',
                        length: '20',
                        default: "'EN_COURS'",
                        comment: 'EN_COURS ou TERMINE',
                    },
                    {
                        name: 'note',
                        type: 'text',
                        isNullable: true,
                        comment: 'Note descriptive (ex: Inventaire mensuel mai)',
                    },
                    {
                        name: 'totalArticles',
                        type: 'int',
                        default: 0,
                        comment: 'Nombre total d\'articles à compter',
                    },
                    {
                        name: 'articlesComptes',
                        type: 'int',
                        default: 0,
                        comment: 'Nombre d\'articles déjà comptés',
                    },
                    {
                        name: 'articlesAvecEcarts',
                        type: 'int',
                        default: 0,
                        comment: 'Nombre d\'articles avec des écarts',
                    },
                    {
                        name: 'responsableId',
                        type: 'uuid',
                        isNullable: true,
                        comment: 'Utilisateur qui a créé l\'inventaire',
                    },
                    {
                        name: 'responsableNom',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                        comment: 'Nom du responsable (dénormalisé)',
                    },
                    {
                        name: 'termineLe',
                        type: 'timestamp',
                        isNullable: true,
                        comment: 'Date de validation de l\'inventaire',
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

        // Table COMPTAGE_INVENTAIRE
        await queryRunner.createTable(
            new Table({
                name: 'comptage_inventaire',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'inventaireId',
                        type: 'uuid',
                        isNullable: false,
                        comment: 'Référence à l\'inventaire',
                    },
                    {
                        name: 'articleId',
                        type: 'uuid',
                        isNullable: false,
                        comment: 'Référence à l\'article compté',
                    },
                    {
                        name: 'articleNom',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                        comment: 'Nom de l\'article (dénormalisé pour perf)',
                    },
                    {
                        name: 'quantiteSysteme',
                        type: 'int',
                        isNullable: false,
                        comment: 'Stock dans le système avant comptage',
                    },
                    {
                        name: 'quantiteComptee',
                        type: 'int',
                        isNullable: false,
                        comment: 'Quantité réellement comptée',
                    },
                    {
                        name: 'ecart',
                        type: 'int',
                        isNullable: false,
                        comment: 'Différence (comptee - systeme)',
                    },
                    {
                        name: 'note',
                        type: 'text',
                        isNullable: true,
                        comment: 'Note sur le comptage (ex: 2 articles abîmés)',
                    },
                    {
                        name: 'comptePar',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                        comment: 'Nom de la personne qui a compté',
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Foreign Keys
        await queryRunner.createForeignKey(
            'inventaire',
            new TableForeignKey({
                name: 'FK_inventaire_organization',
                columnNames: ['organizationId'],
                referencedTableName: 'organization',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'inventaire',
            new TableForeignKey({
                name: 'FK_inventaire_responsable',
                columnNames: ['responsableId'],
                referencedTableName: 'user',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'comptage_inventaire',
            new TableForeignKey({
                name: 'FK_comptage_inventaire',
                columnNames: ['inventaireId'],
                referencedTableName: 'inventaire',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'comptage_inventaire',
            new TableForeignKey({
                name: 'FK_comptage_article',
                columnNames: ['articleId'],
                referencedTableName: 'article',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        // Indexes CRITIQUES pour Multi-Tenant et Performance
        // Index composite pour recherche multi-tenant par date
        await queryRunner.createIndex(
            'inventaire',
            new TableIndex({
                name: 'IDX_inventaire_organization_date',
                columnNames: ['organizationId', 'date'],
            }),
        );

        // Index pour filtrer par statut (EN_COURS/TERMINE)
        await queryRunner.createIndex(
            'inventaire',
            new TableIndex({
                name: 'IDX_inventaire_statut',
                columnNames: ['statut'],
            }),
        );

        // Index composite pour recherche rapide des comptages
        await queryRunner.createIndex(
            'comptage_inventaire',
            new TableIndex({
                name: 'IDX_comptage_inventaire_article',
                columnNames: ['inventaireId', 'articleId'],
            }),
        );

        // Index pour filtrer les écarts (WHERE ecart != 0)
        await queryRunner.createIndex(
            'comptage_inventaire',
            new TableIndex({
                name: 'IDX_comptage_ecart',
                columnNames: ['ecart'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Supprimer les indexes
        await queryRunner.dropIndex('comptage_inventaire', 'IDX_comptage_ecart');
        await queryRunner.dropIndex('comptage_inventaire', 'IDX_comptage_inventaire_article');
        await queryRunner.dropIndex('inventaire', 'IDX_inventaire_statut');
        await queryRunner.dropIndex('inventaire', 'IDX_inventaire_organization_date');

        // Supprimer les foreign keys
        await queryRunner.dropForeignKey('comptage_inventaire', 'FK_comptage_article');
        await queryRunner.dropForeignKey('comptage_inventaire', 'FK_comptage_inventaire');
        await queryRunner.dropForeignKey('inventaire', 'FK_inventaire_responsable');
        await queryRunner.dropForeignKey('inventaire', 'FK_inventaire_organization');

        // Supprimer les tables
        await queryRunner.dropTable('comptage_inventaire');
        await queryRunner.dropTable('inventaire');
    }

}
