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

    const article = this.articlesRepository.create({
      ...createArticleDto,
      photo: photoPath,
      organizationId,
    });

    const savedArticle = await this.articlesRepository.save(article);

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

        const article = this.articlesRepository.create({
          ...articleDto,
          photo: photoPath,
          organizationId,
        });

        const savedArticle = await this.articlesRepository.save(article);
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
      relations: ['categorie'],
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

    // Récupérer tous les articles avec leurs ventes
    const articlesAvecVentes = await this.ligneVenteRepository
      .createQueryBuilder('ligne')
      .leftJoin('ligne.vente', 'vente')
      .select('ligne.articleId', 'articleId')
      .addSelect('ligne.nom', 'nom')
      .addSelect('SUM(ligne.quantite)', 'totalVendu')
      .addSelect('COUNT(DISTINCT vente.id)', 'nombreVentes')
      .where('ligne.organizationId = :organizationId', { organizationId })
      .andWhere('vente.date >= :dateDebut', { dateDebut })
      .groupBy('ligne.articleId')
      .addGroupBy('ligne.nom')
      .orderBy('SUM(ligne.quantite)', 'DESC')
      .getRawMany();

    // Récupérer le stock actuel pour chaque article vendu
    const statsAvecStock = await Promise.all(
      articlesAvecVentes.map(async (item) => {
        const article = await this.articlesRepository.findOne({
          where: { id: item.articleId, organizationId },
          relations: ['categorie'],
        });

        if (!article) return null;

        const totalVendu = parseInt(item.totalVendu, 10);
        const stockActuel = article.stock;
        const nombreVentes = parseInt(item.nombreVentes, 10);

        // Taux de rotation = (Quantité vendue / Stock moyen) sur la période
        // Stock moyen ≈ stock actuel (simplifié)
        const tauxRotation = stockActuel > 0
          ? ((totalVendu / (stockActuel + totalVendu)) * (365 / periode)).toFixed(2)
          : 'N/A';

        // Jours de couverture = combien de jours le stock actuel peut tenir
        const venteMoyenneParJour = totalVendu / periode;
        const joursCouverture = venteMoyenneParJour > 0
          ? Math.round(stockActuel / venteMoyenneParJour)
          : 999;

        return {
          articleId: item.articleId,
          nom: item.nom,
          categorie: article.categorie?.nom || 'N/A',
          totalVendu,
          nombreVentes,
          stockActuel,
          tauxRotation,
          joursCouverture,
          valeurStock: Number(article.prixAchat) * stockActuel,
          statut: joursCouverture > 60 ? 'rotation_lente' :
                  joursCouverture > 30 ? 'rotation_moyenne' : 'rotation_rapide',
        };
      })
    );

    const statsFiltered = statsAvecStock.filter(s => s !== null);

    // Séparer par catégorie de rotation
    const rotationRapide = statsFiltered.filter(s => s.statut === 'rotation_rapide');
    const rotationMoyenne = statsFiltered.filter(s => s.statut === 'rotation_moyenne');
    const rotationLente = statsFiltered.filter(s => s.statut === 'rotation_lente');

    // Calculer la valeur du stock immobilisé (rotation lente)
    const valeurStockImmobilise = rotationLente.reduce((sum, item) => sum + item.valeurStock, 0);

    // Top 10 bestsellers
    const topVentes = statsFiltered.slice(0, 10);

    // Articles à rotation lente (stock mort potentiel)
    const stockMort = rotationLente.slice(0, 10);

    return {
      periode: `${periode} jours`,
      dateDebut,
      dateFin: new Date(),
      resume: {
        articlesAnalyses: statsFiltered.length,
        rotationRapide: rotationRapide.length,
        rotationMoyenne: rotationMoyenne.length,
        rotationLente: rotationLente.length,
        valeurStockImmobilise: Math.round(valeurStockImmobilise),
      },
      topVentes,
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
