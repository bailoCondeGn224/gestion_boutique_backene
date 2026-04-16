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
  ): Promise<Approvisionnement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Générer le numéro d'approvisionnement
      const numero = await this.generateNumero();

      // Calculer montantRestant si non fourni
      const montantPaye = createDto.montantPaye || 0;
      const montantRestant =
        createDto.montantRestant !== undefined
          ? createDto.montantRestant
          : createDto.total - montantPaye;

      // Créer l'approvisionnement
      const approvisionnement = this.approvisionnementRepository.create({
        ...createDto,
        numero,
        montantPaye,
        montantRestant,
      });

      const savedApprovisionnement = await queryRunner.manager.save(
        approvisionnement,
      );

      // Incrémenter le stock de chaque article et enregistrer les mouvements
      for (const ligne of createDto.lignes) {
        // Récupérer le stock avant modification
        const stockResult = await queryRunner.manager.query(
          `SELECT stock FROM article WHERE id = $1`,
          [ligne.articleId],
        );
        const stockAvant = stockResult[0]?.stock || 0;

        // Incrémenter le stock
        await queryRunner.manager.query(
          `UPDATE article SET stock = stock + $1 WHERE id = $2`,
          [ligne.quantite, ligne.articleId],
        );

        const stockApres = stockAvant + ligne.quantite;

        // Mettre à jour le prix d'achat moyen (optionnel)
        await queryRunner.manager.query(
          `UPDATE article SET "prixAchat" = $1 WHERE id = $2`,
          [ligne.prixUnitaire, ligne.articleId],
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
          });
        }
      }

      // Incrémenter totalAchats du fournisseur
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalAchats" = "totalAchats" + $1,
             dette = "totalAchats" + $1 - "totalPaye"
         WHERE id = $2`,
        [createDto.total, createDto.fournisseurId],
      );

      // Créer une transaction financière (sortie d'argent si payé)
      if (montantPaye > 0) {
        await queryRunner.manager.query(
          `INSERT INTO transaction (description, montant, type, categorie, date, "approvisionnementId")
           VALUES ($1, $2, 'out', 'approvisionnement', $3, $4)`,
          [
            `Approvisionnement ${numero} - ${createDto.fournisseurNom}`,
            montantPaye,
            createDto.dateLivraison,
            savedApprovisionnement.id,
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

  async generateNumero(): Promise<string> {
    const lastAppro = await this.approvisionnementRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });

    if (!lastAppro || lastAppro.length === 0) {
      return 'APP-001';
    }

    const lastNumber = parseInt(lastAppro[0].numero.split('-')[1], 10);
    const newNumber = lastNumber + 1;
    return `APP-${newNumber.toString().padStart(3, '0')}`;
  }

  async findAll(filterDto?: ApprovisionnementFilterDto): Promise<PaginatedResponse<Approvisionnement>> {
    const { page = 1, limit = 10, search, fournisseurId, dateDebut, dateFin } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.approvisionnementRepository.createQueryBuilder('approvisionnement');

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
      .orderBy('approvisionnement.dateLivraison', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Approvisionnement> {
    const approvisionnement = await this.approvisionnementRepository.findOne({
      where: { id },
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
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<Approvisionnement>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.approvisionnementRepository.findAndCount({
      where: { fournisseurId },
      order: { dateLivraison: 'DESC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async getStatsFournisseur(fournisseurId: string): Promise<{
    totalAppros: number;
    totalMontant: number;
    totalPaye: number;
    totalRestant: number;
    quantiteTotale: number;
  }> {
    const appros = await this.approvisionnementRepository.find({
      where: { fournisseurId },
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

  async getStatsGlobales(): Promise<{
    totalAppros: number;
    montantTotal: number;
    montantMoisEnCours: number;
    dernierAppro: Approvisionnement | null;
  }> {
    const allAppros = await this.approvisionnementRepository.find({
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
  ): Promise<Approvisionnement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approvisionnement = await this.findOne(id);

      // Si les lignes sont mises à jour, gérer manuellement
      if (updateDto.lignes && updateDto.lignes.length > 0) {
        // Sauvegarder les anciennes lignes pour ajuster le stock
        const oldLignes = [...approvisionnement.lignes];

        // Rétablir le stock des anciennes lignes
        for (const ligne of oldLignes) {
          await queryRunner.manager.query(
            `UPDATE article SET stock = stock - $1 WHERE id = $2`,
            [ligne.quantite, ligne.articleId],
          );
        }

        // Supprimer les anciennes lignes
        await queryRunner.manager.query(
          `DELETE FROM ligne_approvisionnement WHERE "approvisionnementId" = $1`,
          [id],
        );

        // Créer les nouvelles lignes et ajuster le stock
        for (const ligneDto of updateDto.lignes) {
          await queryRunner.manager.query(
            `INSERT INTO ligne_approvisionnement
             ("approvisionnementId", "articleId", nom, quantite, "prixUnitaire", "sousTotal")
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              ligneDto.articleId,
              ligneDto.nom,
              ligneDto.quantite,
              ligneDto.prixUnitaire,
              ligneDto.sousTotal,
            ],
          );

          // Ajouter au stock et mettre à jour le prix d'achat
          await queryRunner.manager.query(
            `UPDATE article SET stock = stock + $1, "prixAchat" = $2 WHERE id = $3`,
            [ligneDto.quantite, ligneDto.prixUnitaire, ligneDto.articleId],
          );
        }
      }

      // Mettre à jour les autres champs (sans les lignes)
      const { lignes, ...otherFields } = updateDto;

      if (Object.keys(otherFields).length > 0) {
        // Recalculer montantRestant si nécessaire
        if (otherFields.total !== undefined || otherFields.montantPaye !== undefined) {
          const newTotal = otherFields.total ?? Number(approvisionnement.total);
          const newMontantPaye = otherFields.montantPaye ?? Number(approvisionnement.montantPaye);
          otherFields.montantRestant = newTotal - newMontantPaye;
        }

        await queryRunner.manager.update(
          'approvisionnement',
          { id },
          otherFields,
        );
      }

      await queryRunner.commitTransaction();

      // Recharger l'approvisionnement avec les nouvelles lignes
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Erreur lors de la mise à jour de l'approvisionnement: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const approvisionnement = await this.findOne(id);
    await this.approvisionnementRepository.remove(approvisionnement);
  }
}
