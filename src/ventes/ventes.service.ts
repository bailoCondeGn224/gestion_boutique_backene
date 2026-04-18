import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vente } from './entities/vente.entity';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { StockService } from '../stock/stock.service';
import { VenteFilterDto } from './dto/vente-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service';
import { TypeMouvement, MotifMouvement } from '../mouvements-stock/entities/mouvement-stock.entity';
import { Client } from '../clients/entities/client.entity';

@Injectable()
export class VentesService {
  constructor(
    @InjectRepository(Vente)
    private ventesRepository: Repository<Vente>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private stockService: StockService,
    private dataSource: DataSource,
    private mouvementsStockService: MouvementsStockService,
  ) {}

  async generateNumero(): Promise<string> {
    const count = await this.ventesRepository.count();
    const numero = (count + 1).toString().padStart(3, '0');
    return `V-${numero}`;
  }

  async create(createVenteDto: CreateVenteDto): Promise<Vente> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Décrémenter le stock et enregistrer les mouvements
      for (const item of createVenteDto.lignes) {
        // Récupérer le stock avant modification
        const article = await this.stockService.findOne(item.articleId);
        const stockAvant = article.stock;

        // Stocker le prixAchat de l'article dans la ligne (pour calculer le bénéfice)
        if (!item.prixAchat) {
          item.prixAchat = Number(article.prixAchat) || 0;
        }

        // Décrémenter le stock
        await this.stockService.decrementStock(item.articleId, item.quantite);
        const stockApres = stockAvant - item.quantite;

        // Enregistrer le mouvement de stock (si userId fourni)
        if (createVenteDto.userId) {
          await this.mouvementsStockService.create({
            articleId: item.articleId,
            articleNom: item.nom,
            type: TypeMouvement.SORTIE,
            motif: MotifMouvement.VENTE,
            quantite: item.quantite,
            stockAvant: stockAvant,
            stockApres: stockApres,
            prixUnitaire: item.prixUnitaire,
            valeurTotal: item.sousTotal,
            userId: createVenteDto.userId,
            userNom: createVenteDto.userNom,
            venteId: null,
            date: new Date(),
          });
        }
      }

      const numero = await this.generateNumero();
      const now = new Date();
      const heure = now.toTimeString().slice(0, 5);

      const vente = this.ventesRepository.create({
        ...createVenteDto,
        numero,
        date: now,
        heure,
      });

      const savedVente = await queryRunner.manager.save(vente);

      // Mettre à jour les mouvements avec le venteId
      if (createVenteDto.userId) {
        await queryRunner.manager.query(
          `UPDATE mouvement_stock SET "venteId" = $1
           WHERE "userId" = $2 AND "venteId" IS NULL
           AND "createdAt" >= $3`,
          [savedVente.id, createVenteDto.userId, now],
        );
      }

      // Mettre à jour le client si un clientId est fourni
      if (createVenteDto.clientId) {
        const client = await this.clientRepository.findOne({
          where: { id: createVenteDto.clientId },
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

  async findAll(filterDto?: VenteFilterDto): Promise<PaginatedResponse<Vente>> {
    const { page = 1, limit = 10, search, clientId, dateDebut, dateFin, typePaiement } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.ventesRepository.createQueryBuilder('vente');

    // Filtre par recherche (numéro de vente)
    if (search) {
      queryBuilder.andWhere('vente.numero LIKE :search', { search: `%${search}%` });
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

  async findOne(id: string): Promise<Vente> {
    const vente = await this.ventesRepository.findOne({
      where: { id },
      relations: ['lignes'],
    });
    if (!vente) {
      throw new NotFoundException(`Vente avec l'ID ${id} introuvable`);
    }
    return vente;
  }

  async findRecent(): Promise<Vente[]> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    return this.ventesRepository
      .createQueryBuilder('vente')
      .where('vente.createdAt >= :oneHourAgo', { oneHourAgo })
      .orderBy('vente.createdAt', 'DESC')
      .getMany();
  }

  async getStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Stats du jour
    const ventesJour = await this.ventesRepository
      .createQueryBuilder('vente')
      .where('vente.date >= :today', { today })
      .getMany();

    const totalJour = ventesJour.reduce((sum, v) => sum + Number(v.total), 0);

    // Stats de la semaine
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const ventesSemaine = await this.ventesRepository
      .createQueryBuilder('vente')
      .where('vente.date >= :weekStart', { weekStart })
      .getMany();

    const totalSemaine = ventesSemaine.reduce(
      (sum, v) => sum + Number(v.total),
      0,
    );

    // Stats du mois
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Charger les ventes du mois avec leurs lignes pour calculer le bénéfice
    const ventesMoisAvecLignes = await this.ventesRepository.find({
      where: {
        date: monthStart as any, // Cette condition sera gérée par le queryBuilder ci-dessous
      },
      relations: ['lignes'],
    });

    // Utiliser queryBuilder pour la condition >= sur la date
    const ventesMois = await this.ventesRepository
      .createQueryBuilder('vente')
      .leftJoinAndSelect('vente.lignes', 'lignes')
      .where('vente.date >= :monthStart', { monthStart })
      .getMany();

    const totalMois = ventesMois.reduce((sum, v) => sum + Number(v.total), 0);

    // Calculer le bénéfice du mois
    let beneficeMois = 0;
    console.log('Nombre de ventes du mois:', ventesMois.length);

    for (const vente of ventesMois) {
      console.log('Vente:', vente.numero, 'Lignes:', vente.lignes?.length || 0);

      if (vente.lignes && Array.isArray(vente.lignes) && vente.lignes.length > 0) {
        for (const ligne of vente.lignes) {
          const prixAchat = Number(ligne.prixAchat) || 0;
          const prixUnitaire = Number(ligne.prixUnitaire) || 0;
          const quantite = Number(ligne.quantite) || 0;
          const beneficeLigne = (prixUnitaire - prixAchat) * quantite;

          console.log(`  Ligne: ${ligne.nom}, PA: ${prixAchat}, PV: ${prixUnitaire}, Qté: ${quantite}, Bénéfice: ${beneficeLigne}`);

          beneficeMois += beneficeLigne;
        }
      }
    }

    console.log('Bénéfice total du mois:', beneficeMois);

    // Calculer la dette totale du mois (montants restants)
    let detteMois = 0;
    for (const vente of ventesMois) {
      const montantRestant = Number(vente.montantRestant) || 0;
      console.log(`Dette vente ${vente.numero}:`, montantRestant);
      detteMois += montantRestant;
    }

    console.log('Dette totale du mois:', detteMois);

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

  async update(id: string, updateVenteDto: UpdateVenteDto): Promise<Vente> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const vente = await this.findOne(id);

      // Si les lignes sont mises à jour, gérer manuellement
      if (updateVenteDto.lignes && updateVenteDto.lignes.length > 0) {
        // Sauvegarder les anciennes lignes pour ajuster le stock
        const oldLignes = [...vente.lignes];

        // Rétablir le stock des anciennes lignes
        for (const ligne of oldLignes) {
          await this.stockService.incrementStock(ligne.articleId, ligne.quantite);
        }

        // Supprimer les anciennes lignes
        await queryRunner.manager.query(
          `DELETE FROM ligne_vente WHERE "venteId" = $1`,
          [id],
        );

        // Créer les nouvelles lignes et décrémenter le stock
        for (const ligneDto of updateVenteDto.lignes) {
          // Récupérer le prix d'achat si non fourni
          let prixAchat = ligneDto.prixAchat;
          if (!prixAchat) {
            const article = await this.stockService.findOne(ligneDto.articleId);
            prixAchat = Number(article.prixAchat) || 0;
          }

          await queryRunner.manager.query(
            `INSERT INTO ligne_vente
             ("venteId", "articleId", nom, quantite, "prixUnitaire", "prixAchat", "sousTotal")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id,
              ligneDto.articleId,
              ligneDto.nom,
              ligneDto.quantite,
              ligneDto.prixUnitaire,
              prixAchat,
              ligneDto.sousTotal,
            ],
          );

          // Décrémenter le stock
          await this.stockService.decrementStock(ligneDto.articleId, ligneDto.quantite);
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
          { id },
          otherFields,
        );

        // Si le client existe et que les montants ont changé, ajuster client
        if (vente.clientId && (otherFields.total !== undefined || otherFields.montantRestant !== undefined)) {
          const client = await this.clientRepository.findOne({
            where: { id: vente.clientId },
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
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const vente = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Restaurer le stock
      for (const item of vente.lignes) {
        await this.stockService.incrementStock(item.articleId, item.quantite);
      }

      // Mettre à jour le client si un clientId est fourni
      if (vente.clientId) {
        const client = await this.clientRepository.findOne({
          where: { id: vente.clientId },
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
}
