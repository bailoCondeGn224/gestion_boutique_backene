import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Approvisionnement, StatutApprovisionnement } from './entities/approvisionnement.entity';
import { LigneApprovisionnement } from './entities/ligne-approvisionnement.entity';
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
    @InjectRepository(LigneApprovisionnement)
    private ligneApprovisionnementRepository: Repository<LigneApprovisionnement>,
    private dataSource: DataSource,
    private mouvementsStockService: MouvementsStockService,
  ) {}

  async create(
    createDto: CreateApprovisionnementDto,
    organizationId: string,
  ): Promise<Approvisionnement> {
    // Fix Issue #13: Valider que total = sum(lignes.sousTotal)
    const calculatedTotal = createDto.lignes.reduce(
      (sum, ligne) => sum + Number(ligne.sousTotal),
      0,
    );

    if (Math.abs(Number(createDto.total) - calculatedTotal) > 0.01) {
      throw new BadRequestException(
        `Le total (${createDto.total} GNF) ne correspond pas à la somme des lignes (${calculatedTotal} GNF)`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // Fix Issue #7

    try {
      // Fix Issue #14: Générer numéro de manière atomique
      const numeroResult = await queryRunner.manager.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS INTEGER)), 0) + 1 as next_num
         FROM approvisionnement
         WHERE "organizationId" = $1`,
        [organizationId],
      );
      const numero = `APP-${numeroResult[0].next_num.toString().padStart(3, '0')}`;

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
        // Fix Issue #10: Verrouiller l'article avec SELECT FOR UPDATE
        const stockResult = await queryRunner.manager.query(
          `SELECT stock FROM article WHERE id = $1 AND "organizationId" = $2 FOR UPDATE`,
          [ligne.articleId, organizationId],
        );

        const stockAvant = stockResult[0]?.stock || 0;

        // Incrémenter le stock (même si stock = 0, on peut réapprovisionner)
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

        // Mettre à jour la date d'expiration si fournie dans la ligne
        if (ligne.dateExpiration || ligne.delaiAlerteExpiration) {
          const updates: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;

          if (ligne.dateExpiration) {
            updates.push(`"dateExpiration" = $${paramIndex++}`);
            values.push(ligne.dateExpiration);
          }

          if (ligne.delaiAlerteExpiration) {
            updates.push(`"delaiAlerteExpiration" = $${paramIndex++}`);
            values.push(ligne.delaiAlerteExpiration);
          }

          if (updates.length > 0) {
            values.push(ligne.articleId, organizationId);
            await queryRunner.manager.query(
              `UPDATE article SET ${updates.join(', ')}
               WHERE id = $${paramIndex++} AND "organizationId" = $${paramIndex}`,
              values,
            );
          }
        }

        // Enregistrer le mouvement de stock DANS LA MÊME TRANSACTION
        if (createDto.userId) {
          await queryRunner.manager.query(
            `INSERT INTO mouvement_stock
             ("articleId", "articleNom", type, motif, quantite, "stockAvant", "stockApres",
              "prixUnitaire", "valeurTotal", "userId", "userNom", "approvisionnementId",
              date, "organizationId", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13, NOW())`,
            [
              ligne.articleId,
              ligne.nom,
              TypeMouvement.ENTREE,
              MotifMouvement.APPROVISIONNEMENT,
              ligne.quantite,
              stockAvant,
              stockApres,
              ligne.prixUnitaire,
              ligne.sousTotal,
              createDto.userId,
              createDto.userNom,
              savedApprovisionnement.id,
              organizationId,
            ],
          );
        }
      }

      // Incrémenter totalAchats et totalPaye du fournisseur
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalAchats" = "totalAchats" + $1,
             "totalPaye" = "totalPaye" + $2,
             dette = ("totalAchats" + $1) - ("totalPaye" + $2)
         WHERE id = $3 AND "organizationId" = $4`,
        [createDto.total, montantPaye, createDto.fournisseurId, organizationId],
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
    const { page = 1, limit = 10, search, fournisseurId, dateDebut, dateFin, includeAnnules = false } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.approvisionnementRepository.createQueryBuilder('approvisionnement');

    // Charger les lignes pour afficher les articles (triées par ordre de création)
    queryBuilder.leftJoinAndSelect('approvisionnement.lignes', 'lignes');

    // Filtre par organization (toujours en premier avec .where())
    queryBuilder.where('approvisionnement.organizationId = :organizationId', { organizationId });

    // Par défaut, exclure les approvisionnements annulés (sauf si explicitement demandé)
    if (!includeAnnules) {
      queryBuilder.andWhere('approvisionnement.statut = :statut', { statut: 'VALIDE' });
    }

    // Filtre par recherche (numéro)
    if (search) {
      queryBuilder.andWhere('approvisionnement.numero ILIKE :search', { search: `%${search}%` });
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
    });

    if (!approvisionnement) {
      throw new NotFoundException(
        `Approvisionnement avec l'ID ${id} introuvable`,
      );
    }

    return approvisionnement;
  }

  async getApproLignes(
    approvisionnementId: string,
    organizationId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<LigneApprovisionnement>> {
    // Vérifier que l'approvisionnement existe et appartient à l'organisation
    const appro = await this.approvisionnementRepository.findOne({
      where: { id: approvisionnementId, organizationId },
    });

    if (!appro) {
      throw new NotFoundException(
        `Approvisionnement avec l'ID ${approvisionnementId} introuvable`,
      );
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.ligneApprovisionnementRepository.findAndCount({
      where: { approvisionnementId },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async findByFournisseur(
    fournisseurId: string,
    organizationId: string,
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<Approvisionnement>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.approvisionnementRepository.findAndCount({
      where: { fournisseurId, organizationId, statut: StatutApprovisionnement.VALIDE },
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
      where: { fournisseurId, organizationId, statut: StatutApprovisionnement.VALIDE },
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
    await queryRunner.startTransaction('SERIALIZABLE'); // Fix Issue #7

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
        const oldMontantPaye = Number(approvisionnement.montantPaye);

        // Recalculer montantRestant si nécessaire
        if (otherFields.total !== undefined || otherFields.montantPaye !== undefined) {
          const newTotal = otherFields.total ?? oldTotal;
          const newMontantPaye = otherFields.montantPaye ?? oldMontantPaye;

          // Fix Issue #5: Valider que total >= montantPaye
          if (newTotal < newMontantPaye) {
            throw new BadRequestException(
              `Le total (${newTotal} GNF) ne peut pas être inférieur au montant déjà payé (${newMontantPaye} GNF)`,
            );
          }

          otherFields.montantRestant = newTotal - newMontantPaye;
        }

        const newTotal = otherFields.total ?? oldTotal;
        const newMontantPaye = otherFields.montantPaye ?? oldMontantPaye;

        // Mettre à jour l'approvisionnement
        await queryRunner.manager.update(
          'approvisionnement',
          { id, organizationId },
          otherFields,
        );

        // Si le total OU le montantPaye a changé, ajuster le fournisseur
        if (otherFields.total !== undefined || otherFields.montantPaye !== undefined) {
          const diffTotal = newTotal - oldTotal;
          const diffMontantPaye = newMontantPaye - oldMontantPaye;

          await queryRunner.manager.query(
            `UPDATE fournisseur
             SET "totalAchats" = "totalAchats" + $1,
                 "totalPaye" = "totalPaye" + $2,
                 dette = ("totalAchats" + $1) - ("totalPaye" + $2)
             WHERE id = $3 AND "organizationId" = $4`,
            [diffTotal, diffMontantPaye, approvisionnement.fournisseurId, organizationId],
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

  /**
   * Annuler un approvisionnement (gardé pour traçabilité)
   * Vérifie que le stock est disponible avant d'annuler
   */
  async annuler(
    id: string,
    organizationId: string,
    motifAnnulation: string,
    userId?: string,
    userNom?: string,
  ): Promise<Approvisionnement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // Fix Issue #7

    try {
      const approvisionnement = await this.findOne(id, organizationId);

      // Vérifier que l'approvisionnement n'est pas déjà annulé
      if (approvisionnement.statut === 'ANNULE') {
        throw new BadRequestException(
          'Cet approvisionnement est déjà annulé',
        );
      }

      // Fix Issue #9: Vérifier qu'il n'y a pas de versements liés
      const versementsLies = await queryRunner.manager.query(
        `SELECT COUNT(*) as count FROM versement
         WHERE "approvisionnementId" = $1 AND "organizationId" = $2`,
        [id, organizationId],
      );

      if (versementsLies[0].count > 0) {
        throw new BadRequestException(
          `Impossible d'annuler cet approvisionnement : ${versementsLies[0].count} versement(s) associé(s). Supprimez d'abord les versements.`,
        );
      }

      // ========== VÉRIFICATION CRITIQUE ==========
      // Même logique de vérification que la suppression
      const articlesInsuffisants: string[] = [];

      for (const ligne of approvisionnement.lignes) {
        const article = await queryRunner.manager.query(
          `SELECT id, nom, stock FROM article WHERE id = $1 AND "organizationId" = $2`,
          [ligne.articleId, organizationId],
        );

        if (article.length === 0) {
          articlesInsuffisants.push(
            `Article ID ${ligne.articleId} introuvable`
          );
          continue;
        }

        const stockActuel = parseInt(article[0].stock);
        const quantiteARetirer = ligne.quantite;

        if (stockActuel < quantiteARetirer) {
          const quantiteVendue = quantiteARetirer - stockActuel;
          articlesInsuffisants.push(
            `"${article[0].nom}": ${quantiteVendue} article(s) déjà vendu(s) (stock: ${stockActuel}, besoin: ${quantiteARetirer})`
          );
        }
      }

      // Si des articles ont un stock insuffisant, BLOQUER l'annulation
      if (articlesInsuffisants.length > 0) {
        throw new BadRequestException(
          `❌ Annulation impossible - Des articles ont déjà été vendus:\n\n` +
          articlesInsuffisants.map(msg => `  • ${msg}`).join('\n') +
          `\n\n💡 Vous ne pouvez annuler un approvisionnement que si TOUS les articles sont encore en stock.`
        );
      }

      // ========== SUPPRESSION DES MOUVEMENTS DE STOCK ==========
      await queryRunner.manager.query(
        `DELETE FROM mouvement_stock WHERE "approvisionnementId" = $1 AND "organizationId" = $2`,
        [id, organizationId],
      );

      // ========== RESTAURATION DU STOCK ==========
      for (const ligne of approvisionnement.lignes) {
        await queryRunner.manager.query(
          `UPDATE article SET stock = stock - $1 WHERE id = $2 AND "organizationId" = $3`,
          [ligne.quantite, ligne.articleId, organizationId],
        );
      }

      // ========== MISE À JOUR DU FOURNISSEUR ==========
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalAchats" = "totalAchats" - $1,
             "totalPaye" = "totalPaye" - $2,
             dette = ("totalAchats" - $1) - ("totalPaye" - $2)
         WHERE id = $3 AND "organizationId" = $4`,
        [approvisionnement.total, approvisionnement.montantPaye, approvisionnement.fournisseurId, organizationId],
      );

      // ========== SUPPRESSION DE LA TRANSACTION FINANCIÈRE ==========
      await queryRunner.manager.query(
        `DELETE FROM transaction WHERE "approvisionnementId" = $1 AND "organizationId" = $2`,
        [id, organizationId],
      );

      // ========== MARQUER COMME ANNULÉ ==========
      await queryRunner.manager.query(
        `UPDATE approvisionnement
         SET statut = 'ANNULE',
             "montantPaye" = 0,
             "montantRestant" = 0,
             "annuleLe" = CURRENT_TIMESTAMP,
             "annulePar" = $1,
             "motifAnnulation" = $2
         WHERE id = $3 AND "organizationId" = $4`,
        [userNom || userId || 'Système', motifAnnulation, id, organizationId],
      );

      await queryRunner.commitTransaction();

      // Retourner l'approvisionnement mis à jour
      return this.findOne(id, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Erreur lors de l'annulation de l'approvisionnement: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Supprimer définitivement un approvisionnement
   * ATTENTION: Supprime complètement l'enregistrement (perte d'historique)
   * Préférer annuler() pour garder la traçabilité
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approvisionnement = await this.findOne(id, organizationId);

      // ========== VÉRIFICATION CRITIQUE ==========
      // Vérifier que le stock actuel permet la suppression pour CHAQUE article
      const articlesInsuffisants: string[] = [];

      for (const ligne of approvisionnement.lignes) {
        const article = await queryRunner.manager.query(
          `SELECT id, nom, stock FROM article WHERE id = $1 AND "organizationId" = $2`,
          [ligne.articleId, organizationId],
        );

        if (article.length === 0) {
          articlesInsuffisants.push(
            `Article ID ${ligne.articleId} introuvable`
          );
          continue;
        }

        const stockActuel = parseInt(article[0].stock);
        const quantiteARetirer = ligne.quantite;

        // Si le stock actuel est inférieur à la quantité approvisionnée,
        // cela signifie que des articles ont été vendus
        if (stockActuel < quantiteARetirer) {
          const quantiteVendue = quantiteARetirer - stockActuel;
          articlesInsuffisants.push(
            `"${article[0].nom}": ${quantiteVendue} article(s) déjà vendu(s) (stock: ${stockActuel}, besoin: ${quantiteARetirer})`
          );
        }
      }

      // Si des articles ont un stock insuffisant, BLOQUER la suppression
      if (articlesInsuffisants.length > 0) {
        throw new BadRequestException(
          `❌ Suppression impossible - Des articles ont déjà été vendus:\n\n` +
          articlesInsuffisants.map(msg => `  • ${msg}`).join('\n') +
          `\n\n💡 Vous ne pouvez supprimer un approvisionnement que si TOUS les articles sont encore en stock.`
        );
      }

      // ========== SUPPRESSION DES MOUVEMENTS DE STOCK ==========
      // Supprimer les mouvements de stock liés à cet approvisionnement
      await queryRunner.manager.query(
        `DELETE FROM mouvement_stock WHERE "approvisionnementId" = $1 AND "organizationId" = $2`,
        [id, organizationId],
      );

      // ========== RESTAURATION DU STOCK ==========
      // Maintenant on peut retirer le stock en toute sécurité
      for (const ligne of approvisionnement.lignes) {
        await queryRunner.manager.query(
          `UPDATE article SET stock = stock - $1 WHERE id = $2 AND "organizationId" = $3`,
          [ligne.quantite, ligne.articleId, organizationId],
        );
      }

      // Mettre à jour le fournisseur (diminuer totalAchats, totalPaye et recalculer dette)
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalAchats" = "totalAchats" - $1,
             "totalPaye" = "totalPaye" - $2,
             dette = ("totalAchats" - $1) - ("totalPaye" - $2)
         WHERE id = $3 AND "organizationId" = $4`,
        [approvisionnement.total, approvisionnement.montantPaye, approvisionnement.fournisseurId, organizationId],
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
