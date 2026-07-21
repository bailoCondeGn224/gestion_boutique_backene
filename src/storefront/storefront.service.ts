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
    const storefront = await this.storefrontRepository.findOne({
      where: { slug, isActive: true },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée');
    }

    return this.toResponseDto(storefront);
  }

  async getProducts(slug: string, page: number = 1, limit: number = 20): Promise<any> {
    const storefront = await this.storefrontRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée');
    }

    const skip = (page - 1) * limit;

    const queryBuilder = this.articleRepository.createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .leftJoinAndSelect('article.modesVente', 'modesVente')
      .where('article.organizationId = :organizationId', { organizationId: storefront.organizationId })
      .andWhere('article.disponibleEnLigne = :disponibleEnLigne', { disponibleEnLigne: true })
      .orderBy('article.nom', 'ASC')
      .skip(skip)
      .take(limit);

    const [articles, total] = await queryBuilder.getManyAndCount();

    // Transformer pour inclure le prix en ligne
    const data = articles.map(article => ({
      id: article.id,
      nom: article.nom,
      description: article.description,
      photoUrl: article.photo,
      prix: (article as any).prixEnLigne || article.prixVente,
      prixOriginal: article.prixVente,
      stock: article.stock,
      categorie: article.categorie?.nom,
      modesVente: article.modesVente?.map(mv => ({
        id: mv.id,
        nom: mv.nom,
        quantiteStock: mv.quantiteStock,
        prix: mv.prixVente,
      })),
    }));

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

    return {
      id: storefront.id,
      organizationId: storefront.organizationId,
      slug: storefront.slug,
      isActive: storefront.isActive,
      description: storefront.description,
      logoUrl: storefront.logoUrl,
      whatsappNumber: storefront.whatsappNumber,
      horaires: storefront.horaires,
      fraisLivraison: Number(storefront.fraisLivraison),
      adresse: storefront.adresse,
      organizationNom: storefront.organization?.nom || '',
      fullUrl: `${baseUrl}/b/${storefront.slug}`,
    };
  }
}
