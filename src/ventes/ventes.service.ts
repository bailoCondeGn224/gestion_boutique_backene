import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vente } from './entities/vente.entity';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { StockService } from '../stock/stock.service';
import { VenteFilterDto } from './dto/vente-filter.dto';
import { VenteStatsFilterDto } from './dto/vente-stats-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service';
import { TypeMouvement, MotifMouvement } from '../mouvements-stock/entities/mouvement-stock.entity';
import { Client } from '../clients/entities/client.entity';
import { VersementClient } from '../versements-client/entities/versement-client.entity';

@Injectable()
export class VentesService {
  constructor(
    @InjectRepository(Vente)
    private ventesRepository: Repository<Vente>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(VersementClient)
    private versementClientRepository: Repository<VersementClient>,
    private stockService: StockService,
    private dataSource: DataSource,
    private mouvementsStockService: MouvementsStockService,
  ) {}

  async generateNumero(organizationId: string): Promise<string> {
    // Génération atomique du numéro pour éviter les doublons
    const result = await this.ventesRepository
      .createQueryBuilder('vente')
      .select('MAX(vente.numero)', 'maxNumero')
      .where('vente.organizationId = :organizationId', { organizationId })
      .getRawOne();

    let nextNumber = 1;
    if (result?.maxNumero) {
      const match = result.maxNumero.match(/V-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `V-${String(nextNumber).padStart(3, '0')}`;
  }

  async create(createVenteDto: CreateVenteDto, organizationId: string): Promise<Vente> {
    // VALIDATION CRITIQUE: Vérifier qu'un client est enregistré
    const hasDette = Number(createVenteDto.montantRestant) > 0;
    const isCreditMode = ['credit', 'acompte_50'].includes(createVenteDto.modePaiement);

    // Bloquer si: (1) il y a une dette OU (2) le mode est crédit/acompte
    if ((hasDette || isCreditMode) && !createVenteDto.clientId) {
      throw new BadRequestException(
        'Un client doit être enregistré pour les ventes à crédit ou avec un montant restant. ' +
        'Veuillez créer ou sélectionner un client avant de continuer.'
      );
    }

    // VALIDATION: Vérifier que le total correspond à la somme des lignes
    const calculatedTotal = createVenteDto.lignes.reduce(
      (sum, ligne) => sum + Number(ligne.sousTotal),
      0,
    );
    if (Math.abs(Number(createVenteDto.total) - calculatedTotal) > 0.01) {
      throw new BadRequestException(
        `Le total (${createVenteDto.total} GNF) ne correspond pas à la somme des lignes (${calculatedTotal} GNF)`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Décrémenter le stock et enregistrer les mouvements
      for (const item of createVenteDto.lignes) {
        // Récupérer le stock avant modification
        const article = await this.stockService.findOne(item.articleId, organizationId);
        const stockAvant = article.stock;

        // Stocker le prixAchat de l'article dans la ligne (pour calculer le bénéfice)
        if (!item.prixAchat) {
          item.prixAchat = Number(article.prixAchat) || 0;
        }

        // Décrémenter le stock
        await this.stockService.decrementStock(item.articleId, item.quantite, organizationId);
        const stockApres = stockAvant - item.quantite;

        // Enregistrer le mouvement de stock DANS LA MÊME TRANSACTION
        if (createVenteDto.userId) {
          await queryRunner.manager.query(
            `INSERT INTO mouvement_stock
             ("articleId", "articleNom", type, motif, quantite, "stockAvant", "stockApres",
              "prixUnitaire", "valeurTotal", "userId", "userNom", "venteId",
              date, "organizationId", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NOW(), $12, NOW())`,
            [
              item.articleId,
              item.nom,
              TypeMouvement.SORTIE,
              MotifMouvement.VENTE,
              item.quantite,
              stockAvant,
              stockApres,
              item.prixUnitaire,
              item.sousTotal,
              createVenteDto.userId,
              createVenteDto.userNom,
              organizationId,
            ],
          );
        }
      }

      const numero = await this.generateNumero(organizationId);
      const now = new Date();
      const heure = now.toTimeString().slice(0, 5);

      // Créer la vente SANS les lignes
      const { lignes, ...venteData } = createVenteDto;
      const vente = this.ventesRepository.create({
        ...venteData,
        numero,
        date: now,
        heure,
        organizationId,
      });

      const savedVente = await queryRunner.manager.save(vente);

      // Créer manuellement les lignes avec organizationId
      for (const ligne of lignes) {
        const prixAchat = ligne.prixAchat || 0;

        await queryRunner.manager.query(
          `INSERT INTO ligne_vente
           ("venteId", "articleId", nom, quantite, "prixUnitaire", "prixAchat", "sousTotal", "organizationId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            savedVente.id,
            ligne.articleId,
            ligne.nom,
            ligne.quantite,
            ligne.prixUnitaire,
            prixAchat,
            ligne.sousTotal,
            organizationId,
          ],
        );
      }

      // Mettre à jour les mouvements avec le venteId
      if (createVenteDto.userId) {
        await queryRunner.manager.query(
          `UPDATE mouvement_stock SET "venteId" = $1
           WHERE "userId" = $2 AND "venteId" IS NULL
           AND "createdAt" >= $3 AND "organizationId" = $4`,
          [savedVente.id, createVenteDto.userId, now, organizationId],
        );
      }

      // Mettre à jour le client si un clientId est fourni
      if (createVenteDto.clientId) {
        const client = await this.clientRepository.findOne({
          where: { id: createVenteDto.clientId, organizationId },
        });

        if (client) {
          // Augmenter totalAchats avec le total de la vente
          const newTotalAchats = Number(client.totalAchats) + Number(createVenteDto.total);

          // Augmenter totalCredits avec le montant restant (dette)
          const newTotalCredits = Number(client.totalCredits) + Number(createVenteDto.montantRestant);

          await queryRunner.manager.update(Client, createVenteDto.clientId, {
            totalAchats: newTotalAchats,
            totalCredits: newTotalCredits,
          });
        }
      }

      await queryRunner.commitTransaction();

      return savedVente;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filterDto: VenteFilterDto, organizationId: string): Promise<PaginatedResponse<Vente>> {
    const { page = 1, limit = 10, search, clientId, dateDebut, dateFin, typePaiement } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.ventesRepository.createQueryBuilder('vente');

    // Charger les lignes pour afficher les articles
    queryBuilder.leftJoinAndSelect('vente.lignes', 'lignes');

    // Filtre par organization (toujours en premier avec .where())
    queryBuilder.where('vente.organizationId = :organizationId', { organizationId });

    // Filtre par recherche (numéro de vente)
    if (search) {
      queryBuilder.andWhere('vente.numero ILIKE :search', { search: `%${search}%` });
    }

    // Filtre par client
    if (clientId) {
      queryBuilder.andWhere('vente.clientId = :clientId', { clientId });
    }

    // Filtre par date de début
    if (dateDebut) {
      queryBuilder.andWhere('vente.date >= :dateDebut', { dateDebut: new Date(dateDebut) });
    }

    // Filtre par date de fin
    if (dateFin) {
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('vente.date <= :dateFin', { dateFin: endDate });
    }

    // Filtre par type de paiement
    if (typePaiement) {
      queryBuilder.andWhere('vente.typePaiement = :typePaiement', { typePaiement });
    }

    const [data, total] = await queryBuilder
      .orderBy('vente.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, organizationId: string): Promise<Vente> {
    const vente = await this.ventesRepository.findOne({
      where: { id, organizationId },
      relations: ['lignes'],
    });
    if (!vente) {
      throw new NotFoundException(`Vente avec l'ID ${id} introuvable`);
    }
    return vente;
  }

  async getVenteVersements(
    venteId: string,
    organizationId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<VersementClient>> {
    // Vérifier que la vente existe et appartient à l'organisation
    const vente = await this.ventesRepository.findOne({
      where: { id: venteId, organizationId },
    });

    if (!vente) {
      throw new NotFoundException(`Vente avec l'ID ${venteId} introuvable`);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.versementClientRepository.findAndCount({
      where: { venteId, organizationId },
      order: { date: 'ASC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async findRecent(organizationId: string): Promise<Vente[]> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    return this.ventesRepository
      .createQueryBuilder('vente')
      .where('vente.organizationId = :organizationId', { organizationId })
      .andWhere('vente.createdAt >= :oneHourAgo', { oneHourAgo })
      .orderBy('vente.createdAt', 'DESC')
      .getMany();
  }

  async getStats(organizationId: string, filterDto?: VenteStatsFilterDto): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Stats du jour
    const ventesJour = await this.ventesRepository
      .createQueryBuilder('vente')
      .where('vente.organizationId = :organizationId', { organizationId })
      .andWhere('vente.date >= :today', { today })
      .getMany();

    const totalJour = ventesJour.reduce((sum, v) => sum + Number(v.total), 0);

    // Stats de la semaine
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const ventesSemaine = await this.ventesRepository
      .createQueryBuilder('vente')
      .where('vente.organizationId = :organizationId', { organizationId })
      .andWhere('vente.date >= :weekStart', { weekStart })
      .getMany();

    const totalSemaine = ventesSemaine.reduce(
      (sum, v) => sum + Number(v.total),
      0,
    );

    // Stats du mois - utiliser mois/annee fournis ou mois/annee actuels
    const targetYear = filterDto?.annee ?? today.getFullYear();
    const targetMonth = filterDto?.mois ? filterDto.mois - 1 : today.getMonth(); // mois est 1-12, Date.getMonth() est 0-11

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999); // Dernier jour du mois

    // Utiliser queryBuilder pour la condition >= sur la date
    const ventesMois = await this.ventesRepository
      .createQueryBuilder('vente')
      .leftJoinAndSelect('vente.lignes', 'lignes')
      .where('vente.organizationId = :organizationId', { organizationId })
      .andWhere('vente.date >= :monthStart', { monthStart })
      .andWhere('vente.date <= :monthEnd', { monthEnd })
      .getMany();

    const totalMois = ventesMois.reduce((sum, v) => sum + Number(v.total), 0);

    // Calculer le bénéfice du mois
    let beneficeMois = 0;

    for (const vente of ventesMois) {
      if (vente.lignes && Array.isArray(vente.lignes) && vente.lignes.length > 0) {
        for (const ligne of vente.lignes) {
          const prixAchat = Number(ligne.prixAchat) || 0;
          const prixUnitaire = Number(ligne.prixUnitaire) || 0;
          const quantite = Number(ligne.quantite) || 0;
          const beneficeLigne = (prixUnitaire - prixAchat) * quantite;

          beneficeMois += beneficeLigne;
        }
      }
    }

    // Calculer la dette totale du mois (montants restants)
    let detteMois = 0;
    for (const vente of ventesMois) {
      const montantRestant = Number(vente.montantRestant) || 0;
      detteMois += montantRestant;
    }

    return {
      jour: {
        count: ventesJour.length,
        total: totalJour,
      },
      semaine: {
        count: ventesSemaine.length,
        total: totalSemaine,
      },
      mois: {
        count: ventesMois.length,
        total: totalMois,
        benefice: beneficeMois,
        dette: detteMois,
      },
    };
  }

  async update(id: string, updateVenteDto: UpdateVenteDto, organizationId: string): Promise<Vente> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const vente = await this.findOne(id, organizationId);

      // Si les lignes sont mises à jour, gérer manuellement
      if (updateVenteDto.lignes && updateVenteDto.lignes.length > 0) {
        // Sauvegarder les anciennes lignes pour ajuster le stock
        const oldLignes = [...vente.lignes];

        // Rétablir le stock des anciennes lignes
        for (const ligne of oldLignes) {
          await this.stockService.incrementStock(ligne.articleId, ligne.quantite, organizationId);
        }

        // Supprimer les anciennes lignes
        await queryRunner.manager.query(
          `DELETE FROM ligne_vente WHERE "venteId" = $1 AND "organizationId" = $2`,
          [id, organizationId],
        );

        // Créer les nouvelles lignes et décrémenter le stock
        for (const ligneDto of updateVenteDto.lignes) {
          // Récupérer le prix d'achat si non fourni
          let prixAchat = ligneDto.prixAchat;
          if (!prixAchat) {
            const article = await this.stockService.findOne(ligneDto.articleId, organizationId);
            prixAchat = Number(article.prixAchat) || 0;
          }

          await queryRunner.manager.query(
            `INSERT INTO ligne_vente
             ("venteId", "articleId", nom, quantite, "prixUnitaire", "prixAchat", "sousTotal", "organizationId")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              id,
              ligneDto.articleId,
              ligneDto.nom,
              ligneDto.quantite,
              ligneDto.prixUnitaire,
              prixAchat,
              ligneDto.sousTotal,
              organizationId,
            ],
          );

          // Décrémenter le stock
          await this.stockService.decrementStock(ligneDto.articleId, ligneDto.quantite, organizationId);
        }
      }

      // Mettre à jour les autres champs (sans les lignes)
      const { lignes, ...otherFields } = updateVenteDto;

      if (Object.keys(otherFields).length > 0) {
        // Calculer les anciens et nouveaux montants
        const oldTotal = Number(vente.total);
        const oldMontantRestant = Number(vente.montantRestant);

        // Recalculer montantRestant si nécessaire
        if (otherFields.total !== undefined || otherFields.montantPaye !== undefined) {
          const newTotal = otherFields.total ?? oldTotal;
          const newMontantPaye = otherFields.montantPaye ?? Number(vente.montantPaye);
          otherFields.montantRestant = newTotal - newMontantPaye;
        }

        const newTotal = otherFields.total ?? oldTotal;
        const newMontantRestant = otherFields.montantRestant ?? oldMontantRestant;

        // Mettre à jour la vente
        await queryRunner.manager.update(
          'vente',
          { id, organizationId },
          otherFields,
        );

        // Si le client existe et que les montants ont changé, ajuster client
        if (vente.clientId && (otherFields.total !== undefined || otherFields.montantRestant !== undefined)) {
          const client = await this.clientRepository.findOne({
            where: { id: vente.clientId, organizationId },
          });

          if (client) {
            // Calculer les différences
            const diffTotal = newTotal - oldTotal;
            const diffMontantRestant = newMontantRestant - oldMontantRestant;

            // Ajuster totalAchats et totalCredits
            await queryRunner.manager.update(Client, vente.clientId, {
              totalAchats: Number(client.totalAchats) + diffTotal,
              totalCredits: Number(client.totalCredits) + diffMontantRestant,
            });
          }
        }
      }

      await queryRunner.commitTransaction();

      // Recharger la vente avec les nouvelles lignes
      return this.findOne(id, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const vente = await this.findOne(id, organizationId);

    // Vérifier s'il existe des versements pour cette vente
    const versementsCount = await this.versementClientRepository.count({
      where: { venteId: id, organizationId },
    });

    if (versementsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette vente : ${versementsCount} paiement(s) associé(s). Supprimez d'abord les paiements.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Restaurer le stock
      for (const item of vente.lignes) {
        await this.stockService.incrementStock(item.articleId, item.quantite, organizationId);
      }

      // Mettre à jour le client si un clientId est fourni
      if (vente.clientId) {
        const client = await this.clientRepository.findOne({
          where: { id: vente.clientId, organizationId },
        });

        if (client) {
          // Diminuer totalAchats
          const newTotalAchats = Number(client.totalAchats) - Number(vente.total);

          // Diminuer totalCredits du montant restant
          const newTotalCredits = Number(client.totalCredits) - Number(vente.montantRestant);

          await queryRunner.manager.update(Client, vente.clientId, {
            totalAchats: Math.max(0, newTotalAchats),
            totalCredits: Math.max(0, newTotalCredits),
          });
        }
      }

      await queryRunner.manager.remove(vente);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findVentesACredit(clientId: string, organizationId: string): Promise<Vente[]> {
    // Récupérer toutes les ventes du client
    const ventes = await this.ventesRepository.find({
      where: {
        clientId,
        organizationId,
      },
      order: { createdAt: 'ASC' }, // Plus anciennes en premier
    });

    // Filtrer seulement les ventes avec montant restant > 0
    return ventes.filter(vente => Number(vente.montantRestant) > 0);
  }

  async getMoisDisponibles(organizationId: string): Promise<{ annee: number; mois: number }[]> {
    // Récupérer les mois/années distincts qui ont au moins une vente
    const result = await this.ventesRepository
      .createQueryBuilder('vente')
      .select('EXTRACT(YEAR FROM vente.date)::INTEGER', 'annee')
      .addSelect('EXTRACT(MONTH FROM vente.date)::INTEGER', 'mois')
      .where('vente.organizationId = :organizationId', { organizationId })
      .groupBy('annee, mois')
      .orderBy('annee', 'DESC')
      .addOrderBy('mois', 'DESC')
      .getRawMany();

    return result.map(r => ({ annee: r.annee, mois: r.mois }));
  }
}
