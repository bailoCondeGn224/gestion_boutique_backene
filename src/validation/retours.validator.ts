import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { LigneRetourDto } from '../retours/dto/ligne-retour.dto';
import {
  TypeMouvement,
  MotifMouvement,
} from '../mouvements-stock/entities/mouvement-stock.entity';

/**
 * Service de validation pour les retours (clients et fournisseurs)
 * Contient toutes les règles métier pour garantir l'intégrité des données
 */
@Injectable()
export class RetoursValidator {
  constructor(private dataSource: DataSource) {}

  /**
   * Valider qu'un retour client ne dépasse pas les quantités disponibles
   * Prend en compte les retours précédents pour éviter les doublons
   *
   * Règle métier : On ne peut pas retourner plus que ce qui a été vendu
   * Formule : quantité_retour <= (quantité_vendue - quantité_déjà_retournée)
   */
  async validateRetourClientQuantities(
    venteId: string,
    lignes: LigneRetourDto[],
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    for (const ligne of lignes) {
      // 1. Calculer la quantité totale déjà retournée pour cet article de cette vente
      const retoursExistants = await queryRunner.manager
        .createQueryBuilder()
        .select('COALESCE(SUM(ms.quantite), 0)', 'totalRetourne')
        .from('mouvement_stock', 'ms')
        .where('ms."organizationId" = :organizationId', { organizationId })
        .andWhere('ms."venteId" = :venteId', { venteId })
        .andWhere('ms."articleId" = :articleId', {
          articleId: ligne.articleId,
        })
        .andWhere('ms.motif = :motif', { motif: MotifMouvement.RETOUR_CLIENT })
        .andWhere('ms.type = :type', { type: TypeMouvement.ENTREE })
        .getRawOne();

      const quantiteDejaRetournee = parseInt(
        retoursExistants?.totalRetourne || '0',
      );

      // 2. Récupérer la ligne de vente (peut être NULL si tous les articles ont été retournés)
      const ligneActuelle = await queryRunner.manager.findOne(LigneVente, {
        where: {
          venteId,
          articleId: ligne.articleId,
          organizationId,
        },
      });

      // 3. Calculer la quantité ORIGINALE vendue (actuelle + déjà retournée)
      const quantiteOriginaleVendue = ligneActuelle
        ? ligneActuelle.quantite + quantiteDejaRetournee
        : quantiteDejaRetournee;

      // Si pas de ligne actuelle ET aucun retour précédent = article jamais vendu
      if (quantiteOriginaleVendue === 0) {
        throw new BadRequestException(
          `Article "${ligne.nom}" n'existe pas dans la vente originale`,
        );
      }

      // 4. Calculer la quantité disponible pour retour
      const quantiteDisponiblePourRetour = quantiteOriginaleVendue - quantiteDejaRetournee;

      // 5. Valider que la quantité demandée ne dépasse pas la quantité disponible
      if (ligne.quantite > quantiteDisponiblePourRetour) {
        throw new BadRequestException(
          `Retour impossible pour "${ligne.nom}": ` +
            `Quantité originale vendue: ${quantiteOriginaleVendue}, ` +
            `Déjà retournée: ${quantiteDejaRetournee}, ` +
            `Disponible pour retour: ${quantiteDisponiblePourRetour}, ` +
            `Quantité demandée: ${ligne.quantite}. ` +
            `Vous ne pouvez retourner que ${quantiteDisponiblePourRetour} unité(s) maximum.`,
        );
      }

      // 6. Vérifier que la quantité demandée est positive
      if (ligne.quantite <= 0) {
        throw new BadRequestException(
          `La quantité à retourner doit être supérieure à 0 pour "${ligne.nom}"`,
        );
      }
    }
  }

  /**
   * Valider qu'un retour fournisseur ne dépasse pas les quantités disponibles
   * Prend en compte les retours précédents pour éviter les doublons
   *
   * Règle métier : On ne peut pas retourner plus que ce qui a été approvisionné
   * Formule : quantité_retour <= (quantité_approvisionnée - quantité_déjà_retournée)
   */
  async validateRetourFournisseurQuantities(
    approvisionnementId: string,
    lignes: LigneRetourDto[],
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    for (const ligne of lignes) {
      // 1. Récupérer la ligne d'approvisionnement originale
      const originalLigne = await queryRunner.manager.findOne(
        LigneApprovisionnement,
        {
          where: {
            approvisionnementId,
            articleId: ligne.articleId,
            organizationId,
          },
        },
      );

      if (!originalLigne) {
        throw new BadRequestException(
          `Article "${ligne.nom}" n'existe pas dans l'approvisionnement original`,
        );
      }

      // 2. Calculer la quantité totale déjà retournée pour cet article de cet approvisionnement
      const retoursExistants = await queryRunner.manager
        .createQueryBuilder()
        .select('COALESCE(SUM(ms.quantite), 0)', 'totalRetourne')
        .from('mouvement_stock', 'ms')
        .where('ms."organizationId" = :organizationId', { organizationId })
        .andWhere('ms."approvisionnementId" = :approvisionnementId', {
          approvisionnementId,
        })
        .andWhere('ms."articleId" = :articleId', {
          articleId: ligne.articleId,
        })
        .andWhere('ms.motif = :motif', {
          motif: MotifMouvement.RETOUR_FOURNISSEUR,
        })
        .andWhere('ms.type = :type', { type: TypeMouvement.SORTIE })
        .getRawOne();

      const quantiteDejaRetournee = parseInt(
        retoursExistants?.totalRetourne || '0',
      );
      const quantiteDisponiblePourRetour =
        originalLigne.quantite - quantiteDejaRetournee;

      // 3. Valider que la quantité demandée ne dépasse pas la quantité disponible
      if (ligne.quantite > quantiteDisponiblePourRetour) {
        throw new BadRequestException(
          `Retour impossible pour "${ligne.nom}": ` +
            `Quantité approvisionnée: ${originalLigne.quantite}, ` +
            `Déjà retournée: ${quantiteDejaRetournee}, ` +
            `Disponible pour retour: ${quantiteDisponiblePourRetour}, ` +
            `Quantité demandée: ${ligne.quantite}. ` +
            `Vous ne pouvez retourner que ${quantiteDisponiblePourRetour} unité(s) maximum.`,
        );
      }

      // 4. Vérifier que la quantité demandée est positive
      if (ligne.quantite <= 0) {
        throw new BadRequestException(
          `La quantité à retourner doit être supérieure à 0 pour "${ligne.nom}"`,
        );
      }
    }
  }

  /**
   * Valider qu'une vente existe et appartient à l'organisation
   */
  async validateVenteExists(
    venteId: string,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const venteExists = await queryRunner.manager.findOne('vente', {
      where: { id: venteId, organizationId },
    });

    if (!venteExists) {
      throw new BadRequestException(
        `La vente avec l'ID ${venteId} n'existe pas ou n'appartient pas à votre organisation`,
      );
    }
  }

  /**
   * Valider qu'un approvisionnement existe et appartient à l'organisation
   */
  async validateApprovisionnementExists(
    approvisionnementId: string,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const approExists = await queryRunner.manager.findOne('approvisionnement', {
      where: { id: approvisionnementId, organizationId },
    });

    if (!approExists) {
      throw new BadRequestException(
        `L'approvisionnement avec l'ID ${approvisionnementId} n'existe pas ou n'appartient pas à votre organisation`,
      );
    }
  }

  /**
   * Valider que toutes les lignes ont une raison de retour
   */
  validateRaisonRetour(lignes: LigneRetourDto[]): void {
    const lignesSansRaison = lignes.filter((l) => !l.raison);

    if (lignesSansRaison.length > 0) {
      const nomsArticles = lignesSansRaison.map((l) => l.nom).join(', ');
      throw new BadRequestException(
        `Les articles suivants n'ont pas de raison de retour spécifiée: ${nomsArticles}`,
      );
    }
  }

  /**
   * Valider qu'il y a au moins une ligne à retourner
   */
  validateLignesNotEmpty(lignes: LigneRetourDto[]): void {
    if (!lignes || lignes.length === 0) {
      throw new BadRequestException(
        'Vous devez spécifier au moins un article à retourner',
      );
    }
  }
}
