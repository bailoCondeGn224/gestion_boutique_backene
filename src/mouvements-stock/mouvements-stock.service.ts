import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MouvementStock } from './entities/mouvement-stock.entity';
import { CreateMouvementStockDto } from './dto/create-mouvement-stock.dto';
import { MouvementFilterDto } from './dto/mouvement-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class MouvementsStockService {
  constructor(
    @InjectRepository(MouvementStock)
    private mouvementStockRepository: Repository<MouvementStock>,
  ) {}

  /**
   * Créer un mouvement de stock
   */
  async create(
    createMouvementStockDto: CreateMouvementStockDto,
  ): Promise<MouvementStock> {
    const mouvement = this.mouvementStockRepository.create(
      createMouvementStockDto,
    );
    return await this.mouvementStockRepository.save(mouvement);
  }

  /**
   * Récupérer tous les mouvements avec pagination et filtres
   */
  async findAll(filterDto?: MouvementFilterDto): Promise<PaginatedResponse<MouvementStock>> {
    const { page = 1, limit = 20, search, type, motif, dateDebut, dateFin, articleId } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.mouvementStockRepository.createQueryBuilder('mouvement');

    // Filtre par recherche (nom d'article)
    if (search) {
      queryBuilder.andWhere('mouvement.articleNom LIKE :search', { search: `%${search}%` });
    }

    // Filtre par type (entree/sortie)
    if (type) {
      queryBuilder.andWhere('mouvement.type = :type', { type });
    }

    // Filtre par motif
    if (motif) {
      queryBuilder.andWhere('mouvement.motif = :motif', { motif });
    }

    // Filtre par article
    if (articleId) {
      queryBuilder.andWhere('mouvement.articleId = :articleId', { articleId });
    }

    // Filtre par date de début
    if (dateDebut) {
      queryBuilder.andWhere('mouvement.date >= :dateDebut', { dateDebut: new Date(dateDebut) });
    }

    // Filtre par date de fin
    if (dateFin) {
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('mouvement.date <= :dateFin', { dateFin: endDate });
    }

    const [data, total] = await queryBuilder
      .orderBy('mouvement.date', 'DESC')
      .addOrderBy('mouvement.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Récupérer les mouvements d'un article
   */
  async findByArticle(articleId: string, filterDto?: MouvementFilterDto): Promise<PaginatedResponse<MouvementStock>> {
    return this.findAll({ ...filterDto, articleId });
  }

  /**
   * Récupérer un mouvement par ID
   */
  async findOne(id: string): Promise<MouvementStock> {
    return await this.mouvementStockRepository.findOne({
      where: { id },
    });
  }

  /**
   * Récupérer les statistiques globales
   */
  async getStats(): Promise<{
    totalEntrees: number;
    totalSorties: number;
    valeurEntrees: number;
    valeurSorties: number;
  }> {
    // Statistiques des entrées
    const entreesStats = await this.mouvementStockRepository
      .createQueryBuilder('mouvement')
      .select('SUM(mouvement.quantite)', 'total')
      .addSelect('SUM(mouvement.valeurTotal)', 'valeur')
      .where('mouvement.type = :type', { type: 'entree' })
      .getRawOne();

    // Statistiques des sorties
    const sortiesStats = await this.mouvementStockRepository
      .createQueryBuilder('mouvement')
      .select('SUM(mouvement.quantite)', 'total')
      .addSelect('SUM(mouvement.valeurTotal)', 'valeur')
      .where('mouvement.type = :type', { type: 'sortie' })
      .getRawOne();

    return {
      totalEntrees: parseInt(entreesStats?.total || '0', 10),
      totalSorties: parseInt(sortiesStats?.total || '0', 10),
      valeurEntrees: parseFloat(entreesStats?.valeur || '0'),
      valeurSorties: parseFloat(sortiesStats?.valeur || '0'),
    };
  }

  /**
   * Récupérer les mouvements par période
   */
  async findByPeriod(dateDebut: Date, dateFin: Date): Promise<MouvementStock[]> {
    return await this.mouvementStockRepository
      .createQueryBuilder('mouvement')
      .where('mouvement.date >= :dateDebut', { dateDebut })
      .andWhere('mouvement.date <= :dateFin', { dateFin })
      .orderBy('mouvement.date', 'DESC')
      .getMany();
  }
}
