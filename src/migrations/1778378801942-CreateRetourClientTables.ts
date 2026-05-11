import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateRetourClientTables1778378801942 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Table RETOUR_CLIENT
        await queryRunner.createTable(
            new Table({
                name: 'retour_client',
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
                        name: 'numero',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        comment: 'Numéro unique du retour (RC-001, RC-002...)',
                    },
                    {
                        name: 'venteId',
                        type: 'uuid',
                        isNullable: false,
                        comment: 'Référence à la vente originale',
                    },
                    {
                        name: 'venteNumero',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        comment: 'Numéro de la vente (dénormalisé)',
                    },
                    {
                        name: 'clientId',
                        type: 'uuid',
                        isNullable: true,
                        comment: 'Référence au client',
                    },
                    {
                        name: 'clientNom',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                        comment: 'Nom du client (dénormalisé)',
                    },
                    {
                        name: 'total',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                        comment: 'Montant total du retour',
                    },
                    {
                        name: 'modeRemboursement',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        comment: 'Mode de remboursement: especes, mobile_money, virement, credit_compte',
                    },
                    {
                        name: 'montantRembourse',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                        comment: 'Montant remboursé au client',
                    },
                    {
                        name: 'date',
                        type: 'date',
                        isNullable: false,
                        comment: 'Date du retour',
                    },
                    {
                        name: 'note',
                        type: 'text',
                        isNullable: true,
                        comment: 'Note ou raison du retour',
                    },
                    {
                        name: 'userId',
                        type: 'uuid',
                        isNullable: true,
                        comment: 'Utilisateur qui a enregistré le retour',
                    },
                    {
                        name: 'userNom',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                        comment: 'Nom de l\'utilisateur (dénormalisé)',
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

        // Table LIGNE_RETOUR_CLIENT
        await queryRunner.createTable(
            new Table({
                name: 'ligne_retour_client',
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
                        name: 'retourClientId',
                        type: 'uuid',
                        isNullable: false,
                        comment: 'Référence au retour client',
                    },
                    {
                        name: 'articleId',
                        type: 'varchar',
                        isNullable: false,
                        comment: 'Référence à l\'article retourné',
                    },
                    {
                        name: 'nom',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                        comment: 'Nom de l\'article (dénormalisé)',
                    },
                    {
                        name: 'quantite',
                        type: 'int',
                        isNullable: false,
                        comment: 'Quantité retournée',
                    },
                    {
                        name: 'prixUnitaire',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                        comment: 'Prix unitaire de l\'article',
                    },
                    {
                        name: 'sousTotal',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                        comment: 'Sous-total (quantite * prixUnitaire)',
                    },
                    {
                        name: 'raison',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                        comment: 'Raison du retour',
                    },
                    {
                        name: 'noteArticle',
                        type: 'text',
                        isNullable: true,
                        comment: 'Note spécifique à cet article',
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
            'retour_client',
            new TableForeignKey({
                name: 'FK_retour_client_organization',
                columnNames: ['organizationId'],
                referencedTableName: 'organization',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'retour_client',
            new TableForeignKey({
                name: 'FK_retour_client_vente',
                columnNames: ['venteId'],
                referencedTableName: 'vente',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'retour_client',
            new TableForeignKey({
                name: 'FK_retour_client_client',
                columnNames: ['clientId'],
                referencedTableName: 'client',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'retour_client',
            new TableForeignKey({
                name: 'FK_retour_client_user',
                columnNames: ['userId'],
                referencedTableName: 'user',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'ligne_retour_client',
            new TableForeignKey({
                name: 'FK_ligne_retour_client_organization',
                columnNames: ['organizationId'],
                referencedTableName: 'organization',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'ligne_retour_client',
            new TableForeignKey({
                name: 'FK_ligne_retour_client_retour',
                columnNames: ['retourClientId'],
                referencedTableName: 'retour_client',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        // Note: Pas de FK vers article car articleId est dénormalisé pour historique
        // La relation est maintenue via le nom de l'article stocké

        // Indexes pour performance
        await queryRunner.createIndex(
            'retour_client',
            new TableIndex({
                name: 'IDX_retour_client_organization_date',
                columnNames: ['organizationId', 'date'],
            }),
        );

        await queryRunner.createIndex(
            'retour_client',
            new TableIndex({
                name: 'IDX_retour_client_vente',
                columnNames: ['venteId'],
            }),
        );

        await queryRunner.createIndex(
            'retour_client',
            new TableIndex({
                name: 'IDX_retour_client_numero',
                columnNames: ['numero', 'organizationId'],
                isUnique: true,
            }),
        );

        await queryRunner.createIndex(
            'ligne_retour_client',
            new TableIndex({
                name: 'IDX_ligne_retour_client_retour',
                columnNames: ['retourClientId'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('ligne_retour_client', 'IDX_ligne_retour_client_retour');
        await queryRunner.dropIndex('retour_client', 'IDX_retour_client_numero');
        await queryRunner.dropIndex('retour_client', 'IDX_retour_client_vente');
        await queryRunner.dropIndex('retour_client', 'IDX_retour_client_organization_date');

        // Drop foreign keys
        await queryRunner.dropForeignKey('ligne_retour_client', 'FK_ligne_retour_client_retour');
        await queryRunner.dropForeignKey('ligne_retour_client', 'FK_ligne_retour_client_organization');
        await queryRunner.dropForeignKey('retour_client', 'FK_retour_client_user');
        await queryRunner.dropForeignKey('retour_client', 'FK_retour_client_client');
        await queryRunner.dropForeignKey('retour_client', 'FK_retour_client_vente');
        await queryRunner.dropForeignKey('retour_client', 'FK_retour_client_organization');

        // Drop tables
        await queryRunner.dropTable('ligne_retour_client');
        await queryRunner.dropTable('retour_client');
    }

}
