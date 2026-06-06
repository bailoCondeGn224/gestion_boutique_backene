import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { Article } from '../entities/article.entity';

@Injectable()
export class ArticleRepository extends Repository<Article> {
  constructor(private dataSource: DataSource) {
    super(Article, dataSource.createEntityManager());
  }

  /**
   * Augmenter le stock d'un article
   */
  async augmenterStock(
    articleId: string,
    quantite: number,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `UPDATE article
       SET stock = stock + $1
       WHERE id = $2 AND "organizationId" = $3`,
      [quantite, articleId, organizationId],
    );
  }

  /**
   * Diminuer le stock d'un article
   */
  async diminuerStock(
    articleId: string,
    quantite: number,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `UPDATE article
       SET stock = stock - $1
       WHERE id = $2 AND "organizationId" = $3`,
      [quantite, articleId, organizationId],
    );
  }

  /**
   * Obtenir le stock actuel d'un article
   */
  async getStockActuel(
    articleId: string,
    organizationId: string,
    queryRunner: QueryRunner,
  ): Promise<number> {
    const result = await queryRunner.manager.query(
      `SELECT stock FROM article WHERE id = $1 AND "organizationId" = $2`,
      [articleId, organizationId],
    );
    return result[0]?.stock || 0;
  }
}
