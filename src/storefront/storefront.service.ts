import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { StoreFront } from './entities/storefront.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Article } from '../stock/entities/article.entity';
import { UpdateStorefrontDto, StorefrontResponseDto } from './dto';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(StoreFront)
    private storefrontRepository: Repository<StoreFront>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    private configService: ConfigService,
  ) {}

  async getOrCreateByOrganization(organizationId: string): Promise<StorefrontResponseDto> {
    let storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });

    if (!storefront) {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organisation non trouvée');
      }

      // Générer un slug à partir du nom de l'organisation
      const slug = this.generateSlug(organization.nom);

      storefront = this.storefrontRepository.create({
        organizationId,
        slug,
        isActive: false,
      });

      await this.storefrontRepository.save(storefront);
      storefront.organization = organization;
    }

    return this.toResponseDto(storefront);
  }

  async update(organizationId: string, dto: UpdateStorefrontDto): Promise<StorefrontResponseDto> {
    let storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });

    if (!storefront) {
      // Créer si n'existe pas
      await this.getOrCreateByOrganization(organizationId);
      storefront = await this.storefrontRepository.findOne({
        where: { organizationId },
        relations: ['organization'],
      });
    }

    // Vérifier l'unicité du slug si modifié
    if (dto.slug && dto.slug !== storefront.slug) {
      const existingSlug = await this.storefrontRepository.findOne({
        where: { slug: dto.slug },
      });

      if (existingSlug) {
        throw new ConflictException('Ce slug est déjà utilisé');
      }
    }

    Object.assign(storefront, dto);
    await this.storefrontRepository.save(storefront);

    return this.toResponseDto(storefront);
  }

  async updateLogo(organizationId: string, logoUrl: string): Promise<StorefrontResponseDto> {
    const storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non trouvée');
    }

    storefront.logoUrl = logoUrl;
    await this.storefrontRepository.save(storefront);

    return this.toResponseDto(storefront);
  }

  async generateQrCode(organizationId: string): Promise<Buffer> {
    const storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non trouvée');
    }

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const url = `${baseUrl}/b/${storefront.slug}`;

    const qrCodeBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
    });

    return qrCodeBuffer;
  }

  // API Publique
  async getActiveStores(): Promise<StorefrontResponseDto[]> {
    const storefronts = await this.storefrontRepository.find({
      where: { isActive: true },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });

    return storefronts.map(sf => this.toResponseDto(sf));
  }

  async getBySlug(slug: string): Promise<StorefrontResponseDto> {
    // Chercher d'abord par slug de l'organisation
    const organization = await this.organizationRepository.findOne({
      where: { slug, actif: true },
    });

    if (!organization) {
      throw new NotFoundException('Boutique non trouvée');
    }

    // Récupérer ou créer la vitrine pour cette organisation
    let storefront = await this.storefrontRepository.findOne({
      where: { organizationId: organization.id, isActive: true },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non activée pour cette boutique');
    }

    // S'assurer que le slug de la vitrine correspond à celui de l'organisation
    storefront.organization = organization;

    return this.toResponseDto(storefront);
  }

  async getProducts(slug: string, page: number = 1, limit: number = 20, search?: string, categorieId?: string): Promise<any> {
    // Chercher par slug de l'organisation
    const organization = await this.organizationRepository.findOne({
      where: { slug, actif: true },
    });

    if (!organization) {
      throw new NotFoundException('Boutique non trouvée');
    }

    const storefront = await this.storefrontRepository.findOne({
      where: { organizationId: organization.id, isActive: true },
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non activée');
    }

    const skip = (page - 1) * limit;

    const queryBuilder = this.articleRepository.createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .leftJoinAndSelect('article.modesVente', 'modesVente')
      .where('article.organizationId = :organizationId', { organizationId: storefront.organizationId })
      .andWhere('article.disponibleEnLigne = :disponibleEnLigne', { disponibleEnLigne: true });

    if (search) {
      queryBuilder.andWhere('LOWER(article.nom) LIKE LOWER(:search)', { search: `%${search}%` });
    }

    if (categorieId) {
      queryBuilder.andWhere('article.categorieId = :categorieId', { categorieId });
    }

    queryBuilder.orderBy('article.nom', 'ASC').skip(skip).take(limit);

    const [articles, total] = await queryBuilder.getManyAndCount();

    // Transformer pour inclure le prix en ligne
    const data = articles.map(article => this.mapArticleToProduct(article));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async getProduct(slug: string, productId: string): Promise<any> {
    // Chercher par slug de l'organisation
    const organization = await this.organizationRepository.findOne({
      where: { slug, actif: true },
    });

    if (!organization) {
      throw new NotFoundException('Boutique non trouvée');
    }

    const storefront = await this.storefrontRepository.findOne({
      where: { organizationId: organization.id, isActive: true },
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non activée');
    }

    const article = await this.articleRepository.findOne({
      where: {
        id: productId,
        organizationId: storefront.organizationId,
        disponibleEnLigne: true,
      },
      relations: ['categorie', 'modesVente'],
    });

    if (!article) {
      throw new NotFoundException('Produit non trouvé');
    }

    return this.mapArticleToProduct(article);
  }

  async getCategories(slug: string): Promise<any[]> {
    // Chercher par slug de l'organisation
    const organization = await this.organizationRepository.findOne({
      where: { slug, actif: true },
    });

    if (!organization) {
      throw new NotFoundException('Boutique non trouvée');
    }

    const storefront = await this.storefrontRepository.findOne({
      where: { organizationId: organization.id, isActive: true },
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non activée');
    }

    // Récupérer les catégories qui ont des articles disponibles en ligne
    const categories = await this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .where('article.organizationId = :organizationId', { organizationId: storefront.organizationId })
      .andWhere('article.disponibleEnLigne = :disponibleEnLigne', { disponibleEnLigne: true })
      .andWhere('article.categorieId IS NOT NULL')
      .select(['categorie.id', 'categorie.nom'])
      .distinct(true)
      .getRawMany();

    return categories.map(c => ({
      id: c.categorie_id,
      nom: c.categorie_nom,
    }));
  }

  private mapArticleToProduct(article: Article): any {
    return {
      id: article.id,
      nom: article.nom,
      description: article.description,
      photo: article.photo,
      prixEnLigne: (article as any).prixEnLigne || article.prixVente,
      prixOriginal: article.prixVente,
      stock: article.stock,
      categorie: article.categorie?.nom,
      modesVente: article.modesVente?.map(mv => ({
        id: mv.id,
        nom: mv.nom,
        quantiteStock: mv.quantiteStock,
        prix: mv.prixVente,
      })),
    };
  }

  private generateSlug(nom: string): string {
    return nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toResponseDto(storefront: StoreFront): StorefrontResponseDto {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    // Utiliser le slug de l'organisation pour l'URL
    const orgSlug = storefront.organization?.slug || storefront.slug;

    return {
      id: storefront.id,
      organizationId: storefront.organizationId,
      slug: orgSlug,
      isActive: storefront.isActive,
      description: storefront.description,
      logoUrl: storefront.logoUrl,
      whatsappNumber: storefront.whatsappNumber,
      horaires: storefront.horaires,
      fraisLivraison: Number(storefront.fraisLivraison),
      adresse: storefront.adresse,
      // La position vient de l'organisation: c'est le lieu physique du commerce,
      // saisi à l'inscription plutôt que dans les réglages de la vitrine.
      latitude:
        storefront.organization?.latitude != null
          ? Number(storefront.organization.latitude)
          : undefined,
      longitude:
        storefront.organization?.longitude != null
          ? Number(storefront.organization.longitude)
          : undefined,
      organizationNom: storefront.organization?.nom || '',
      fullUrl: `${baseUrl}/b/${orgSlug}`,
    };
  }
}
