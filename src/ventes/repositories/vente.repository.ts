import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { Vente, StatutVente } from '../entities/vente.entity';

@Injectable()
export class VenteRepository extends Repository<Vente> {
  constructor(private dataSource: DataSource) {
    super(Vente, dataSource.createEntityManager());
  }

  /**
   * Marquer une vente comme annulée (retour total)
   */
  async marquerCommeAnnulee(
    venteId: string,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `UPDATE vente
       SET statut = $1,
           total = 0,
           "montantPaye" = 0,
           "montantRestant" = 0
       WHERE id = $2 AND "organizationId" = $3`,
      [StatutVente.ANNULEE, venteId, organizationId],
    );
  }

  /**
   * Mettre à jour les montants de la vente (retour partiel)
   */
  async updateMontantsApresRetour(
    venteId: string,
    nouveauTotal: number,
    nouveauMontantPaye: number,
    nouveauMontantRestant: number,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `UPDATE vente
       SET total = $1,
           "montantPaye" = $2,
           "montantRestant" = $3
       WHERE id = $4 AND "organizationId" = $5`,
      [nouveauTotal, nouveauMontantPaye, nouveauMontantRestant, venteId, organizationId],
    );
  }
}
