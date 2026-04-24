import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneFilterDto } from './dto/zone-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zonesRepository: Repository<Zone>,
  ) {}

  async create(createZoneDto: CreateZoneDto, organizationId: string): Promise<Zone> {
    // Vérifier si le code existe déjà dans cette organisation
    const existingZone = await this.zonesRepository.findOne({
      where: { code: createZoneDto.code, organizationId },
    });

    if (existingZone) {
      throw new BadRequestException(`Une zone avec le code "${createZoneDto.code}" existe déjà`);
    }

    const zone = this.zonesRepository.create({
      ...createZoneDto,
      organizationId,
    });
    return this.zonesRepository.save(zone);
  }

  async findAll(organizationId: string, filterDto?: ZoneFilterDto): Promise<PaginatedResponse<Zone>> {
    const { page = 1, limit = 10, search, actif } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.zonesRepository.createQueryBuilder('zone');

    // Filtrage par organization (CRITIQUE pour multi-tenant)
    queryBuilder.where('zone.organizationId = :organizationId', { organizationId });

    // Filtre par recherche (code, nom, description)
    if (search) {
      queryBuilder.andWhere(
        '(zone.code LIKE :search OR zone.nom LIKE :search OR zone.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filtre par statut actif
    if (actif !== undefined) {
      queryBuilder.andWhere('zone.actif = :actif', { actif });
    }

    const [data, total] = await queryBuilder
      .orderBy('zone.code', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findActives(organizationId: string): Promise<Zone[]> {
    return this.zonesRepository.find({
      where: { actif: true, organizationId },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Zone> {
    const zone = await this.zonesRepository.findOne({
      where: { id, organizationId },
      relations: ['categories'],
    });

    if (!zone) {
      throw new NotFoundException(`Zone avec l'ID ${id} introuvable`);
    }

    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto, organizationId: string): Promise<Zone> {
    const zone = await this.findOne(id, organizationId);

    // Si le code change, vérifier qu'il n'existe pas déjà dans cette organisation
    if (updateZoneDto.code && updateZoneDto.code !== zone.code) {
      const existingZone = await this.zonesRepository.findOne({
        where: { code: updateZoneDto.code, organizationId },
      });

      if (existingZone) {
        throw new BadRequestException(`Une zone avec le code "${updateZoneDto.code}" existe déjà`);
      }
    }

    Object.assign(zone, updateZoneDto);
    return this.zonesRepository.save(zone);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const zone = await this.zonesRepository.findOne({
      where: { id, organizationId },
      relations: ['categories'],
    });

    if (!zone) {
      throw new NotFoundException(`Zone avec l'ID ${id} introuvable`);
    }

    // Vérifier s'il existe des catégories liées
    if (zone.categories && zone.categories.length > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette zone : ${zone.categories.length} catégorie(s) associée(s). Réassignez d'abord les catégories.`,
      );
    }

    await this.zonesRepository.remove(zone);
  }
}
