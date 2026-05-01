import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    private plansService: PlansService,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    // Vérifier si une organisation avec le même nom existe déjà
    const existingByNom = await this.organizationsRepository.findOne({
      where: { nom: createOrganizationDto.nom },
    });
    if (existingByNom) {
      throw new ConflictException(
        `Une organisation avec le nom "${createOrganizationDto.nom}" existe déjà`,
      );
    }

    // Vérifier si une organisation avec le même slug existe déjà
    const existingBySlug = await this.organizationsRepository.findOne({
      where: { slug: createOrganizationDto.slug },
    });
    if (existingBySlug) {
      throw new ConflictException(
        `Une organisation avec le slug "${createOrganizationDto.slug}" existe déjà`,
      );
    }

    // Vérifier si une organisation avec le même email existe déjà (si fourni)
    if (createOrganizationDto.email) {
      const existingByEmail = await this.organizationsRepository.findOne({
        where: { email: createOrganizationDto.email },
      });
      if (existingByEmail) {
        throw new ConflictException(
          `Une organisation avec l'email "${createOrganizationDto.email}" existe déjà`,
        );
      }
    }

    // Vérifier si une organisation avec le même téléphone existe déjà (si fourni)
    if (createOrganizationDto.telephone) {
      const existingByTelephone = await this.organizationsRepository.findOne({
        where: { telephone: createOrganizationDto.telephone },
      });
      if (existingByTelephone) {
        throw new ConflictException(
          `Une organisation avec le téléphone "${createOrganizationDto.telephone}" existe déjà`,
        );
      }
    }

    // Vérifier si une organisation avec le même RCCM existe déjà (si fourni)
    if (createOrganizationDto.rccm) {
      const existingByRccm = await this.organizationsRepository.findOne({
        where: { rccm: createOrganizationDto.rccm },
      });
      if (existingByRccm) {
        throw new ConflictException(
          `Une organisation avec le RCCM "${createOrganizationDto.rccm}" existe déjà`,
        );
      }
    }

    // Vérifier si une organisation avec le même NIF existe déjà (si fourni)
    if (createOrganizationDto.nif) {
      const existingByNif = await this.organizationsRepository.findOne({
        where: { nif: createOrganizationDto.nif },
      });
      if (existingByNif) {
        throw new ConflictException(
          `Une organisation avec le NIF "${createOrganizationDto.nif}" existe déjà`,
        );
      }
    }

    // Vérifier si une organisation avec le même registre de commerce existe déjà (si fourni)
    if (createOrganizationDto.registreCommerce) {
      const existingByRegistre = await this.organizationsRepository.findOne({
        where: { registreCommerce: createOrganizationDto.registreCommerce },
      });
      if (existingByRegistre) {
        throw new ConflictException(
          `Une organisation avec le registre de commerce "${createOrganizationDto.registreCommerce}" existe déjà`,
        );
      }
    }

    // Récupérer le plan
    const plan = await this.plansService.findOne(createOrganizationDto.planId);

    // Créer l'organisation avec le plan assigné
    const { planId, ...organizationData } = createOrganizationDto;
    const organization = this.organizationsRepository.create({
      ...organizationData,
      plan,
    });

    return this.organizationsRepository.save(organization);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ['plan'],
    });

    if (!organization) {
      throw new NotFoundException(`Organisation avec l'ID ${id} introuvable`);
    }

    return organization;
  }

  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { slug },
      relations: ['plan'],
    });

    if (!organization) {
      throw new NotFoundException(`Organisation avec le slug ${slug} introuvable`);
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);

    // Vérifier si le nom est modifié et s'il existe déjà pour une autre organisation
    if (updateOrganizationDto.nom && updateOrganizationDto.nom !== organization.nom) {
      const existingByNom = await this.organizationsRepository.findOne({
        where: { nom: updateOrganizationDto.nom },
      });
      if (existingByNom && existingByNom.id !== id) {
        throw new ConflictException(
          `Une organisation avec le nom "${updateOrganizationDto.nom}" existe déjà`,
        );
      }
    }

    // Vérifier si le slug est modifié et s'il existe déjà pour une autre organisation
    if (updateOrganizationDto.slug && updateOrganizationDto.slug !== organization.slug) {
      const existingBySlug = await this.organizationsRepository.findOne({
        where: { slug: updateOrganizationDto.slug },
      });
      if (existingBySlug && existingBySlug.id !== id) {
        throw new ConflictException(
          `Une organisation avec le slug "${updateOrganizationDto.slug}" existe déjà`,
        );
      }
    }

    // Vérifier si l'email est modifié et s'il existe déjà pour une autre organisation
    if (updateOrganizationDto.email && updateOrganizationDto.email !== organization.email) {
      const existingByEmail = await this.organizationsRepository.findOne({
        where: { email: updateOrganizationDto.email },
      });
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException(
          `Une organisation avec l'email "${updateOrganizationDto.email}" existe déjà`,
        );
      }
    }

    // Vérifier si le téléphone est modifié et s'il existe déjà pour une autre organisation
    if (updateOrganizationDto.telephone && updateOrganizationDto.telephone !== organization.telephone) {
      const existingByTelephone = await this.organizationsRepository.findOne({
        where: { telephone: updateOrganizationDto.telephone },
      });
      if (existingByTelephone && existingByTelephone.id !== id) {
        throw new ConflictException(
          `Une organisation avec le téléphone "${updateOrganizationDto.telephone}" existe déjà`,
        );
      }
    }

    // Vérifier si le RCCM est modifié et s'il existe déjà pour une autre organisation
    if (updateOrganizationDto.rccm && updateOrganizationDto.rccm !== organization.rccm) {
      const existingByRccm = await this.organizationsRepository.findOne({
        where: { rccm: updateOrganizationDto.rccm },
      });
      if (existingByRccm && existingByRccm.id !== id) {
        throw new ConflictException(
          `Une organisation avec le RCCM "${updateOrganizationDto.rccm}" existe déjà`,
        );
      }
    }

    // Vérifier si le NIF est modifié et s'il existe déjà pour une autre organisation
    if (updateOrganizationDto.nif && updateOrganizationDto.nif !== organization.nif) {
      const existingByNif = await this.organizationsRepository.findOne({
        where: { nif: updateOrganizationDto.nif },
      });
      if (existingByNif && existingByNif.id !== id) {
        throw new ConflictException(
          `Une organisation avec le NIF "${updateOrganizationDto.nif}" existe déjà`,
        );
      }
    }

    // Vérifier si le registre de commerce est modifié et s'il existe déjà pour une autre organisation
    if (updateOrganizationDto.registreCommerce && updateOrganizationDto.registreCommerce !== organization.registreCommerce) {
      const existingByRegistre = await this.organizationsRepository.findOne({
        where: { registreCommerce: updateOrganizationDto.registreCommerce },
      });
      if (existingByRegistre && existingByRegistre.id !== id) {
        throw new ConflictException(
          `Une organisation avec le registre de commerce "${updateOrganizationDto.registreCommerce}" existe déjà`,
        );
      }
    }

    // Si planId est fourni, récupérer le nouveau plan
    if (updateOrganizationDto.planId) {
      const plan = await this.plansService.findOne(updateOrganizationDto.planId);
      const { planId, ...organizationData } = updateOrganizationDto;
      Object.assign(organization, organizationData);
      organization.plan = plan;
    } else {
      Object.assign(organization, updateOrganizationDto);
    }

    return this.organizationsRepository.save(organization);
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id);
    await this.organizationsRepository.remove(organization);
  }
}
