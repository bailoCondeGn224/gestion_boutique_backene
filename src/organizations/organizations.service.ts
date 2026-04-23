import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    const organization = this.organizationsRepository.create(createOrganizationDto);
    return this.organizationsRepository.save(organization);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organisation avec l'ID ${id} introuvable`);
    }

    return organization;
  }

  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException(`Organisation avec le slug ${slug} introuvable`);
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);
    Object.assign(organization, updateOrganizationDto);
    return this.organizationsRepository.save(organization);
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id);
    await this.organizationsRepository.remove(organization);
  }
}
