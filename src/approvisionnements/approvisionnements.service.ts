import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Approvisionnement } from './entities/approvisionnement.entity';
import { CreateApprovisionnementDto } from './dto/create-approvisionnement.dto';
import { UpdateApprovisionnementDto } from './dto/update-approvisionnement.dto';
import { ApprovisionnementFilterDto } from './dto/approvisionnement-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service';
import { TypeMouvement, MotifMouvement } from '../mouvements-stock/entities/mouvement-stock.entity';

@Injectable()
export class ApprovisionnementService {
  constructor(
    @InjectRepository(Approvisionnement)
    private approvisionnementRepository: Repository<Approvisionnement>,
    private dataSource: DataSource,
    private mouvementsStockService: MouvementsStockService,
  ) {}

  async create(
    createDto: CreateApprovisionnementDto,
    organizationId: string,
  ): Promise<Approvisionnement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Générer le numéro d'approvisionnement
      const numero = await this.generateNumero(organizationId);

      // Calculer montantRestant si non fourni
      const montantPaye = createDto.montantPaye || 0;
      const montantRestant =
        createDto.montantRestant !== undefined
          ? createDto.montantRestant
          : createDto.total - montantPaye;

      // Créer l'approvisionnement SANS les lignes
      const { lignes, ...approData } = createDto;
      const approvisionnement = this.approvisionnementRepository.create({
        ...approData,
        numero,
        montantPaye,
        montantRestant,
        organizationId,
      });

      const savedApprovisionnement = await queryRunner.manager.save(
        approvisionnement,
      );

      // Créer manuellement les lignes avec organizationId
      for (const ligne of lignes) {
        await queryRunner.manager.query(
          `INSERT INTO ligne_approvisionnement
           ("approvisionnementId", "articleId", nom, quantite, "prixUnitaire", "sousTotal", "organizationId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            savedApprovisionnement.id,
            ligne.articleId,
            ligne.nom,
            ligne.quantite,
            ligne.prixUnitaire,
            ligne.sousTotal,
            organizationId,
          ],
        );
      }

      // Incrémenter le stock de chaque article et enregistrer les mouvements
      for (const ligne of lignes) {
        // Récupérer le stock avant modification
        const stockResult = await queryRunner.manager.query(
          `SELECT stock FROM article WHERE id = $1 AND "organizationId" = $2`,
          [ligne.articleId, organizationId],
        );
        const stockAvant = stockResult[0]?.stock || 0;

        // Incrémenter le stock
        await queryRunner.manager.query(
          `UPDATE article SET stock = stock + $1 WHERE id = $2 AND "organizationId" = $3`,
          [ligne.quantite, ligne.articleId, organizationId],
        );

        const stockApres = stockAvant + ligne.quantite;

        // Mettre à jour le prix d'achat moyen (optionnel)
        await queryRunner.manager.query(
          `UPDATE article SET "prixAchat" = $1 WHERE id = $2 AND "organizationId" = $3`,
          [ligne.prixUnitaire, ligne.articleId, organizationId],
        );

        // Enregistrer le mouvement de stock (si userId fourni)
        if (createDto.userId) {
          await this.mouvementsStockService.create({
            articleId: ligne.articleId,
            articleNom: ligne.nom,
            type: TypeMouvement.ENTREE,
            motif: MotifMouvement.APPROVISIONNEMENT,
            quantite: ligne.quantite,
            stockAvant: stockAvant,
            stockApres: stockApres,
            prixUnitaire: ligne.prixUnitaire,
            valeurTotal: ligne.sousTotal,
            userId: createDto.userId,
            userNom: createDto.userNom,
            approvisionnementId: savedApprovisionnement.id,
            date: new Date(createDto.dateLivraison),
          }, organizationId);
        }
      }

      // Incrémenter totalAchats du fournisseur
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalAchats" = "totalAchats" + $1,
             dette = "totalAchats" + $1 - "totalPaye"
         WHERE id = $2 AND "organizationId" = $3`,
        [createDto.total, createDto.fournisseurId, organizationId],
      );

      // Créer une transaction financière (sortie d'argent si payé)
      if (montantPaye > 0) {
        await queryRunner.manager.query(
          `INSERT INTO transaction (description, montant, type, categorie, date, "approvisionnementId", "organizationId")
           VALUES ($1, $2, 'out', 'approvisionnement', $3, $4, $5)`,
          [
            `Approvisionnement ${numero} - ${createDto.fournisseurNom}`,
            montantPaye,
            createDto.dateLivraison,
            savedApprovisionnement.id,
            organizationId,
          ],
        );
      }

      await queryRunner.commitTransaction();
      return savedApprovisionnement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Erreur lors de la création de l'approvisionnement: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async generateNumero(organizationId: string): Promise<string> {
    const count = await this.approvisionnementRepository.count({
      where: { organizationId },
    });
    const numero = (count + 1).toString().padStart(3, '0');
    return `APP-${numero}`;
  }

  async findAll(filterDto: ApprovisionnementFilterDto, organizationId: string): Promise<PaginatedResponse<Approvisionnement>> {
    const { page = 1, limit = 10, search, fournisseurId, dateDebut, dateFin } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.approvisionnementRepository.createQueryBuilder('approvisionnement');

    // Charger les lignes pour afficher les articles (triées par ordre de création)
    queryBuilder.leftJoinAndSelect('approvisionnement.lignes', 'lignes');

    // Filtre par organization (toujours en premier avec .where())
    queryBuilder.where('approvisionnement.organizationId = :organizationId', { organizationId });

    // Filtre par recherche (numéro)
    if (search) {
      queryBuilder.andWhere('approvisionnement.numero LIKE :search', { search: `%${search}%` });
    }

    // Filtre par fournisseur
    if (fournisseurId) {
      queryBuilder.andWhere('approvisionnement.fournisseurId = :fournisseurId', { fournisseurId });
    }

    // Filtre par date de début
    if (dateDebut) {
      queryBuilder.andWhere('approvisionnement.dateLivraison >= :dateDebut', { dateDebut: new Date(dateDebut) });
    }

    // Filtre par date de fin
    if (dateFin) {
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('approvisionnement.dateLivraison <= :dateFin', { dateFin: endDate });
    }

    const [data, total] = await queryBuilder
      .orderBy('approvisionnement.createdAt', 'DESC')
      .addOrderBy('approvisionnement.dateLivraison', 'DESC')
      .addOrderBy('lignes.createdAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, organizationId: string): Promise<Approvisionnement> {
    const approvisionnement = await this.approvisionnementRepository.findOne({
      where: { id, organizationId },
      relations: ['lignes'],
    });

    if (!approvisionnement) {
      throw new NotFoundException(
        `Approvisionnement avec l'ID ${id} introuvable`,
      );
    }

    return approvisionnement;
  }

  async findByFournisseur(
    fournisseurId: string,
    organizationId: string,
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<Approvisionnement>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.approvisionnementRepository.findAndCount({
      where: { fournisseurId, organizationId },
      order: { dateLivraison: 'DESC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async getStatsFournisseur(fournisseurId: string, organizationId: string): Promise<{
    totalAppros: number;
    totalMontant: number;
    totalPaye: number;
    totalRestant: number;
    quantiteTotale: number;
  }> {
    const appros = await this.approvisionnementRepository.find({
      where: { fournisseurId, organizationId },
      relations: ['lignes'],
    });

    const stats = appros.reduce(
      (acc, appro) => {
        acc.totalAppros += 1;
        acc.totalMontant += Number(appro.total);
        acc.totalPaye += Number(appro.montantPaye);
        acc.totalRestant += Number(appro.montantRestant);

        // Calculer quantité totale de tous les articles
        appro.lignes.forEach((ligne) => {
          acc.quantiteTotale += ligne.quantite;
        });

        return acc;
      },
      {
        totalAppros: 0,
        totalMontant: 0,
        totalPaye: 0,
        totalRestant: 0,
        quantiteTotale: 0,
      },
    );

    return stats;
  }

  async getStatsGlobales(organizationId: string): Promise<{
    totalAppros: number;
    montantTotal: number;
    montantMoisEnCours: number;
    dernierAppro: Approvisionnement | null;
  }> {
    const allAppros = await this.approvisionnementRepository.find({
      where: { organizationId },
      order: { dateLivraison: 'DESC' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const approsMoisEnCours = allAppros.filter(
      (appro) => new Date(appro.dateLivraison) >= startOfMonth,
    );

    return {
      totalAppros: allAppros.length,
      montantTotal: allAppros.reduce(
        (sum, appro) => sum + Number(appro.total),
        0,
      ),
      montantMoisEnCours: approsMoisEnCours.reduce(
        (sum, appro) => sum + Number(appro.total),
        0,
      ),
      dernierAppro: allAppros[0] || null,
    };
  }

  async update(
    id: string,
    updateDto: UpdateApprovisionnementDto,
    organizationId: string,
  ): Promise<Approvisionnement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approvisionnement = await this.findOne(id, organizationId);

      // Si les lignes sont mises à jour, gérer manuellement
      if (updateDto.lignes && updateDto.lignes.length > 0) {
        // Sauvegarder les anciennes lignes pour ajuster le stock
        const oldLignes = [...approvisionnement.lignes];

        // Rétablir le stock des anciennes lignes
        for (const ligne of oldLignes) {
          await queryRunner.manager.query(
            `UPDATE article SET stock = stock - $1 WHERE id = $2 AND "organizationId" = $3`,
            [ligne.quantite, ligne.articleId, organizationId],
          );
        }

        // Supprimer les anciennes lignes
        await queryRunner.manager.query(
          `DELETE FROM ligne_approvisionnement WHERE "approvisionnementId" = $1 AND "organizationId" = $2`,
          [id, organizationId],
        );

        // Créer les nouvelles lignes et ajuster le stock
        for (const ligneDto of updateDto.lignes) {
          await queryRunner.manager.query(
            `INSERT INTO ligne_approvisionnement
             ("approvisionnementId", "articleId", nom, quantite, "prixUnitaire", "sousTotal", "organizationId")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id,
              ligneDto.articleId,
              ligneDto.nom,
              ligneDto.quantite,
              ligneDto.prixUnitaire,
              ligneDto.sousTotal,
              organizationId,
            ],
          );

          // Ajouter au stock et mettre à jour le prix d'achat
          await queryRunner.manager.query(
            `UPDATE article SET stock = stock + $1, "prixAchat" = $2 WHERE id = $3 AND "organizationId" = $4`,
            [ligneDto.quantite, ligneDto.prixUnitaire, ligneDto.articleId, organizationId],
          );
        }
      }

      // Mettre à jour les autres champs (sans les lignes)
      const { lignes, ...otherFields } = updateDto;

      if (Object.keys(otherFields).length > 0) {
        // Calculer les anciens et nouveaux montants
        const oldTotal = Number(approvisionnement.total);

        // Recalculer montantRestant si nécessaire
        if (otherFields.total !== undefined || otherFields.montantPaye !== undefined) {
          const newTotal = otherFields.total ?? oldTotal;
          const newMontantPaye = otherFields.montantPaye ?? Number(approvisionnement.montantPaye);
          otherFields.montantRestant = newTotal - newMontantPaye;
        }

        const newTotal = otherFields.total ?? oldTotal;

        // Mettre à jour l'approvisionnement
        await queryRunner.manager.update(
          'approvisionnement',
          { id, organizationId },
          otherFields,
        );

        // Si le total a changé, ajuster le fournisseur
        if (otherFields.total !== undefined) {
          const diffTotal = newTotal - oldTotal;

          await queryRunner.manager.query(
            `UPDATE fournisseur
             SET "totalAchats" = "totalAchats" + $1,
                 dette = "totalAchats" + $1 - "totalPaye"
             WHERE id = $2 AND "organizationId" = $3`,
            [diffTotal, approvisionnement.fournisseurId, organizationId],
          );
        }
      }

      await queryRunner.commitTransaction();

      // Recharger l'approvisionnement avec les nouvelles lignes
      return this.findOne(id, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Erreur lors de la mise à jour de l'approvisionnement: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approvisionnement = await this.findOne(id, organizationId);

      // Restaurer le stock de chaque article
      for (const ligne of approvisionnement.lignes) {
        await queryRunner.manager.query(
          `UPDATE article SET stock = stock - $1 WHERE id = $2 AND "organizationId" = $3`,
          [ligne.quantite, ligne.articleId, organizationId],
        );
      }

      // Mettre à jour le fournisseur (diminuer totalAchats et recalculer dette)
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalAchats" = "totalAchats" - $1,
             dette = "totalAchats" - $1 - "totalPaye"
         WHERE id = $2 AND "organizationId" = $3`,
        [approvisionnement.total, approvisionnement.fournisseurId, organizationId],
      );

      // Supprimer la transaction financière associée si elle existe
      await queryRunner.manager.query(
        `DELETE FROM transaction WHERE "approvisionnementId" = $1 AND "organizationId" = $2`,
        [id, organizationId],
      );

      // Supprimer l'approvisionnement (les lignes seront supprimées en cascade)
      await queryRunner.manager.remove(approvisionnement);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Erreur lors de la suppression de l'approvisionnement: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
