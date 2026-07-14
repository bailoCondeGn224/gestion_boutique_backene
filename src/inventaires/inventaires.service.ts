import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Inventaire, StatutInventaire } from './entities/inventaire.entity';
import { ComptageInventaire } from './entities/comptage-inventaire.entity';
import { Article } from '../stock/entities/article.entity';
import {
  MouvementStock,
  TypeMouvement,
  MotifMouvement,
} from '../mouvements-stock/entities/mouvement-stock.entity';
import { CreateInventaireDto } from './dto/create-inventaire.dto';
import { AddComptageDto } from './dto/add-comptage.dto';
import { DepensesService } from '../depenses/depenses.service';
import { Response } from 'express';

@Injectable()
export class InventairesService {
  constructor(
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
    @InjectRepository(ComptageInventaire)
    private comptageRepository: Repository<ComptageInventaire>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(MouvementStock)
    private mouvementRepository: Repository<MouvementStock>,
    private dataSource: DataSource,
    private depensesService: DepensesService,
  ) {}

  /**
   * Valider qu'il n'y a pas de chevauchement de périodes avec d'autres inventaires
   * @private
   *
   * Utilise des intervalles semi-ouverts [dateDebut, dateFin) où dateFin est exclue.
   * Cela permet à deux inventaires de se "toucher" sans se chevaucher.
   * Exemple : Inventaire A [1 mai, 15 mai) et Inventaire B [15 mai, 30 mai) → OK
   */
  private async validateNoChevauchement(
    organizationId: string,
    dateDebut: Date,
    dateFin: Date,
    inventaireIdActuel: string,
  ): Promise<void> {
    // Chercher les inventaires qui ont des finances calculées et dont la période chevauche
    const inventaireChevauchant = await this.inventaireRepository
      .createQueryBuilder('inv')
      .where('inv.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('inv.id != CAST(:inventaireIdActuel AS uuid)', { inventaireIdActuel })
      .andWhere('inv.financesCalcules = true')
      .andWhere(
        // Chevauchement avec intervalles semi-ouverts [dateDebut, dateFin)
        // Deux intervalles se chevauchent si : dateDebut < dateFin_autre AND dateFin > dateDebut_autre
        // Les périodes qui se touchent exactement sur une borne ne sont PAS considérées comme chevauchantes
        `(:dateDebut < inv."dateFin" AND :dateFin > inv."dateDebut")`,
        { dateDebut, dateFin },
      )
      .getOne();

    if (inventaireChevauchant) {
      const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

      throw new BadRequestException(
        `Impossible de calculer les finances pour cette période. ` +
        `La période sélectionnée (${formatDate(dateDebut)} au ${formatDate(dateFin)} exclu) ` +
        `chevauche avec un inventaire déjà clôturé ` +
        `(${formatDate(inventaireChevauchant.dateDebut)} au ${formatDate(inventaireChevauchant.dateFin)} exclu). ` +
        `Les périodes d'inventaires ne peuvent pas se chevaucher pour garantir ` +
        `que chaque dépense et vente soit comptabilisée dans un seul inventaire. ` +
        `Vous pouvez créer un inventaire à partir du ${formatDate(inventaireChevauchant.dateFin)}.`,
      );
    }
  }

  /**
   * Créer un nouvel inventaire
   * Compte automatiquement le nombre total d'articles actifs
   */
  async create(
    createInventaireDto: CreateInventaireDto,
    userId: string,
    organizationId: string,
    responsableNom: string,
  ): Promise<Inventaire> {
    // Récupérer le dernier inventaire terminé
    const dernierInventaire = await this.inventaireRepository.findOne({
      where: { organizationId, statut: StatutInventaire.TERMINE },
      order: { date: 'DESC' },
    });

    // Vérifier que la date n'est pas dans le futur
    if (createInventaireDto.date) {
      const dateInventaire = new Date(createInventaireDto.date);
      const maintenant = new Date();

      if (dateInventaire > maintenant) {
        throw new BadRequestException(
          'Impossible de créer un inventaire pour une date future',
        );
      }

      // Vérifier que la date n'est pas antérieure au dernier inventaire
      if (dernierInventaire && dateInventaire < dernierInventaire.date) {
        const dateFormat = new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(dernierInventaire.date);

        throw new BadRequestException(
          `Un inventaire a déjà été fait le ${dateFormat}. Vous ne pouvez pas créer un inventaire avec une date antérieure.`,
        );
      }

      // Vérifier qu'il n'y a pas de chevauchement avec un inventaire déjà clôturé
      // Calculer temporairement dateDebut/dateFin comme dans calculerFinances
      const dateFin = dateInventaire;
      let dateDebut: Date;

      if (dernierInventaire) {
        dateDebut = dernierInventaire.date;
      } else {
        dateDebut = new Date(dateFin);
        dateDebut.setDate(dateDebut.getDate() - 30);
      }

      // Valider le non-chevauchement (on utilise un ID temporaire car l'inventaire n'existe pas encore)
      await this.validateNoChevauchement(organizationId, dateDebut, dateFin, '00000000-0000-0000-0000-000000000000');
    }

    // Compter le nombre total d'articles actifs dans l'organisation
    const totalArticles = await this.articleRepository.count({
      where: { organizationId },
    });

    const inventaire = this.inventaireRepository.create({
      ...createInventaireDto,
      date: createInventaireDto.date ? new Date(createInventaireDto.date) : undefined,
      organizationId,
      responsableId: userId,
      responsableNom,
      totalArticles,
      statut: StatutInventaire.EN_COURS,
    });

    return this.inventaireRepository.save(inventaire);
  }

  /**
   * Liste les inventaires d'une organisation
   */
  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Inventaire[]; meta: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.inventaireRepository.findAndCount({
      where: { organizationId },
      relations: ['responsable', 'comptages'],
      order: { date: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Retourne la date minimale autorisée pour un nouvel inventaire
   * (date du dernier inventaire terminé + 1 jour)
   */
  async getDateMin(organizationId: string): Promise<{ dateMin: string | null }> {
    const dernierInventaire = await this.inventaireRepository.findOne({
      where: { organizationId, statut: StatutInventaire.TERMINE },
      order: { date: 'DESC' },
    });

    if (!dernierInventaire) {
      return { dateMin: null }; // Aucun inventaire précédent, pas de limite
    }

    // Retourner la date du dernier inventaire (on peut créer à partir de cette date)
    return { dateMin: dernierInventaire.date.toISOString() };
  }

  /**
   * Détails d'un inventaire avec ses comptages et statistiques
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const inventaire = await this.inventaireRepository.findOne({
      where: { id, organizationId },
      relations: ['responsable', 'comptages', 'comptages.article'],
    });

    if (!inventaire) {
      throw new NotFoundException('Inventaire non trouvé');
    }

    // Calculer les statistiques des écarts
    let articlesManquants = 0;
    let articlesSurplus = 0;
    let valeurPertes = 0;
    let valeurSurplus = 0;

    for (const comptage of inventaire.comptages || []) {
      if (comptage.ecart < 0) {
        articlesManquants += Math.abs(comptage.ecart);
        valeurPertes += Math.abs(comptage.ecart) * (comptage.article?.prixAchat || 0);
      } else if (comptage.ecart > 0) {
        articlesSurplus += comptage.ecart;
        valeurSurplus += comptage.ecart * (comptage.article?.prixAchat || 0);
      }
    }

    return {
      ...inventaire,
      statistiques: {
        articlesManquants,
        articlesSurplus,
        valeurPertes: Math.round(valeurPertes),
        valeurSurplus: Math.round(valeurSurplus),
        valeurNetteEcart: Math.round(valeurSurplus - valeurPertes),
      },
    };
  }

  /**
   * Ajouter un comptage d'article
   */
  async addComptage(
    inventaireId: string,
    addComptageDto: AddComptageDto,
    organizationId: string,
    comptePar: string,
  ): Promise<ComptageInventaire> {
    // Vérifier que l'inventaire existe et est EN_COURS
    const inventaire = await this.inventaireRepository.findOne({
      where: { id: inventaireId, organizationId },
    });

    if (!inventaire) {
      throw new NotFoundException('Inventaire non trouvé');
    }

    if (inventaire.statut !== StatutInventaire.EN_COURS) {
      throw new BadRequestException(
        'Impossible de compter: l\'inventaire est terminé',
      );
    }

    // Récupérer l'article et son stock actuel
    const article = await this.articleRepository.findOne({
      where: { id: addComptageDto.articleId, organizationId },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé');
    }

    // Vérifier si l'article n'a pas déjà été compté
    const comptageExistant = await this.comptageRepository.findOne({
      where: {
        inventaireId,
        articleId: addComptageDto.articleId,
      },
    });

    if (comptageExistant) {
      throw new BadRequestException('Cet article a déjà été compté');
    }

    // Calculer l'écart: quantiteComptee - quantiteSysteme
    const ecart = addComptageDto.quantiteComptee - article.stock;

    // Créer le comptage
    const comptage = this.comptageRepository.create({
      inventaireId,
      articleId: article.id,
      articleNom: article.nom,
      quantiteSysteme: article.stock,
      quantiteComptee: addComptageDto.quantiteComptee,
      ecart,
      note: addComptageDto.note,
      comptePar,
    });

    await this.comptageRepository.save(comptage);

    // Mettre à jour les compteurs de l'inventaire
    await this.updateInventaireStats(inventaireId);

    return comptage;
  }

  /**
   * Mettre à jour les statistiques d'un inventaire
   */
  private async updateInventaireStats(inventaireId: string): Promise<void> {
    const comptages = await this.comptageRepository.find({
      where: { inventaireId },
    });

    const articlesComptes = comptages.length;
    const articlesAvecEcarts = comptages.filter((c) => c.ecart !== 0).length;

    await this.inventaireRepository.update(inventaireId, {
      articlesComptes,
      articlesAvecEcarts,
    });
  }

  /**
   * Récupérer les écarts d'un inventaire avec statistiques
   */
  async getEcarts(
    inventaireId: string,
    organizationId: string,
  ): Promise<any> {
    const inventaire = await this.inventaireRepository.findOne({
      where: { id: inventaireId, organizationId },
    });

    if (!inventaire) {
      throw new NotFoundException('Inventaire non trouvé');
    }

    const comptages = await this.comptageRepository.find({
      where: { inventaireId },
      relations: ['article'],
      order: { ecart: 'ASC' },
    });

    // Calculer les statistiques
    let articlesManquants = 0;
    let articlesSurplus = 0;
    let valeurPertes = 0;
    let valeurSurplus = 0;

    for (const comptage of comptages) {
      if (comptage.ecart < 0) {
        articlesManquants += Math.abs(comptage.ecart);
        valeurPertes += Math.abs(comptage.ecart) * (comptage.article?.prixAchat || 0);
      } else if (comptage.ecart > 0) {
        articlesSurplus += comptage.ecart;
        valeurSurplus += comptage.ecart * (comptage.article?.prixAchat || 0);
      }
    }

    return {
      comptages,
      statistiques: {
        articlesManquants,
        articlesSurplus,
        valeurPertes: Math.round(valeurPertes),
        valeurSurplus: Math.round(valeurSurplus),
        valeurNetteEcart: Math.round(valeurSurplus - valeurPertes),
      },
    };
  }

  /**
   * Valider un inventaire et ajuster les stocks
   * - Marque l'inventaire comme TERMINE
   * - Crée des mouvements de stock AJUSTEMENT_INVENTAIRE
   * - Met à jour les quantités dans Article
   */
  async valider(
    inventaireId: string,
    organizationId: string,
    userId: string,
  ): Promise<Inventaire> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Vérifier l'inventaire
      const inventaire = await queryRunner.manager.findOne(Inventaire, {
        where: { id: inventaireId, organizationId },
      });

      if (!inventaire) {
        throw new NotFoundException('Inventaire non trouvé');
      }

      if (inventaire.statut === StatutInventaire.TERMINE) {
        throw new BadRequestException('Inventaire déjà terminé');
      }

      // Récupérer tous les comptages
      const comptages = await queryRunner.manager.find(ComptageInventaire, {
        where: { inventaireId },
      });

      // Pour chaque comptage avec écart, créer ajustement et mettre à jour stock
      for (const comptage of comptages) {
        if (comptage.ecart === 0) {
          continue; // Pas d'ajustement nécessaire
        }

        // Récupérer l'article
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: comptage.articleId, organizationId },
        });

        if (!article) {
          continue; // Article supprimé entre-temps
        }

        const stockAvant = article.stock;
        const stockApres = comptage.quantiteComptee;
        const quantite = Math.abs(comptage.ecart);
        const prixUnitaire = article.prixAchat || 0;

        // Créer le mouvement de stock
        const mouvement = queryRunner.manager.create(MouvementStock, {
          organizationId,
          articleId: article.id,
          articleNom: article.nom,
          type: comptage.ecart > 0 ? TypeMouvement.ENTREE : TypeMouvement.SORTIE,
          motif: MotifMouvement.AJUSTEMENT,
          quantite,
          stockAvant,
          stockApres,
          prixUnitaire,
          valeurTotal: quantite * prixUnitaire,
          reference: `INV-${inventaire.id.substring(0, 8)}`,
          note: comptage.note || 'Ajustement suite inventaire physique',
          userId,
          userNom: inventaire.responsableNom,
          date: new Date(),
        });

        await queryRunner.manager.save(mouvement);

        // Mettre à jour le stock de l'article
        await queryRunner.manager.update(Article, article.id, {
          stock: stockApres,
        });
      }

      // Marquer l'inventaire comme TERMINE
      await queryRunner.manager.update(Inventaire, inventaireId, {
        statut: StatutInventaire.TERMINE,
        termineLe: new Date(),
      });

      await queryRunner.commitTransaction();

      // Récupérer l'inventaire mis à jour
      return this.findOne(inventaireId, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculer les finances d'un inventaire
   * Calcule automatiquement : CA, CMV, dépenses, pertes, bénéfices
   */
  async calculerFinances(
    inventaireId: string,
    organizationId: string,
  ): Promise<Inventaire> {
    try {
      const inventaire = await this.findOne(inventaireId, organizationId);

    if (inventaire.statut !== StatutInventaire.TERMINE) {
      throw new BadRequestException(
        'Les finances ne peuvent être calculées que pour un inventaire terminé',
      );
    }

    // 1. Déterminer la période
    const dateFin = inventaire.date;
    let dateDebut: Date;

    // Trouver le dernier inventaire terminé avant celui-ci
    const inventairePrecedent = await this.inventaireRepository.findOne({
      where: { organizationId, statut: StatutInventaire.TERMINE },
      order: { date: 'DESC' },
      // Exclure l'inventaire actuel et ceux après
      // On utilise une query builder pour plus de contrôle
    });

    // Requête avec condition sur la date
    const precedent = await this.inventaireRepository
      .createQueryBuilder('inv')
      .where('inv.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('inv.statut = :statut', { statut: StatutInventaire.TERMINE })
      .andWhere('inv.date < :dateFin', { dateFin })
      .orderBy('inv.date', 'DESC')
      .getOne();

    if (precedent) {
      dateDebut = precedent.date;
    } else {
      // Pas d'inventaire précédent = prendre la date de création de l'organisation
      // ou une date par défaut (30 jours avant)
      dateDebut = new Date(dateFin);
      dateDebut.setDate(dateDebut.getDate() - 30);
    }

    const dureeJours = Math.ceil(
      (dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Valider qu'il n'y a pas de chevauchement avec d'autres inventaires
    await this.validateNoChevauchement(organizationId, dateDebut, dateFin, inventaireId);

    // 2. Calculer le CA et nombre de ventes
    // Utilise l'intervalle semi-ouvert [dateDebut, dateFin) : dateDebut incluse, dateFin exclue
    const ventesStats = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'nombreVentes')
      .addSelect('COALESCE(SUM(total), 0)', 'chiffreAffaires')
      .from('vente', 'v')
      .where('v."organizationId" = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('v.date >= :dateDebut AND v.date < :dateFin', {
        dateDebut,
        dateFin,
      })
      .getRawOne();

    const chiffreAffaires = parseFloat(ventesStats.chiffreAffaires);
    const nombreVentes = parseInt(ventesStats.nombreVentes);
    const panierMoyen = nombreVentes > 0 ? chiffreAffaires / nombreVentes : 0;

    // 3. Calculer le CMV (Coût Marchandises Vendues)
    // Somme des (quantité * prixAchat) pour toutes les lignes de vente de la période
    // Utilise l'intervalle semi-ouvert [dateDebut, dateFin) : dateDebut incluse, dateFin exclue
    const cmv = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(lv.quantite * a."prixAchat"), 0)', 'total')
      .from('ligne_vente', 'lv')
      .innerJoin('vente', 'v', 'CAST(v.id AS text) = CAST(lv."venteId" AS text)')
      .innerJoin('article', 'a', 'CAST(a.id AS text) = CAST(lv."articleId" AS text)')
      .where('v."organizationId" = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('v.date >= :dateDebut AND v.date < :dateFin', {
        dateDebut,
        dateFin,
      })
      .getRawOne();

    const coutMarchandises = parseFloat(cmv.total);

    // 4. Récupérer les dépenses par catégorie
    const isRecalcul = inventaire.financesCalcules;
    const depenses = await this.depensesService.getTotalsByCategorie(
      organizationId,
      dateDebut,
      dateFin,
      inventaireId,
      isRecalcul,
      inventaire.createdAt, // Passer la date de création pour filtrer les dépenses
    );

    // 5. Calculer les pertes (articles manquants/abîmés)
    const pertesStats = await this.comptageRepository
      .createQueryBuilder('c')
      .select('COALESCE(SUM(CASE WHEN c.ecart < 0 THEN ABS(c.ecart) * a."prixAchat" ELSE 0 END), 0)', 'valeurManquants')
      .innerJoin('article', 'a', 'CAST(a.id AS text) = CAST(c."articleId" AS text)')
      .where('c."inventaireId" = CAST(:inventaireId AS uuid)', { inventaireId })
      .getRawOne();

    const valeurArticlesManquants = parseFloat(pertesStats.valeurManquants);
    const valeurArticlesAbimes = 0; // À implémenter si nécessaire
    const totalPertes = valeurArticlesManquants + valeurArticlesAbimes;

    // 6. Calculer les bénéfices
    const beneficeBrut = chiffreAffaires - coutMarchandises;
    const tauxMarge = chiffreAffaires > 0 ? (beneficeBrut / chiffreAffaires) * 100 : 0;

    const beneficeNet =
      beneficeBrut - depenses.totalDepenses - totalPertes;
    const tauxRentabilite =
      chiffreAffaires > 0 ? (beneficeNet / chiffreAffaires) * 100 : 0;
    const estBeneficiaire = beneficeNet > 0;

    // 7. Mettre à jour l'inventaire
    await this.inventaireRepository.update(inventaireId, {
      dateDebut,
      dateFin,
      dureeJours,
      chiffreAffaires,
      nombreVentes,
      panierMoyen,
      coutMarchandises,
      beneficeBrut,
      tauxMarge,
      depensesFixes: depenses.depensesFixes,
      depensesVariables: depenses.depensesVariables,
      depensesExceptionnelles: depenses.depensesExceptionnelles,
      totalDepenses: depenses.totalDepenses,
      valeurArticlesManquants,
      valeurArticlesAbimes,
      totalPertes,
      beneficeNet,
      tauxRentabilite,
      estBeneficiaire,
      financesCalcules: true,
      financesCalculesLe: new Date(),
    });

    // 8. Attacher les dépenses à l'inventaire (seulement pour le premier calcul)
    if (!isRecalcul) {
      await this.depensesService.attacherAInventaire(
        organizationId,
        dateDebut,
        dateFin,
        inventaireId,
        inventaire.createdAt, // Passer la date de création pour filtrer par createdAt
      );
    }

    return this.findOne(inventaireId, organizationId);
  } catch (error) {
    throw error;
  }
}

  /**
   * Sauvegarder le PDF sur le disque pour debug
   */
  async savePDFToFile(
    inventaireId: string,
    organizationId: string,
  ): Promise<{ message: string; path: string }> {
    const inventaire = await this.findOne(inventaireId, organizationId);

    if (!inventaire.financesCalcules) {
      throw new BadRequestException(
        'Les finances doivent être calculées avant de générer le rapport',
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const path = require('path');

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filePath = path.join(process.cwd(), `rapport-${inventaireId}.pdf`);
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        // Contenu simple pour test
        doc.fontSize(20).text('RAPPORT FINANCIER', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Inventaire: ${inventaire.id}`);
        doc.text(`CA: ${inventaire.chiffreAffaires}`);
        doc.text(`Bénéfice Net: ${inventaire.beneficeNet}`);

        doc.end();

        writeStream.on('finish', () => {
          resolve({
            message: 'PDF sauvegardé avec succès',
            path: filePath,
          });
        });

        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Tester la génération PDF basique
   */
  async generateTestPDF(res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
            res.setHeader('Content-Length', pdfBuffer.length.toString());
            res.end(pdfBuffer);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        doc.on('error', reject);

        // Contenu minimal
        doc.fontSize(20).text('Test PDF', 100, 100);
        doc.text('Ceci est un test de génération PDF', 100, 150);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Récupérer les données financières pour génération PDF côté frontend
   */
  async getFinancesData(
    inventaireId: string,
    organizationId: string,
  ): Promise<Inventaire> {
    const inventaire = await this.findOne(inventaireId, organizationId);

    if (!inventaire.financesCalcules) {
      throw new BadRequestException(
        'Les finances doivent être calculées avant de générer le rapport',
      );
    }

    return inventaire;
  }

  /**
   * Générer un rapport PDF des finances d'un inventaire (OBSOLETE - PDF généré côté frontend)
   */
  async generateRapportPDF(
    inventaireId: string,
    organizationId: string,
    res: Response,
  ): Promise<void> {
    const inventaire = await this.findOne(inventaireId, organizationId);

    if (!inventaire.financesCalcules) {
      throw new BadRequestException(
        'Les finances doivent être calculées avant de générer le rapport',
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const PdfPrinter = require('pdfmake');
        const fs = require('fs');

        // Définir les fonts
        const fonts = {
          Roboto: {
            normal: require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Regular.ttf'],
            bold: require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Medium.ttf'],
          },
        };

        const printer = new PdfPrinter(fonts);

        // Helper pour formater les montants
        const formatMontant = (montant: number): string => {
          return new Intl.NumberFormat('fr-GN', {
            style: 'currency',
            currency: 'GNF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(montant);
        };

        // Helper pour formater les dates
        const formatDate = (date: Date | string): string => {
          return new Date(date).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        };

        // Définition du document PDF
        const docDefinition = {
          content: [
            // En-tête
            { text: 'RAPPORT FINANCIER', style: 'header', alignment: 'center' },
            { text: `Inventaire du ${formatDate(inventaire.date)}`, style: 'subheader', alignment: 'center', margin: [0, 10, 0, 5] },
            inventaire.note ? { text: inventaire.note, alignment: 'center', margin: [0, 0, 0, 20] } : {},

            // Période
            { text: 'Période analysée', style: 'sectionHeader', margin: [0, 20, 0, 10] },
            { text: `Du ${formatDate(inventaire.dateDebut)} au ${formatDate(inventaire.dateFin)}` },
            { text: `Durée : ${inventaire.dureeJours} jours`, margin: [0, 0, 0, 20] },

            // Résultats financiers
            { text: 'Résultats financiers', style: 'sectionHeader', margin: [0, 10, 0, 10] },
            {
              ul: [
                `Chiffre d'affaires : ${formatMontant(inventaire.chiffreAffaires)}`,
                `Nombre de ventes : ${inventaire.nombreVentes}`,
                `Panier moyen : ${formatMontant(inventaire.panierMoyen)}`,
                `Coût des marchandises vendues : ${formatMontant(inventaire.coutMarchandises)}`,
                `Bénéfice brut : ${formatMontant(inventaire.beneficeBrut)}`,
                `Taux de marge : ${inventaire.tauxMarge.toFixed(1)}%`,
              ],
              margin: [0, 0, 0, 20],
            },

            // Dépenses
            { text: 'Dépenses par catégorie', style: 'sectionHeader', margin: [0, 10, 0, 10] },
            {
              ul: [
                `Dépenses fixes : ${formatMontant(inventaire.depensesFixes)}`,
                `Dépenses variables : ${formatMontant(inventaire.depensesVariables)}`,
                `Dépenses exceptionnelles : ${formatMontant(inventaire.depensesExceptionnelles)}`,
              ],
            },
            { text: `Total des dépenses : ${formatMontant(inventaire.totalDepenses)}`, bold: true, margin: [0, 10, 0, 20] },

            // Pertes
            { text: 'Pertes d\'inventaire', style: 'sectionHeader', margin: [0, 10, 0, 10] },
            {
              ul: [
                `Articles manquants : ${formatMontant(inventaire.valeurArticlesManquants)}`,
                `Articles abîmés : ${formatMontant(inventaire.valeurArticlesAbimes)}`,
              ],
            },
            { text: `Total des pertes : ${formatMontant(inventaire.totalPertes)}`, bold: true, margin: [0, 10, 0, 20] },

            // Bénéfice net
            { text: 'BÉNÉFICE NET', style: 'header', color: inventaire.beneficeNet >= 0 ? 'green' : 'red', margin: [0, 20, 0, 10] },
            { text: formatMontant(inventaire.beneficeNet), fontSize: 24, bold: true, alignment: 'center', color: inventaire.beneficeNet >= 0 ? 'green' : 'red', margin: [0, 0, 0, 20] },

            // Indicateurs
            { text: 'Indicateurs de performance', style: 'sectionHeader', margin: [0, 10, 0, 10] },
            {
              ul: [
                `Taux de rentabilité : ${inventaire.tauxRentabilite.toFixed(1)}%`,
                `Statut : ${inventaire.estBeneficiaire ? 'Bénéficiaire' : 'Déficitaire'}`,
              ],
            },

            // Pied de page
            { text: `\n\nRapport généré le ${formatDate(new Date())} à ${new Date().toLocaleTimeString('fr-FR')}`, fontSize: 9, alignment: 'center', margin: [0, 30, 0, 5] },
            { text: 'Ce document est confidentiel et destiné à un usage interne uniquement.', fontSize: 8, alignment: 'center', italics: true },
          ],
          styles: {
            header: {
              fontSize: 22,
              bold: true,
            },
            subheader: {
              fontSize: 16,
            },
            sectionHeader: {
              fontSize: 14,
              bold: true,
              decoration: 'underline',
            },
          },
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=rapport-finances-${inventaire.id}.pdf`);
          res.setHeader('Content-Length', pdfBuffer.length.toString());
          res.end(pdfBuffer);
          resolve();
        });
        pdfDoc.on('error', reject);

        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Récupérer les statistiques du dashboard inventaires
   */
  async getDashboardStats(
    organizationId: string,
    filterDto?: any,
  ): Promise<any> {
    // Calculer la plage de dates selon le filtre
    let dateDebut: Date | undefined;
    let dateFin: Date | undefined;

    if (filterDto?.dateDebut && filterDto?.dateFin) {
      // Dates personnalisées
      dateDebut = new Date(filterDto.dateDebut);
      dateFin = new Date(filterDto.dateFin);
    } else if (filterDto?.periode && filterDto.periode !== 'tout') {
      // Période prédéfinie
      const moisEnArriere = parseInt(filterDto.periode);
      dateFin = new Date();
      dateDebut = new Date();
      dateDebut.setMonth(dateDebut.getMonth() - moisEnArriere);
    }
    // Si pas de filtre ou 'tout', dateDebut et dateFin restent undefined

    // Construire le where pour les filtres de date
    const whereWithDate: any = { organizationId };
    if (dateDebut && dateFin) {
      whereWithDate.dateFin = Between(dateDebut, dateFin);
    }

    // 1. Statistiques globales
    const totalInventaires = await this.inventaireRepository.count({
      where: whereWithDate,
    });

    const inventaireEnCours = await this.inventaireRepository.findOne({
      where: { organizationId, statut: StatutInventaire.EN_COURS },
      order: { createdAt: 'DESC' },
    });

    const dernierInventaire = await this.inventaireRepository.findOne({
      where: { organizationId, statut: StatutInventaire.TERMINE },
      order: { termineLe: 'DESC' },
    });

    // 2. Les 2 derniers inventaires terminés pour comparaison
    const whereComparaison: any = {
      organizationId,
      statut: StatutInventaire.TERMINE,
      financesCalcules: true
    };
    if (dateDebut && dateFin) {
      whereComparaison.dateFin = Between(dateDebut, dateFin);
    }
    const deuxDerniers = await this.inventaireRepository.find({
      where: whereComparaison,
      order: { dateFin: 'DESC' },
      take: 2,
    });

    const inventaireActuel = deuxDerniers[0] || null;
    const inventairePrecedent = deuxDerniers[1] || null;

    // 3. Comparaison période actuelle vs précédente
    let comparaison = null;
    if (inventaireActuel && inventairePrecedent) {
      const calculerEvolution = (actuel: number, precedent: number) => {
        if (precedent === 0) return actuel > 0 ? 100 : 0;
        return ((actuel - precedent) / precedent) * 100;
      };

      comparaison = {
        ca: {
          actuel: Number(inventaireActuel.chiffreAffaires),
          precedent: Number(inventairePrecedent.chiffreAffaires),
          evolution: calculerEvolution(
            Number(inventaireActuel.chiffreAffaires),
            Number(inventairePrecedent.chiffreAffaires),
          ),
        },
        benefice: {
          actuel: Number(inventaireActuel.beneficeNet),
          precedent: Number(inventairePrecedent.beneficeNet),
          evolution: calculerEvolution(
            Number(inventaireActuel.beneficeNet),
            Number(inventairePrecedent.beneficeNet),
          ),
        },
        pertes: {
          actuel: Number(inventaireActuel.totalPertes),
          precedent: Number(inventairePrecedent.totalPertes),
          evolution: calculerEvolution(
            Number(inventaireActuel.totalPertes),
            Number(inventairePrecedent.totalPertes),
          ),
        },
        tauxMarge: {
          actuel: Number(inventaireActuel.tauxMarge),
          precedent: Number(inventairePrecedent.tauxMarge),
          evolution: Number(inventaireActuel.tauxMarge) - Number(inventairePrecedent.tauxMarge),
        },
      };
    }

    // 4. Top 10 articles avec écarts fréquents
    let topArticlesQuery = this.comptageRepository
      .createQueryBuilder('c')
      .innerJoin('inventaire', 'i', 'i.id = c.inventaireId')
      .select('c.articleId', 'articleId')
      .addSelect('c.articleNom', 'articleNom')
      .addSelect('COUNT(*)', 'nombreEcarts')
      .addSelect('SUM(ABS(c.quantiteComptee - c.quantiteSysteme))', 'ecartTotal')
      .addSelect('AVG(ABS(c.quantiteComptee - c.quantiteSysteme))', 'ecartMoyen')
      .where('i.organizationId = :organizationId', { organizationId })
      .andWhere('c.quantiteComptee != c.quantiteSysteme');

    if (dateDebut && dateFin) {
      topArticlesQuery = topArticlesQuery.andWhere(
        'i.dateFin BETWEEN :dateDebut AND :dateFin',
        { dateDebut, dateFin }
      );
    }

    const topArticlesEcarts = await topArticlesQuery
      .groupBy('c.articleId, c.articleNom')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    // 5. Évolution CA et pertes sur les 6 derniers inventaires
    const whereEvolution: any = {
      organizationId,
      statut: StatutInventaire.TERMINE,
      financesCalcules: true
    };
    if (dateDebut && dateFin) {
      whereEvolution.dateFin = Between(dateDebut, dateFin);
    }
    const sixDerniers = await this.inventaireRepository.find({
      where: whereEvolution,
      order: { dateFin: 'DESC' },
      take: 6,
    });

    const evolutionCA = sixDerniers.reverse().map((inv) => ({
      date: inv.dateFin,
      montant: Number(inv.chiffreAffaires),
      benefice: Number(inv.beneficeNet),
    }));

    const evolutionPertes = sixDerniers.map((inv) => ({
      date: inv.dateFin,
      montant: Number(inv.totalPertes),
      articlesManquants: Number(inv.valeurArticlesManquants),
      articlesAbimes: Number(inv.valeurArticlesAbimes),
    }));

    // 6. Moyenne taux de rentabilité
    let statsQuery = this.inventaireRepository
      .createQueryBuilder('inv')
      .select('AVG(inv.tauxRentabilite)', 'tauxRentabiliteMoyen')
      .addSelect('AVG(inv.tauxMarge)', 'tauxMargeMoyen')
      .addSelect('SUM(inv.totalPertes)', 'pertesTotales')
      .where('inv.organizationId = :organizationId', { organizationId })
      .andWhere('inv.financesCalcules = true');

    if (dateDebut && dateFin) {
      statsQuery = statsQuery.andWhere(
        'inv.dateFin BETWEEN :dateDebut AND :dateFin',
        { dateDebut, dateFin }
      );
    }

    const statsFinancieres = await statsQuery.getRawOne();

    return {
      global: {
        totalInventaires,
        inventaireEnCours: inventaireEnCours ? {
          id: inventaireEnCours.id,
          date: inventaireEnCours.date,
          articlesComptes: inventaireEnCours.articlesComptes,
          totalArticles: inventaireEnCours.totalArticles,
          progression: inventaireEnCours.totalArticles > 0
            ? Math.round((inventaireEnCours.articlesComptes / inventaireEnCours.totalArticles) * 100)
            : 0,
        } : null,
        dernierInventaire: dernierInventaire ? {
          id: dernierInventaire.id,
          date: dernierInventaire.termineLe,
          ca: Number(dernierInventaire.chiffreAffaires),
          benefice: Number(dernierInventaire.beneficeNet),
          pertes: Number(dernierInventaire.totalPertes),
        } : null,
      },
      comparaison,
      topArticlesEcarts: topArticlesEcarts.map((article) => ({
        articleId: article.articleId,
        articleNom: article.articleNom,
        nombreEcarts: Number(article.nombreEcarts),
        ecartTotal: Number(article.ecartTotal),
        ecartMoyen: Number(article.ecartMoyen).toFixed(1),
      })),
      evolution: {
        ca: evolutionCA,
        pertes: evolutionPertes,
      },
      moyennes: {
        tauxRentabilite: Number(statsFinancieres?.tauxRentabiliteMoyen || 0).toFixed(2),
        tauxMarge: Number(statsFinancieres?.tauxMargeMoyen || 0).toFixed(2),
        pertesTotales: Number(statsFinancieres?.pertesTotales || 0),
      },
    };
  }

  /**
   * Exporter les comptages d'un inventaire en Excel
   */
  async exportComptagesExcel(
    inventaireId: string,
    organizationId: string,
    res: Response,
  ): Promise<void> {
    const ExcelJS = require('exceljs');
    const inventaire = await this.findOne(inventaireId, organizationId);

    // Récupérer tous les comptages
    const comptages = await this.comptageRepository.find({
      where: { inventaireId },
      order: { articleNom: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Comptages');

    // En-têtes
    worksheet.columns = [
      { header: 'Article', key: 'articleNom', width: 30 },
      { header: 'Qté Système', key: 'quantiteSysteme', width: 15 },
      { header: 'Qté Comptée', key: 'quantiteComptee', width: 15 },
      { header: 'Écart', key: 'ecart', width: 12 },
      { header: 'Note', key: 'note', width: 30 },
      { header: 'Compté par', key: 'comptePar', width: 20 },
    ];

    // Style des en-têtes
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Ajouter les données
    comptages.forEach((comptage) => {
      const ecart = comptage.quantiteComptee - comptage.quantiteSysteme;
      const row = worksheet.addRow({
        articleNom: comptage.articleNom,
        quantiteSysteme: comptage.quantiteSysteme,
        quantiteComptee: comptage.quantiteComptee,
        ecart: ecart,
        note: comptage.note || '',
        comptePar: comptage.comptePar,
      });

      // Colorer les écarts en rouge si négatif, vert si positif
      if (ecart !== 0) {
        row.getCell('ecart').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: ecart < 0 ? 'FFFFCCCC' : 'FFCCFFCC' },
        };
      }
    });

    // Ajouter une ligne de résumé
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow({
      articleNom: 'TOTAL',
      quantiteSysteme: { formula: `SUM(B2:B${comptages.length + 1})` },
      quantiteComptee: { formula: `SUM(C2:C${comptages.length + 1})` },
      ecart: { formula: `SUM(D2:D${comptages.length + 1})` },
    });
    summaryRow.font = { bold: true };

    // Envoyer le fichier
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=comptages-inventaire-${inventaireId}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Exporter la liste des inventaires en Excel
   */
  async exportInventairesExcel(
    organizationId: string,
    res: Response,
  ): Promise<void> {
    const ExcelJS = require('exceljs');

    const inventaires = await this.inventaireRepository.find({
      where: { organizationId },
      order: { date: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventaires');

    // En-têtes
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Statut', key: 'statut', width: 12 },
      { header: 'Note', key: 'note', width: 30 },
      { header: 'Articles comptés', key: 'articlesComptes', width: 15 },
      { header: 'Total articles', key: 'totalArticles', width: 15 },
      { header: 'Écarts', key: 'articlesAvecEcarts', width: 12 },
      { header: 'CA', key: 'chiffreAffaires', width: 15 },
      { header: 'Bénéfice Net', key: 'beneficeNet', width: 15 },
      { header: 'Pertes', key: 'totalPertes', width: 15 },
      { header: 'Responsable', key: 'responsableNom', width: 20 },
    ];

    // Style des en-têtes
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Ajouter les données
    inventaires.forEach((inv) => {
      worksheet.addRow({
        date: inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '',
        statut: inv.statut,
        note: inv.note || '',
        articlesComptes: inv.articlesComptes,
        totalArticles: inv.totalArticles,
        articlesAvecEcarts: inv.articlesAvecEcarts,
        chiffreAffaires: inv.financesCalcules ? Number(inv.chiffreAffaires) : '',
        beneficeNet: inv.financesCalcules ? Number(inv.beneficeNet) : '',
        totalPertes: inv.financesCalcules ? Number(inv.totalPertes) : '',
        responsableNom: inv.responsableNom || '',
      });
    });

    // Format des nombres
    worksheet.getColumn('chiffreAffaires').numFmt = '#,##0';
    worksheet.getColumn('beneficeNet').numFmt = '#,##0';
    worksheet.getColumn('totalPertes').numFmt = '#,##0';

    // Envoyer le fichier
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=inventaires-${new Date().toISOString().split('T')[0]}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
