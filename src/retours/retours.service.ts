import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CreateRetourClientDto } from './dto/create-retour-client.dto';
import { CreateRetourFournisseurDto } from './dto/create-retour-fournisseur.dto';
import { LigneRetourDto } from './dto/ligne-retour.dto';
import { Vente } from '../ventes/entities/vente.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { Approvisionnement } from '../approvisionnements/entities/approvisionnement.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { Client } from '../clients/entities/client.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';
import { Article } from '../stock/entities/article.entity';
import { Transaction, CategorieTransaction, TypeTransaction } from '../finances/entities/transaction.entity';
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service';
import {
  TypeMouvement,
  MotifMouvement,
} from '../mouvements-stock/entities/mouvement-stock.entity';
import { ModeRemboursement } from './enums/mode-remboursement.enum';
import {
  RetourClientResponse,
  RetourFournisseurResponse,
  StockUpdate,
} from './interfaces/retour-response.interface';
import { RetoursValidator } from '../validation/retours.validator';

@Injectable()
export class RetoursService {
  constructor(
    @InjectRepository(Vente)
    private venteRepository: Repository<Vente>,
    @InjectRepository(LigneVente)
    private ligneVenteRepository: Repository<LigneVente>,
    @InjectRepository(Approvisionnement)
    private approvisionnementRepository: Repository<Approvisionnement>,
    @InjectRepository(LigneApprovisionnement)
    private ligneApprovisionnementRepository: Repository<LigneApprovisionnement>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Fournisseur)
    private fournisseurRepository: Repository<Fournisseur>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
    private mouvementsStockService: MouvementsStockService,
    private retoursValidator: RetoursValidator,
  ) {}

  async createRetourClient(
    dto: CreateRetourClientDto,
    organizationId: string,
  ): Promise<RetourClientResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Charger et valider vente
      const vente = await queryRunner.manager.findOne(Vente, {
        where: { id: dto.venteId, organizationId },
        relations: ['lignes'],
      });

      if (!vente) {
        throw new NotFoundException(`Vente ${dto.venteId} introuvable`);
      }

      // 2. Valider quantités (avec vérification des retours précédents)
      await this.retoursValidator.validateRetourClientQuantities(
        dto.venteId,
        dto.lignes,
        organizationId,
        queryRunner,
      );

      const mouvements = [];
      const stockUpdates: StockUpdate[] = [];

      // 3. Traiter chaque article retourné
      for (const ligne of dto.lignes) {
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: ligne.articleId, organizationId },
        });

        if (!article) {
          throw new NotFoundException(`Article ${ligne.articleId} introuvable`);
        }

        const stockAvant = article.stock;
        const stockApres = stockAvant + ligne.quantite;

        // Incrémenter le stock
        await queryRunner.manager.query(
          `UPDATE article SET stock = stock + $1 WHERE id = $2 AND "organizationId" = $3`,
          [ligne.quantite, ligne.articleId, organizationId],
        );

        // Créer mouvement de stock
        const mouvement = await this.mouvementsStockService.create(
          {
            articleId: ligne.articleId,
            articleNom: ligne.nom,
            type: TypeMouvement.ENTREE,
            motif: MotifMouvement.RETOUR_CLIENT,
            quantite: ligne.quantite,
            stockAvant: stockAvant,
            stockApres: stockApres,
            prixUnitaire: ligne.prixUnitaire,
            valeurTotal: ligne.sousTotal,
            userId: dto.userId,
            userNom: dto.userNom,
            venteId: dto.venteId,
            reference: vente.numero,
            note: ligne.noteArticle || dto.note,
            date: new Date(),
          },
          organizationId,
        );

        mouvements.push(mouvement);
        stockUpdates.push({
          articleId: ligne.articleId,
          articleNom: ligne.nom,
          stockAvant,
          stockApres,
        });
      }

      // 4. Ajuster finances client
      let clientUpdated = false;
      let nouveauTotalAchats: number | undefined;
      let nouveauTotalCredits: number | undefined;

      if (vente.clientId) {
        const client = await queryRunner.manager.findOne(Client, {
          where: { id: vente.clientId, organizationId },
        });

        if (!client) {
          throw new NotFoundException(`Client ${vente.clientId} introuvable`);
        }

        nouveauTotalAchats = Number(client.totalAchats) - dto.total;

        if (dto.modeRemboursement === ModeRemboursement.CREDIT_COMPTE) {
          nouveauTotalCredits = Number(client.totalCredits) - dto.total;

          await queryRunner.manager.update(Client, vente.clientId, {
            totalAchats: Math.max(0, nouveauTotalAchats),
            totalCredits: Math.max(0, nouveauTotalCredits),
          });
        } else {
          await queryRunner.manager.update(Client, vente.clientId, {
            totalAchats: Math.max(0, nouveauTotalAchats),
          });
        }

        clientUpdated = true;
      }

      // 5. Créer transaction pour remboursements cash/mobile/virement
      if (dto.modeRemboursement !== ModeRemboursement.CREDIT_COMPTE) {
        await queryRunner.manager.query(
          `INSERT INTO transaction
           (description, montant, type, categorie, date, "venteId", "organizationId")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            `Retour client - Vente ${vente.numero}`,
            dto.total,
            TypeTransaction.OUT,
            CategorieTransaction.RETOUR_CLIENT,
            new Date(),
            dto.venteId,
            organizationId,
          ],
        );
      }

      await queryRunner.commitTransaction();

      return {
        mouvements,
        updatedStock: stockUpdates,
        financialSummary: {
          totalRembourse: dto.total,
          modeRemboursement: dto.modeRemboursement,
          clientId: vente.clientId,
          clientUpdated,
          nouveauTotalAchats: nouveauTotalAchats
            ? Math.max(0, nouveauTotalAchats)
            : undefined,
          nouveauTotalCredits: nouveauTotalCredits
            ? Math.max(0, nouveauTotalCredits)
            : undefined,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createRetourFournisseur(
    dto: CreateRetourFournisseurDto,
    organizationId: string,
  ): Promise<RetourFournisseurResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Charger et valider approvisionnement
      const approvisionnement = await queryRunner.manager.findOne(
        Approvisionnement,
        {
          where: { id: dto.approvisionnementId, organizationId },
          relations: ['lignes'],
        },
      );

      if (!approvisionnement) {
        throw new NotFoundException(
          `Approvisionnement ${dto.approvisionnementId} introuvable`,
        );
      }

      // 2. Valider quantités (avec vérification des retours précédents)
      await this.retoursValidator.validateRetourFournisseurQuantities(
        dto.approvisionnementId,
        dto.lignes,
        organizationId,
        queryRunner,
      );

      const mouvements = [];
      const stockUpdates: StockUpdate[] = [];

      // 3. Traiter chaque article retourné
      for (const ligne of dto.lignes) {
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: ligne.articleId, organizationId },
        });

        if (!article) {
          throw new NotFoundException(`Article ${ligne.articleId} introuvable`);
        }

        const stockAvant = article.stock;

        // Valider stock disponible
        if (stockAvant < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${ligne.nom}. ` +
              `Disponible: ${stockAvant}, Demandé: ${ligne.quantite}`,
          );
        }

        const stockApres = stockAvant - ligne.quantite;

        // Décrémenter le stock
        await queryRunner.manager.query(
          `UPDATE article SET stock = stock - $1 WHERE id = $2 AND "organizationId" = $3`,
          [ligne.quantite, ligne.articleId, organizationId],
        );

        // Créer mouvement de stock
        const mouvement = await this.mouvementsStockService.create(
          {
            articleId: ligne.articleId,
            articleNom: ligne.nom,
            type: TypeMouvement.SORTIE,
            motif: MotifMouvement.RETOUR_FOURNISSEUR,
            quantite: ligne.quantite,
            stockAvant: stockAvant,
            stockApres: stockApres,
            prixUnitaire: ligne.prixUnitaire,
            valeurTotal: ligne.sousTotal,
            userId: dto.userId,
            userNom: dto.userNom,
            approvisionnementId: dto.approvisionnementId,
            reference: approvisionnement.numero,
            note: ligne.noteArticle || dto.note,
            date: new Date(),
          },
          organizationId,
        );

        mouvements.push(mouvement);
        stockUpdates.push({
          articleId: ligne.articleId,
          articleNom: ligne.nom,
          stockAvant,
          stockApres,
        });
      }

      // 4. Ajuster finances fournisseur
      const fournisseur = await queryRunner.manager.findOne(Fournisseur, {
        where: { id: approvisionnement.fournisseurId, organizationId },
      });

      if (!fournisseur) {
        throw new NotFoundException(
          `Fournisseur ${approvisionnement.fournisseurId} introuvable`,
        );
      }

      const nouveauTotalAchats = Number(fournisseur.totalAchats) - dto.total;
      const nouvelleDette =
        nouveauTotalAchats - Number(fournisseur.totalPaye);

      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalAchats" = $1, dette = $2
         WHERE id = $3 AND "organizationId" = $4`,
        [
          Math.max(0, nouveauTotalAchats),
          Math.max(0, nouvelleDette),
          approvisionnement.fournisseurId,
          organizationId,
        ],
      );

      // 5. Créer transaction si remboursement reçu
      const montantRembourse = dto.montantRembourse || dto.total;

      if (dto.remboursementRecu) {
        await queryRunner.manager.query(
          `INSERT INTO transaction
           (description, montant, type, categorie, date, "approvisionnementId", "organizationId")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            `Retour fournisseur - ${approvisionnement.numero} - ${approvisionnement.fournisseurNom}`,
            montantRembourse,
            TypeTransaction.IN,
            CategorieTransaction.RETOUR_FOURNISSEUR,
            new Date(),
            dto.approvisionnementId,
            organizationId,
          ],
        );
      }

      await queryRunner.commitTransaction();

      return {
        mouvements,
        updatedStock: stockUpdates,
        financialSummary: {
          totalRetourne: dto.total,
          fournisseurId: approvisionnement.fournisseurId,
          fournisseurUpdated: true,
          nouveauTotalAchats: Math.max(0, nouveauTotalAchats),
          nouvelleDette: Math.max(0, nouvelleDette),
          remboursementRecu: dto.remboursementRecu || false,
          montantRembourse: dto.remboursementRecu
            ? montantRembourse
            : undefined,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Les méthodes de validation ont été déplacées vers RetoursValidator
  // pour une meilleure séparation des responsabilités et réutilisabilité

  /**
   * Récupérer l'historique des retours clients
   */
  async getRetoursClients(organizationId: string, page: number = 1, limit: number = 50) {
    const mouvements = await this.mouvementsStockService.findAll(organizationId, {
      page,
      limit,
      motif: MotifMouvement.RETOUR_CLIENT,
    });

    return {
      data: mouvements.data,
      total: mouvements.meta.total,
      page: mouvements.meta.page,
      limit: mouvements.meta.limit,
      totalPages: mouvements.meta.totalPages,
    };
  }

  /**
   * Récupérer les statistiques des retours clients
   */
  async getStatsRetoursClients(organizationId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'totalRetours')
      .addSelect('SUM(ms."valeurTotal")', 'montantTotal')
      .addSelect('COUNT(DISTINCT DATE(ms.date))', 'joursActifs')
      .from('mouvement_stock', 'ms')
      .where('ms."organizationId" = :organizationId', { organizationId })
      .andWhere('ms.motif = :motif', { motif: MotifMouvement.RETOUR_CLIENT })
      .getRawOne();

    // Calculer les retours du mois en cours
    const currentMonth = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .addSelect('SUM(ms."valeurTotal")', 'montant')
      .from('mouvement_stock', 'ms')
      .where('ms."organizationId" = :organizationId', { organizationId })
      .andWhere('ms.motif = :motif', { motif: MotifMouvement.RETOUR_CLIENT })
      .andWhere('EXTRACT(MONTH FROM ms.date) = EXTRACT(MONTH FROM CURRENT_DATE)')
      .andWhere('EXTRACT(YEAR FROM ms.date) = EXTRACT(YEAR FROM CURRENT_DATE)')
      .getRawOne();

    return {
      totalRetours: parseInt(result.totalRetours) || 0,
      montantTotal: parseFloat(result.montantTotal) || 0,
      retoursCeMois: parseInt(currentMonth.count) || 0,
      montantCeMois: parseFloat(currentMonth.montant) || 0,
    };
  }

  /**
   * Récupérer l'historique des retours fournisseurs
   */
  async getRetoursFournisseurs(organizationId: string, page: number = 1, limit: number = 50) {
    const mouvements = await this.mouvementsStockService.findAll(organizationId, {
      page,
      limit,
      motif: MotifMouvement.RETOUR_FOURNISSEUR,
    });

    return {
      data: mouvements.data,
      total: mouvements.meta.total,
      page: mouvements.meta.page,
      limit: mouvements.meta.limit,
      totalPages: mouvements.meta.totalPages,
    };
  }

  /**
   * Récupérer les statistiques des retours fournisseurs
   */
  async getStatsRetoursFournisseurs(organizationId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'totalRetours')
      .addSelect('SUM(ms."valeurTotal")', 'montantTotal')
      .addSelect('COUNT(DISTINCT DATE(ms.date))', 'joursActifs')
      .from('mouvement_stock', 'ms')
      .where('ms."organizationId" = :organizationId', { organizationId })
      .andWhere('ms.motif = :motif', { motif: MotifMouvement.RETOUR_FOURNISSEUR })
      .getRawOne();

    // Calculer les retours du mois en cours
    const currentMonth = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .addSelect('SUM(ms."valeurTotal")', 'montant')
      .from('mouvement_stock', 'ms')
      .where('ms."organizationId" = :organizationId', { organizationId })
      .andWhere('ms.motif = :motif', { motif: MotifMouvement.RETOUR_FOURNISSEUR })
      .andWhere('EXTRACT(MONTH FROM ms.date) = EXTRACT(MONTH FROM CURRENT_DATE)')
      .andWhere('EXTRACT(YEAR FROM ms.date) = EXTRACT(YEAR FROM CURRENT_DATE)')
      .getRawOne();

    // Calculer le montant remboursé (depuis les transactions)
    const remboursements = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.montant)', 'montantRembourse')
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.categorie = :categorie', { categorie: CategorieTransaction.RETOUR_FOURNISSEUR })
      .andWhere('t.type = :type', { type: TypeTransaction.IN })
      .getRawOne();

    return {
      totalRetours: parseInt(result.totalRetours) || 0,
      montantTotal: parseFloat(result.montantTotal) || 0,
      retoursCeMois: parseInt(currentMonth.count) || 0,
      montantRembourse: parseFloat(remboursements.montantRembourse) || 0,
    };
  }
}
