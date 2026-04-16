import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { StockFilterDto } from './dto/stock-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
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
}
