import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BaseTenantEntity } from '../entities/base-tenant.entity';

/**
 * Service de base pour toutes les entités multi-tenant
 *
 * Fournit les opérations CRUD standard avec filtrage automatique par organizationId
 *
 * @template T - Type de l'entité (doit étendre BaseTenantEntity)
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class ArticlesService extends BaseTenantService<Article> {
 *   constructor(
 *     @InjectRepository(Article)
 *     private articlesRepository: Repository<Article>,
 *   ) {
 *     super(articlesRepository, 'Article');
 *   }
 * }
 * ```
 */
export abstract class BaseTenantService<T extends BaseTenantEntity> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
  ) {}

  /**
   * Récupère toutes les entités de l'organisation
   */
  async findAll(
    organizationId: string,
    options?: Omit<FindManyOptions<T>, 'where'>,
  ): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: { organizationId } as FindOptionsWhere<T>,
    });
  }

  /**
   * Récupère une entité par ID avec vérification d'appartenance à l'organization
   */
  async findOne(id: string, organizationId: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id, organizationId } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.entityName} avec l'ID ${id} introuvable`,
      );
    }

    return entity;
  }

  /**
   * Crée une nouvelle entité pour l'organization
   */
  async create(createDto: Partial<T>, organizationId: string): Promise<T> {
    const entity = this.repository.create({
      ...createDto,
      organizationId,
    } as any);

    return this.repository.save(entity);
  }

  /**
   * Met à jour une entité avec vérification d'appartenance
   */
  async update(
    id: string,
    updateDto: Partial<T>,
    organizationId: string,
  ): Promise<T> {
    // Vérifier que l'entité existe et appartient à l'organization
    const entity = await this.findOne(id, organizationId);

    // Mettre à jour les champs (sans modifier organizationId)
    Object.assign(entity, updateDto);

    return this.repository.save(entity);
  }

  /**
   * Supprime une entité avec vérification d'appartenance
   */
  async remove(id: string, organizationId: string): Promise<void> {
    // Vérifier que l'entité existe et appartient à l'organization
    const entity = await this.findOne(id, organizationId);

    await this.repository.remove(entity);
  }

  /**
   * Compte le nombre d'entités de l'organization
   */
  async count(organizationId: string): Promise<number> {
    return this.repository.count({
      where: { organizationId } as FindOptionsWhere<T>,
    });
  }

  /**
   * Vérifie si une entité existe pour l'organization
   */
  async exists(id: string, organizationId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { id, organizationId } as FindOptionsWhere<T>,
    });

    return count > 0;
  }

  /**
   * Récupère une entité avec relations
   */
  async findOneWithRelations(
    id: string,
    organizationId: string,
    relations: string[],
  ): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id, organizationId } as FindOptionsWhere<T>,
      relations,
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.entityName} avec l'ID ${id} introuvable`,
      );
    }

    return entity;
  }

  /**
   * Méthode utilitaire pour vérifier l'accès SUPER_ADMIN
   * À utiliser dans les méthodes surchargées si besoin d'accès cross-organization
   */
  protected validateSuperAdminAccess(
    userOrganizationId: string | null,
    isSuperAdmin: boolean,
  ): void {
    if (!isSuperAdmin && !userOrganizationId) {
      throw new ForbiddenException('Accès réservé aux super administrateurs');
    }
  }
}
