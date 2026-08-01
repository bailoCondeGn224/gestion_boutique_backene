import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Livreur } from './entities/livreur.entity';
import { CreateLivreurDto } from './dto/create-livreur.dto';
import { UpdateLivreurDto } from './dto/update-livreur.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { LoginLivreurDto } from './dto/login-livreur.dto';

@Injectable()
export class LivreursService {
  constructor(
    @InjectRepository(Livreur)
    private livreurRepository: Repository<Livreur>,
    private jwtService: JwtService,
  ) {}

  async create(organizationId: string, dto: CreateLivreurDto): Promise<Livreur> {
    const existing = await this.livreurRepository.findOne({
      where: { telephone: dto.telephone },
    });
    if (existing) {
      throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const livreur = this.livreurRepository.create({
      nom: dto.nom,
      telephone: dto.telephone,
      organizationId,
      passwordHash,
    });
    return this.livreurRepository.save(livreur);
  }

  async findAll(organizationId: string): Promise<Livreur[]> {
    return this.livreurRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(organizationId: string, id: string): Promise<Livreur> {
    const livreur = await this.livreurRepository.findOne({
      where: { id, organizationId },
    });
    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }
    return livreur;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateLivreurDto,
  ): Promise<Livreur> {
    const livreur = await this.findOne(organizationId, id);

    if (dto.password) {
      livreur.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.nom !== undefined) livreur.nom = dto.nom;
    if (dto.telephone !== undefined) livreur.telephone = dto.telephone;
    if (dto.isActive !== undefined) livreur.isActive = dto.isActive;

    return this.livreurRepository.save(livreur);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const livreur = await this.findOne(organizationId, id);
    await this.livreurRepository.remove(livreur);
  }

  async login(
    dto: LoginLivreurDto,
  ): Promise<{ access_token: string; livreur: Partial<Livreur> }> {
    const livreur = await this.livreurRepository.findOne({
      where: { telephone: dto.telephone, isActive: true },
    });

    if (!livreur) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isValid = await bcrypt.compare(dto.password, livreur.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = {
      sub: livreur.id,
      telephone: livreur.telephone,
      organizationId: livreur.organizationId,
      type: 'livreur',
    };

    return {
      access_token: this.jwtService.sign(payload),
      livreur: {
        id: livreur.id,
        nom: livreur.nom,
        telephone: livreur.telephone,
        organizationId: livreur.organizationId,
      },
    };
  }

  async updatePosition(livreurId: string, dto: UpdatePositionDto): Promise<Livreur> {
    const livreur = await this.livreurRepository.findOne({
      where: { id: livreurId },
    });
    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    livreur.latitude = dto.latitude;
    livreur.longitude = dto.longitude;
    livreur.lastPositionAt = new Date();

    return this.livreurRepository.save(livreur);
  }

  async findById(id: string): Promise<Livreur | null> {
    return this.livreurRepository.findOne({ where: { id, isActive: true } });
  }
}
