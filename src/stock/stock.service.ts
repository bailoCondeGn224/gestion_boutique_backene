import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { StockFilterDto } from './dto/stock-filter.dto';
import { CreateArticlesBulkDto } from './dto/create-articles-bulk.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { deleteFile } from '../common/utils/file.util';
import { compressImage } from '../common/utils/image.util';
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service';
import { TypeMouvement, MotifMouvement, MouvementStock } from '../mouvements-stock/entities/mouvement-stock.entity';
import { ModeVenteService } from './mode-vente.service';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @InjectRepository(LigneVente)
    private ligneVenteRepository: Repository<LigneVente>,
    @InjectRepository(LigneApprovisionnement)
    private ligneApproRepository: Repository<LigneApprovisionnement>,
    @InjectRepository(MouvementStock)
    private mouvementStockRepository: Repository<MouvementStock>,
    private mouvementsStockService: MouvementsStockService,
    private modeVenteService: ModeVenteService,
  ) {}

  async create(
    createArticleDto: CreateArticleDto,
    organizationId: string,
    file?: Express.Multer.File,
  ): Promise<Article> {
    let photoPath: string | undefined;

    if (file) {
      photoPath = `articles/${organizationId}/${file.filename}`;

      // Compresser l'image en arrière-plan (ne pas bloquer la création)
      compressImage(file.path).catch((error) => {
        console.error('Erreur compression image:', error);
      });
    }

    // Extraire modesVente du DTO
    const { modesVente, ...articleData } = createArticleDto;

    const article = this.articlesRepository.create({
      ...articleData,
      photo: photoPath,
      organizationId,
    });

    const savedArticle = await this.articlesRepository.save(article);

    // Créer les modes de vente si fournis
    if (modesVente && modesVente.length > 0) {
      await this.modeVenteService.createMany(
        savedArticle.id,
        modesVente,
        organizationId,
      );
    }

    // Créer un mouvement de stock si l'article a un stock initial > 0
    if (savedArticle.stock > 0) {
      await this.mouvementsStockService.create(
        {
          articleId: savedArticle.id,
          articleNom: savedArticle.nom,
          type: TypeMouvement.ENTREE,
          motif: MotifMouvement.AJUSTEMENT,
          quantite: savedArticle.stock,
          stockAvant: 0,
          stockApres: savedArticle.stock,
          prixUnitaire: Number(savedArticle.prixAchat),
          valeurTotal: savedArticle.stock * Number(savedArticle.prixAchat),
          date: new Date(),
          note: 'Stock initial lors de la création de l\'article',
        },
        organizationId,
      );
    }

    return savedArticle;
  }

  async createBulk(
    createArticlesBulkDto: CreateArticlesBulkDto,
    organizationId: string,
    photoMap?: Map<number, Express.Multer.File>,
  ): Promise<{ created: Article[]; errors: any[] }> {
    const created: Article[] = [];
    const errors: any[] = [];

    for (let i = 0; i < createArticlesBulkDto.articles.length; i++) {
      const articleDto = createArticlesBulkDto.articles[i];

      try {
        // Vérifier si un article avec la même référence existe déjà
        if (articleDto.reference) {
          const existingArticle = await this.articlesRepository.findOne({
            where: { reference: articleDto.reference, organizationId },
          });

          if (existingArticle) {
            errors.push({
              article: articleDto,
              error: `Un article avec la référence '${articleDto.reference}' existe déjà`,
            });
            continue;
          }
        }

        // Gérer la photo si elle existe pour cet article (via le mapping par index)
        let photoPath: string | undefined;
        const file = photoMap?.get(i);
        if (file) {
          photoPath = `articles/${organizationId}/${file.filename}`;

          // Compresser l'image en arrière-plan
          compressImage(file.path).catch((error) => {
            console.error('Erreur compression image:', error);
          });
        }

        // Extraire modesVente du DTO
        const { modesVente, ...articleData } = articleDto;

        const article = this.articlesRepository.create({
          ...articleData,
          photo: photoPath,
          organizationId,
        });

        const savedArticle = await this.articlesRepository.save(article);

        // Créer les modes de vente si fournis
        if (modesVente && modesVente.length > 0) {
          await this.modeVenteService.createMany(
            savedArticle.id,
            modesVente,
            organizationId,
          );
        }

        created.push(savedArticle);

        // Créer un mouvement de stock si l'article a un stock initial > 0
        if (savedArticle.stock > 0) {
          await this.mouvementsStockService.create(
            {
              articleId: savedArticle.id,
              articleNom: savedArticle.nom,
              type: TypeMouvement.ENTREE,
              motif: MotifMouvement.AJUSTEMENT,
              quantite: savedArticle.stock,
              stockAvant: 0,
              stockApres: savedArticle.stock,
              prixUnitaire: Number(savedArticle.prixAchat),
              valeurTotal: savedArticle.stock * Number(savedArticle.prixAchat),
              date: new Date(),
              note: 'Stock initial lors de la création de l\'article (ajout en masse)',
            },
            organizationId,
          );
        }
      } catch (error) {
        errors.push({
          article: articleDto,
          error: error.message || 'Erreur lors de la création',
        });
      }
    }

    return { created, errors };
  }

  async findAll(filterDto: StockFilterDto, organizationId: string): Promise<PaginatedResponse<Article>> {
    const { page = 1, limit = 10, search, categorieId, enAlerte } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .leftJoinAndSelect('article.modesVente', 'modesVente')
      .where('article.organizationId = :organizationId', { organizationId });

    // Filtre par recherche (nom ou référence)
    if (search) {
      queryBuilder.andWhere(
        '(article.nom ILIKE :search OR article.reference ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filtre par catégorie
    if (categorieId) {
      queryBuilder.andWhere('article.categorieId = :categorieId', { categorieId });
    }

    // Filtre par alerte (stock <= seuilAlerte)
    if (enAlerte) {
      queryBuilder.andWhere('article.stock <= article.seuilAlerte');
    }

    const [data, total] = await queryBuilder
      .orderBy('article.nom', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, organizationId: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({
      where: { id, organizationId },
      relations: ['categorie', 'modesVente'],
    });
    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }
    return article;
  }

  async findByCategorie(categorieId: string, organizationId: string): Promise<Article[]> {
    return this.articlesRepository.find({
      where: { categorieId, organizationId },
      order: { nom: 'ASC' },
      relations: ['categorie'],
    });
  }

  async findByZone(zone: string, organizationId: string): Promise<Article[]> {
    return this.articlesRepository.find({
      where: { zone, organizationId },
      order: { nom: 'ASC' },
    });
  }

  async findAlerts(organizationId: string): Promise<Article[]> {
    const articles = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.organizationId = :organizationId', { organizationId })
      .andWhere('article.stock <= article.seuilAlerte')
      .orderBy('article.stock', 'ASC')
      .getMany();

    return articles;
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    organizationId: string,
    file?: Express.Multer.File,
  ): Promise<Article> {
    const article = await this.findOne(id, organizationId);

    // Supprimer ancienne photo si nouvelle uploadée
    if (file) {
      if (article.photo) {
        await deleteFile(article.photo);
      }

      // Compresser l'image en arrière-plan
      compressImage(file.path).catch((error) => {
        console.error('Erreur compression image:', error);
      });

      // Mettre à jour avec le nouveau chemin photo
      Object.assign(article, {
        ...updateArticleDto,
        photo: `articles/${organizationId}/${file.filename}`,
      });
    } else {
      // Pas de nouvelle photo, juste mettre à jour les autres champs
      // Filtrer les champs undefined pour ne pas écraser les valeurs existantes
      const cleanData = Object.entries(updateArticleDto).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      Object.assign(article, cleanData);
    }

    return this.articlesRepository.save(article);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const article = await this.findOne(id, organizationId);

    // Vérifier s'il existe des lignes de vente pour cet article
    const ventesCount = await this.ligneVenteRepository.count({
      where: { articleId: id, organizationId },
    });

    if (ventesCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cet article : utilisé dans ${ventesCount} vente(s). Supprimez d'abord les ventes.`,
      );
    }

    // Vérifier s'il existe des lignes d'approvisionnement pour cet article
    const approCount = await this.ligneApproRepository.count({
      where: { articleId: id, organizationId },
    });

    if (approCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cet article : utilisé dans ${approCount} approvisionnement(s). Supprimez d'abord les approvisionnements.`,
      );
    }

    // Supprimer tous les mouvements de stock associés à cet article
    await this.mouvementStockRepository.delete({
      articleId: id,
      organizationId,
    });

    // Supprimer la photo si elle existe
    if (article.photo) {
      await deleteFile(article.photo);
    }

    // Utiliser delete() au lieu de remove() pour éviter les erreurs
    await this.articlesRepository.delete({ id, organizationId });
  }

  async decrementStock(id: string, quantite: number, organizationId: string): Promise<Article> {
    const article = await this.findOne(id, organizationId);

    if (article.stock < quantite) {
      throw new BadRequestException(
        `Stock insuffisant pour ${article.nom}. Disponible: ${article.stock}, Demandé: ${quantite}`,
      );
    }

    article.stock -= quantite;
    return this.articlesRepository.save(article);
  }

  async incrementStock(id: string, quantite: number, organizationId: string): Promise<Article> {
    const article = await this.findOne(id, organizationId);
    article.stock += quantite;
    return this.articlesRepository.save(article);
  }

  async getStats(organizationId: string): Promise<any> {
    // Statistiques détaillées
    const totalArticles = await this.articlesRepository.count({
      where: { organizationId },
    });

    const articlesEnRupture = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.organizationId = :organizationId', { organizationId })
      .andWhere('article.stock = 0')
      .getCount();

    // Stock Faible : articles avec stock entre 1 et 5
    const articlesStockFaible = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.organizationId = :organizationId', { organizationId })
      .andWhere('article.stock >= 1 AND article.stock <= 5')
      .getCount();

    const articlesOK = totalArticles - articlesEnRupture - articlesStockFaible;

    // Calcul de la valeur totale du stock
    const valeurResult = await this.articlesRepository
      .createQueryBuilder('article')
      .select('SUM(article.stock * article.prixAchat)', 'valeurTotale')
      .where('article.organizationId = :organizationId', { organizationId })
      .getRawOne();

    const valeurTotaleStock = parseFloat(valeurResult?.valeurTotale || '0');

    // Taux d'alerte
    const articlesEnAlerte = articlesEnRupture + articlesStockFaible;
    const tauxAlerte = totalArticles > 0 ? (articlesEnAlerte / totalArticles) * 100 : 0;

    // Répartition par catégorie
    const categoriesCount = await this.articlesRepository
      .createQueryBuilder('article')
      .leftJoin('article.categorie', 'categorie')
      .select('categorie.nom', 'categorie')
      .addSelect('COUNT(*)', 'count')
      .where('article.organizationId = :organizationId', { organizationId })
      .groupBy('categorie.nom')
      .getRawMany();

    return {
      total: totalArticles,
      totalArticles,
      articlesEnRupture,
      articlesStockFaible,
      articlesOK,
      enAlerte: articlesEnAlerte,
      articlesEnAlerte,
      valeurTotaleStock,
      tauxAlerte: parseFloat(tauxAlerte.toFixed(2)),
      parCategorie: categoriesCount.map(c => ({
        categorie: c.categorie,
        count: parseInt(c.count, 10),
      })),
    };
  }

  async getRotationStats(periode: number = 30, organizationId: string): Promise<any> {
    // Calculer la date de début (aujourd'hui - période en jours)
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - periode);

    // Récupérer TOUS les articles de l'organisation
    const tousLesArticles = await this.articlesRepository.find({
      where: { organizationId },
      relations: ['categorie'],
    });

    // Récupérer les ventes par article dans la période
    const ventesParArticle = await this.ligneVenteRepository
      .createQueryBuilder('ligne')
      .leftJoin('ligne.vente', 'vente')
      .select('ligne.articleId', 'articleId')
      .addSelect('SUM(ligne.quantiteBase)', 'totalVendu')
      .addSelect('COUNT(DISTINCT vente.id)', 'nombreVentes')
      .addSelect('MAX(vente.date)', 'derniereVente')
      .where('ligne.organizationId = :organizationId', { organizationId })
      .andWhere('vente.date >= :dateDebut', { dateDebut })
      .groupBy('ligne.articleId')
      .getRawMany();

    // Créer un map des ventes par articleId
    const ventesMap = new Map();
    ventesParArticle.forEach(v => {
      ventesMap.set(v.articleId, {
        totalVendu: parseInt(v.totalVendu, 10) || 0,
        nombreVentes: parseInt(v.nombreVentes, 10) || 0,
        derniereVente: v.derniereVente,
      });
    });

    // Calculer les stats pour chaque article
    const statsArticles = tousLesArticles.map(article => {
      const ventes = ventesMap.get(article.id) || { totalVendu: 0, nombreVentes: 0, derniereVente: null };
      const totalVendu = ventes.totalVendu;
      const stockActuel = article.stock;

      // Taux de rotation sur la période = Vendus / Stock moyen
      // Plus simple et réaliste: combien de fois le stock a tourné sur la période
      const tauxRotationPeriode = stockActuel > 0
        ? (totalVendu / stockActuel).toFixed(2)
        : '0';

      // Pourcentage du stock vendu sur la période
      const pourcentageVendu = stockActuel > 0
        ? Math.round((totalVendu / (stockActuel + totalVendu)) * 100)
        : 0;

      // Classification basée sur le pourcentage vendu sur la période
      // - Rapide: > 50% du stock vendu (forte demande)
      // - Moyenne: 10-50% du stock vendu
      // - Lente: < 10% du stock vendu (stock qui ne bouge pas)
      let statut = 'rotation_lente';
      if (pourcentageVendu >= 50) {
        statut = 'rotation_rapide';
      } else if (pourcentageVendu >= 10) {
        statut = 'rotation_moyenne';
      }

      return {
        articleId: article.id,
        nom: article.nom,
        categorie: article.categorie?.nom || 'N/A',
        totalVendu,
        nombreVentes: ventes.nombreVentes,
        stockActuel,
        tauxRotationPeriode, // Rotation sur la période (pas annualisée)
        pourcentageVendu,
        derniereVente: ventes.derniereVente,
        valeurStock: Number(article.prixAchat) * stockActuel,
        statut,
      };
    });

    // Séparer par catégorie de rotation
    const rotationRapide = statsArticles.filter(s => s.statut === 'rotation_rapide');
    const rotationMoyenne = statsArticles.filter(s => s.statut === 'rotation_moyenne');
    const rotationLente = statsArticles.filter(s => s.statut === 'rotation_lente' && s.stockActuel > 0);

    // Calculer la valeur du stock immobilisé (rotation lente avec stock > 0)
    const valeurStockImmobilise = rotationLente.reduce((sum, item) => sum + item.valeurStock, 0);

    // FORTE ROTATION = Articles qui se vendent bien (triés par pourcentage vendu)
    const articlesForteRotation = [...rotationRapide, ...rotationMoyenne]
      .sort((a, b) => b.pourcentageVendu - a.pourcentageVendu)
      .slice(0, 10);

    // ROTATION LENTE = Articles avec peu/pas de ventes mais du stock (triés par valeur immobilisée)
    const stockMort = rotationLente
      .sort((a, b) => b.valeurStock - a.valeurStock)
      .slice(0, 10);

    return {
      periode: `${periode} jours`,
      dateDebut,
      dateFin: new Date(),
      resume: {
        articlesAnalyses: statsArticles.length,
        rotationRapide: rotationRapide.length,
        rotationMoyenne: rotationMoyenne.length,
        rotationLente: rotationLente.length,
        valeurStockImmobilise: Math.round(valeurStockImmobilise),
      },
      topVentes: articlesForteRotation,
      stockMort,
      detailParStatut: {
        rapide: rotationRapide.length,
        moyenne: rotationMoyenne.length,
        lente: rotationLente.length,
      },
    };
  }

  /**
   * Récupérer les statistiques agrégées d'un article
   */
  async getArticleStats(articleId: string, organizationId: string) {
    // Vérifier que l'article existe et appartient à l'organisation
    const article = await this.articlesRepository.findOne({
      where: { id: articleId, organizationId },
    });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${articleId} introuvable`);
    }

    // Calculer les statistiques à partir des mouvements de stock
    const stats = await this.mouvementStockRepository
      .createQueryBuilder('m')
      .select([
        'COALESCE(SUM(CASE WHEN m.type = :sortie AND m.motif = :vente THEN m.quantite ELSE 0 END), 0) as "totalVendu"',
        'COALESCE(SUM(CASE WHEN m.type = :entree AND m.motif = :approvisionnement THEN m.quantite ELSE 0 END), 0) as "totalApprovisionne"',
        'COALESCE(SUM(CASE WHEN m.type = :entree THEN m.quantite ELSE 0 END), 0) as "totalEntrees"',
        'COALESCE(SUM(CASE WHEN m.type = :sortie THEN m.quantite ELSE 0 END), 0) as "totalSorties"',
        'COALESCE(SUM(CASE WHEN m.type = :sortie AND m.motif = :retour_client THEN m.quantite ELSE 0 END), 0) as "totalRetoursClients"',
        'COALESCE(SUM(CASE WHEN m.type = :sortie AND m.motif = :retour_fournisseur THEN m.quantite ELSE 0 END), 0) as "totalRetoursFournisseurs"',
      ])
      .where('m.articleId = :articleId', { articleId })
      .andWhere('m.organizationId = :organizationId', { organizationId })
      .setParameters({
        sortie: TypeMouvement.SORTIE,
        entree: TypeMouvement.ENTREE,
        vente: MotifMouvement.VENTE,
        approvisionnement: MotifMouvement.APPROVISIONNEMENT,
        retour_client: MotifMouvement.RETOUR_CLIENT,
        retour_fournisseur: MotifMouvement.RETOUR_FOURNISSEUR,
      })
      .getRawOne();

    return {
      articleId: article.id,
      nom: article.nom,
      stockActuel: article.stock,
      totalVendu: parseInt(stats.totalVendu) || 0,
      totalApprovisionne: parseInt(stats.totalApprovisionne) || 0,
      totalEntrees: parseInt(stats.totalEntrees) || 0,
      totalSorties: parseInt(stats.totalSorties) || 0,
      totalRetoursClients: parseInt(stats.totalRetoursClients) || 0,
      totalRetoursFournisseurs: parseInt(stats.totalRetoursFournisseurs) || 0,
    };
  }
}
