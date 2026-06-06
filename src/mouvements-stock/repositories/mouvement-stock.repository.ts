import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { MouvementStock, TypeMouvement, MotifMouvement } from '../entities/mouvement-stock.entity';

export interface CreateMouvementStockDto {
  articleId: string;
  articleNom: string;
  type: TypeMouvement;
  motif: MotifMouvement;
  quantite: number;
  stockAvant: number;
  stockApres: number;
  prixUnitaire: number;
  valeurTotal: number;
  userId: string;
  userNom: string;
  venteId?: string;
  approvisionnementId?: string;
  reference: string;
  note?: string;
}

@Injectable()
export class MouvementStockRepository extends Repository<MouvementStock> {
  constructor(private dataSource: DataSource) {
    super(MouvementStock, dataSource.createEntityManager());
  }

  /**
   * Créer un mouvement de stock pour un retour client
   */
  async creerMouvementRetourClient(
    data: CreateMouvementStockDto,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `INSERT INTO mouvement_stock
       ("articleId", "articleNom", type, motif, quantite, "stockAvant", "stockApres",
        "prixUnitaire", "valeurTotal", "userId", "userNom", "venteId",
        reference, note, date, "organizationId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15, NOW())`,
      [
        data.articleId,
        data.articleNom,
        data.type,
        data.motif,
        data.quantite,
        data.stockAvant,
        data.stockApres,
        data.prixUnitaire,
        data.valeurTotal,
        data.userId,
        data.userNom,
        data.venteId,
        data.reference,
        data.note,
        organizationId,
      ],
    );
  }

  /**
   * Créer un mouvement de stock pour un retour fournisseur
   */
  async creerMouvementRetourFournisseur(
    data: CreateMouvementStockDto,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `INSERT INTO mouvement_stock
       ("articleId", "articleNom", type, motif, quantite, "stockAvant", "stockApres",
        "prixUnitaire", "valeurTotal", "userId", "userNom", "approvisionnementId",
        reference, note, date, "organizationId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15, NOW())`,
      [
        data.articleId,
        data.articleNom,
        data.type,
        data.motif,
        data.quantite,
        data.stockAvant,
        data.stockApres,
        data.prixUnitaire,
        data.valeurTotal,
        data.userId,
        data.userNom,
        data.approvisionnementId,
        data.reference,
        data.note,
        organizationId,
      ],
    );
  }

  /**
   * Mettre à jour la référence des mouvements (après création du retour)
   */
  async updateReference(
    venteId: string,
    reference: string,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `UPDATE mouvement_stock
       SET reference = $1
       WHERE "venteId" = $2
         AND "organizationId" = $3
         AND motif = $4
         AND reference = ''`,
      [reference, venteId, organizationId, MotifMouvement.RETOUR_CLIENT],
    );
  }
}
