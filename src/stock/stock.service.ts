import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { StockFilterDto } from './dto/stock-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @InjectRepository(LigneVente)
    private ligneVenteRepository: Repository<LigneVente>,
    @InjectRepository(LigneApprovisionnement)
    private ligneApproRepository: Repository<LigneApprovisionnement>,
  ) {}

  async create(createArticleDto: CreateArticleDto): Promise<Article> {
    const article = this.articlesRepository.create(createArticleDto);
    return this.articlesRepository.save(article);
  }

  async findAll(filterDto?: StockFilterDto): Promise<PaginatedResponse<Article>> {
    const { page = 1, limit = 10, search, categorieId, enAlerte } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie');

    // Filtre par recherche (nom ou référence)
    if (search) {
      queryBuilder.andWhere(
        '(article.nom LIKE :search OR article.reference LIKE :search)',
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

  async findOne(id: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: ['categorie'],
    });
    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
    }
    return article;
  }

  async findByCategorie(categorieId: string): Promise<Article[]> {
    return this.articlesRepository.find({
      where: { categorieId },
      order: { nom: 'ASC' },
      relations: ['categorie'],
    });
  }

  async findByZone(zone: string): Promise<Article[]> {
    return this.articlesRepository.find({
      where: { zone },
      order: { nom: 'ASC' },
    });
  }

  async findAlerts(): Promise<Article[]> {
    const articles = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.stock <= article.seuilAlerte')
      .orderBy('article.stock', 'ASC')
      .getMany();

    return articles;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);
    Object.assign(article, updateArticleDto);
    return this.articlesRepository.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findOne(id);

    // Vérifier s'il existe des lignes de vente pour cet article
    const ventesCount = await this.ligneVenteRepository.count({
      where: { articleId: id },
    });

    if (ventesCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cet article : utilisé dans ${ventesCount} vente(s). Supprimez d'abord les ventes.`,
      );
    }

    // Vérifier s'il existe des lignes d'approvisionnement pour cet article
    const approCount = await this.ligneApproRepository.count({
      where: { articleId: id },
    });

    if (approCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cet article : utilisé dans ${approCount} approvisionnement(s). Supprimez d'abord les approvisionnements.`,
      );
    }

    await this.articlesRepository.remove(article);
  }

  async decrementStock(id: string, quantite: number): Promise<Article> {
    const article = await this.findOne(id);

    if (article.stock < quantite) {
      throw new BadRequestException(
        `Stock insuffisant pour ${article.nom}. Disponible: ${article.stock}, Demandé: ${quantite}`,
      );
    }

    article.stock -= quantite;
    return this.articlesRepository.save(article);
  }

  async incrementStock(id: string, quantite: number): Promise<Article> {
    const article = await this.findOne(id);
    article.stock += quantite;
    return this.articlesRepository.save(article);
  }

  async getStats(): Promise<any> {
    // Statistiques détaillées
    const totalArticles = await this.articlesRepository.count();

    const articlesEnRupture = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.stock = 0')
      .getCount();

    // Stock Faible : articles avec stock entre 1 et 5
    const articlesStockFaible = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.stock >= 1 AND article.stock <= 5')
      .getCount();

    const articlesOK = totalArticles - articlesEnRupture - articlesStockFaible;

    // Calcul de la valeur totale du stock
    const valeurResult = await this.articlesRepository
      .createQueryBuilder('article')
      .select('SUM(article.stock * article.prixAchat)', 'valeurTotale')
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

  async getRotationStats(periode: number = 30): Promise<any> {
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
      .where('vente.date >= :dateDebut', { dateDebut })
      .groupBy('ligne.articleId')
      .addGroupBy('ligne.nom')
      .orderBy('SUM(ligne.quantite)', 'DESC')
      .getRawMany();

    // Récupérer le stock actuel pour chaque article vendu
    const statsAvecStock = await Promise.all(
      articlesAvecVentes.map(async (item) => {
        const article = await this.articlesRepository.findOne({
          where: { id: item.articleId },
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
}
