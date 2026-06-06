import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { Client } from '../entities/client.entity';

@Injectable()
export class ClientRepository extends Repository<Client> {
  constructor(private dataSource: DataSource) {
    super(Client, dataSource.createEntityManager());
  }

  /**
   * Mettre à jour les finances du client après un retour
   */
  async updateFinancesApresRetour(
    clientId: string,
    reductionTotalAchats: number,
    reductionTotalCredits: number,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `UPDATE client
       SET "totalAchats" = GREATEST(0, "totalAchats" - $1),
           "totalCredits" = GREATEST(0, "totalCredits" - $2)
       WHERE id = $3 AND "organizationId" = $4`,
      [reductionTotalAchats, reductionTotalCredits, clientId, organizationId],
    );
  }

  /**
   * Recalculer les totaux du client depuis ses ventes
   */
  async recalculerTotaux(
    clientId: string,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<{ totalAchats: number; totalCredits: number }> {
    const result = await queryRunner.manager.query(
      `SELECT
         COALESCE(SUM(v.total), 0) AS "totalAchats",
         COALESCE(SUM(v."montantRestant"), 0) AS "totalCredits"
       FROM vente v
       WHERE v."clientId" = $1
         AND v."organizationId" = $2
         AND v.statut = 'active'`,
      [clientId, organizationId],
    );

    const totaux = {
      totalAchats: parseFloat(result[0]?.totalAchats || 0),
      totalCredits: parseFloat(result[0]?.totalCredits || 0),
    };

    // Mettre à jour le client
    await queryRunner.manager.query(
      `UPDATE client
       SET "totalAchats" = $1,
           "totalCredits" = $2
       WHERE id = $3 AND "organizationId" = $4`,
      [totaux.totalAchats, totaux.totalCredits, clientId, organizationId],
    );

    return totaux;
  }
}
