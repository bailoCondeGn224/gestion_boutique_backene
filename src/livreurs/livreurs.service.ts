// src/livreurs/livreurs.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Livreur } from './entities/livreur.entity';
import { StoreFront } from '../storefront/entities/storefront.entity';
import {
  CreateLivreurDto,
  UpdateLivreurDto,
  LivreurResponseDto,
  LivreurLoginDto,
  UpdatePositionDto,
} from './dto';

@Injectable()
export class LivreursService {
  constructor(
    @InjectRepository(Livreur)
    private livreurRepository: Repository<Livreur>,
    @InjectRepository(StoreFront)
    private storefrontRepository: Repository<StoreFront>,
    private jwtService: JwtService,
  ) {}

  async create(dto: CreateLivreurDto, organizationId: string): Promise<LivreurResponseDto> {
    // Vérifier si le téléphone existe déjà pour cette organisation
    const existing = await this.livreurRepository.findOne({
      where: { telephone: dto.telephone, organizationId },
    });

    if (existing) {
      throw new BadRequestException('Un livreur avec ce numéro existe déjà');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const livreur = this.livreurRepository.create({
      ...dto,
      password: hashedPassword,
      organizationId,
    });

    const saved = await this.livreurRepository.save(livreur);
    return this.toResponseDto(saved);
  }

  async findAll(organizationId: string): Promise<LivreurResponseDto[]> {
    const livreurs = await this.livreurRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    return livreurs.map(l => this.toResponseDto(l));
  }

  async findActive(organizationId: string): Promise<LivreurResponseDto[]> {
    const livreurs = await this.livreurRepository.find({
      where: { organizationId, isActive: true },
      order: { nom: 'ASC' },
    });

    return livreurs.map(l => this.toResponseDto(l));
  }

  async findOne(id: string, organizationId: string): Promise<LivreurResponseDto> {
    const livreur = await this.livreurRepository.findOne({
      where: { id, organizationId },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    return this.toResponseDto(livreur);
  }

  async update(id: string, dto: UpdateLivreurDto, organizationId: string): Promise<LivreurResponseDto> {
    const livreur = await this.livreurRepository.findOne({
      where: { id, organizationId },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    // Si changement de téléphone, vérifier l'unicité
    if (dto.telephone && dto.telephone !== livreur.telephone) {
      const existing = await this.livreurRepository.findOne({
        where: { telephone: dto.telephone, organizationId },
      });

      if (existing) {
        throw new BadRequestException('Un livreur avec ce numéro existe déjà');
      }
    }

    // Si nouveau mot de passe, le hasher
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(livreur, dto);
    const saved = await this.livreurRepository.save(livreur);
    return this.toResponseDto(saved);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const livreur = await this.livreurRepository.findOne({
      where: { id, organizationId },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    await this.livreurRepository.remove(livreur);
  }

  // ========== Authentification Livreur (via vitrine) ==========

  async login(dto: LivreurLoginDto): Promise<{ token: string; livreur: LivreurResponseDto }> {
    // Trouver la boutique par slug
    const storefront = await this.storefrontRepository.findOne({
      where: { slug: dto.storeSlug, isActive: true },
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée');
    }

    // Trouver le livreur
    const livreur = await this.livreurRepository.findOne({
      where: { telephone: dto.telephone, organizationId: storefront.organizationId },
    });

    if (!livreur) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!livreur.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(dto.password, livreur.password);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Générer le token JWT
    const payload = {
      sub: livreur.id,
      type: 'livreur',
      organizationId: storefront.organizationId,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      token,
      livreur: this.toResponseDto(livreur),
    };
  }

  async getProfile(livreurId: string): Promise<LivreurResponseDto> {
    const livreur = await this.livreurRepository.findOne({
      where: { id: livreurId },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    return this.toResponseDto(livreur);
  }

  // ========== Tracking GPS ==========

  async updatePosition(livreurId: string, dto: UpdatePositionDto): Promise<void> {
    const livreur = await this.livreurRepository.findOne({
      where: { id: livreurId },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    await this.livreurRepository.update(livreurId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      lastPositionAt: new Date(),
    });
  }

  async startDelivering(livreurId: string): Promise<void> {
    await this.livreurRepository.update(livreurId, {
      isDelivering: true,
    });
  }

  async stopDelivering(livreurId: string): Promise<void> {
    await this.livreurRepository.update(livreurId, {
      isDelivering: false,
      latitude: null,
      longitude: null,
    });
  }

  async getPosition(livreurId: string): Promise<{ latitude: number; longitude: number; lastPositionAt: Date } | null> {
    const livreur = await this.livreurRepository.findOne({
      where: { id: livreurId },
      select: ['latitude', 'longitude', 'lastPositionAt', 'isDelivering'],
    });

    if (!livreur || !livreur.isDelivering || !livreur.latitude || !livreur.longitude) {
      return null;
    }

    return {
      latitude: Number(livreur.latitude),
      longitude: Number(livreur.longitude),
      lastPositionAt: livreur.lastPositionAt,
    };
  }

  private toResponseDto(livreur: Livreur): LivreurResponseDto {
    return {
      id: livreur.id,
      nom: livreur.nom,
      telephone: livreur.telephone,
      email: livreur.email,
      photo: livreur.photo,
      isActive: livreur.isActive,
      isDelivering: livreur.isDelivering,
      latitude: livreur.latitude ? Number(livreur.latitude) : undefined,
      longitude: livreur.longitude ? Number(livreur.longitude) : undefined,
      lastPositionAt: livreur.lastPositionAt,
      createdAt: livreur.createdAt,
    };
  }
}
