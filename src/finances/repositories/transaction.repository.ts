import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { Transaction, TypeTransaction, CategorieTransaction } from '../entities/transaction.entity';

@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(private dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  /**
   * Créer une transaction de remboursement pour retour client
   */
  async creerRemboursementRetourClient(
    data: {
      description: string;
      montant: number;
      venteId: string;
    },
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `INSERT INTO transaction
       (description, montant, type, categorie, date, "venteId", "organizationId")
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
      [
        data.description,
        data.montant,
        TypeTransaction.OUT,
        CategorieTransaction.RETOUR_CLIENT,
        data.venteId,
        organizationId,
      ],
    );
  }

  /**
   * Créer une transaction de remboursement pour retour fournisseur
   */
  async creerRemboursementRetourFournisseur(
    data: {
      description: string;
      montant: number;
      approvisionnementId: string;
    },
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `INSERT INTO transaction
       (description, montant, type, categorie, date, "approvisionnementId", "organizationId")
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
      [
        data.description,
        data.montant,
        TypeTransaction.IN,
        CategorieTransaction.RETOUR_FOURNISSEUR,
        data.approvisionnementId,
        organizationId,
      ],
    );
  }
}
