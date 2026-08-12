import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { PlansService } from '../plans/plans.service';
import { RolesService } from '../roles/roles.service';
import { SmsService } from '../sms/sms.service';
import { OrganizationStatus } from './enums/organization-status.enum';
import { PlanCode } from '../plans/enums/plan-code.enum';
import { generateRandomPassword } from '../common/utils/password-generator.util';
import { UpdateOrganizationPositionDto } from './dto/update-organization-position.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
    private plansService: PlansService,
    @Inject(forwardRef(() => RolesService))
    private rolesService: RolesService,
    private smsService: SmsService,
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

  /**
   * Met à jour la seule position de la boutique.
   *
   * Séparée de update(): celle-ci est réservée au super-admin et touche au plan,
   * au slug et à l'abonnement. Ici l'admin de la boutique ne modifie que son
   * point de départ de livraison, sur sa propre organisation.
   */
  async updatePosition(
    organizationId: string,
    dto: UpdateOrganizationPositionDto,
  ): Promise<Organization> {
    const organization = await this.findOne(organizationId);

    organization.latitude = dto.latitude;
    organization.longitude = dto.longitude;

    return this.organizationsRepository.save(organization);
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

  // ==================== NOUVELLES MÉTHODES POUR INSCRIPTION CLIENT ====================

  /**
   * Inscription d'une nouvelle organisation par un client
   * L'organisation est créée avec statut "en_attente" et plan gratuit
   * Un utilisateur admin est créé en même temps (transaction)
   */
  async register(registerDto: RegisterOrganizationDto): Promise<{ organization: Organization; message: string }> {
    const { proprietaire, ...orgData } = registerDto;

    // Vérifications d'unicité pour l'organisation
    await this.checkUniqueFields(orgData);

    // Vérifier si l'email du propriétaire existe déjà
    const existingUser = await this.usersRepository.findOne({
      where: { email: proprietaire.email },
    });
    if (existingUser) {
      throw new ConflictException(
        `Un utilisateur avec l'email "${proprietaire.email}" existe déjà`,
      );
    }

    // Récupérer le plan gratuit
    const planGratuit = await this.plansService.findByCode(PlanCode.FREE);

    // Récupérer le rôle ADMIN
    const roleAdmin = await this.rolesService.findByNom('ADMIN');
    if (!roleAdmin) {
      throw new BadRequestException('Le rôle ADMIN n\'existe pas dans le système');
    }

    // Générer un mot de passe aléatoire
    const generatedPassword = generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Utiliser une transaction pour créer organisation + utilisateur
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Créer l'organisation
      const organization = queryRunner.manager.create(Organization, {
        ...orgData,
        plan: planGratuit,
        statut: OrganizationStatus.EN_ATTENTE,
        actif: false,
        // Stocker temporairement le mot de passe généré (sera effacé après approbation)
        motifRejet: `PWD:${generatedPassword}`,
      });
      const savedOrganization = await queryRunner.manager.save(Organization, organization);

      // 2. Créer l'utilisateur admin lié à l'organisation
      const adminUser = queryRunner.manager.create(User, {
        nom: proprietaire.nom,
        email: proprietaire.email,
        password: hashedPassword,
        role: roleAdmin,
        organization: savedOrganization,
        mustChangePassword: true,
      });
      await queryRunner.manager.save(User, adminUser);

      // 3. Commit de la transaction
      await queryRunner.commitTransaction();

      // 4. Envoyer SMS de confirmation (après le commit)
      await this.smsService.sendPendingRegistrationSms(
        proprietaire.telephone,
        orgData.nom,
      );

      return {
        organization: savedOrganization,
        message: 'Votre demande d\'inscription a été soumise avec succès. Vous recevrez un SMS une fois votre compte approuvé.',
      };
    } catch (error) {
      // Rollback en cas d'erreur
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Libérer le queryRunner
      await queryRunner.release();
    }
  }

  /**
   * Liste des organisations en attente d'approbation
   */
  async findPending(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where: { statut: OrganizationStatus.EN_ATTENTE },
      relations: ['plan'],
      order: { createdAt: 'ASC' }, // Les plus anciennes en premier
    });
  }

  /**
   * Approuver une organisation et envoyer les identifiants par SMS
   */
  async approve(id: string): Promise<{ organization: Organization; message: string }> {
    const organization = await this.findOne(id);

    if (organization.statut === OrganizationStatus.APPROUVE) {
      throw new BadRequestException('Cette organisation est déjà approuvée');
    }

    // Récupérer l'utilisateur admin de cette organisation
    const adminUser = await this.usersRepository.findOne({
      where: { organization: { id: organization.id } },
      relations: ['role'],
    });

    if (!adminUser) {
      throw new BadRequestException('Aucun utilisateur admin trouvé pour cette organisation');
    }

    // Extraire le mot de passe temporaire stocké
    let generatedPassword = '';
    if (organization.motifRejet && organization.motifRejet.startsWith('PWD:')) {
      generatedPassword = organization.motifRejet.replace('PWD:', '');
    } else {
      // Générer un nouveau mot de passe si non trouvé
      generatedPassword = generateRandomPassword(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      adminUser.password = hashedPassword;
      adminUser.mustChangePassword = true;
      await this.usersRepository.save(adminUser);
    }

    // Activer l'organisation
    organization.statut = OrganizationStatus.APPROUVE;
    organization.actif = true;
    organization.motifRejet = null; // Effacer le mot de passe temporaire

    const savedOrganization = await this.organizationsRepository.save(organization);

    // Envoyer SMS avec les identifiants
    await this.smsService.sendApprovalSms(
      organization.telephone,
      organization.nom,
      adminUser.email,
      generatedPassword,
    );

    return {
      organization: savedOrganization,
      message: `Organisation approuvée. SMS envoyé à ${organization.telephone} avec les identifiants.`,
    };
  }

  /**
   * Rejeter une organisation et envoyer un SMS de notification
   */
  async reject(id: string, rejectDto: RejectOrganizationDto): Promise<{ organization: Organization; message: string }> {
    const organization = await this.findOne(id);

    if (organization.statut === OrganizationStatus.REJETE) {
      throw new BadRequestException('Cette organisation est déjà rejetée');
    }

    organization.statut = OrganizationStatus.REJETE;
    organization.actif = false;
    organization.motifRejet = rejectDto.motif;

    const savedOrganization = await this.organizationsRepository.save(organization);

    // Envoyer SMS de rejet
    await this.smsService.sendRejectionSms(
      organization.telephone,
      organization.nom,
      rejectDto.motif,
    );

    return {
      organization: savedOrganization,
      message: `Organisation rejetée. SMS envoyé à ${organization.telephone}.`,
    };
  }

  /**
   * Suspendre une organisation
   */
  async suspend(id: string, motif: string): Promise<{ organization: Organization; message: string }> {
    const organization = await this.findOne(id);

    if (organization.statut === OrganizationStatus.SUSPENDU) {
      throw new BadRequestException('Cette organisation est déjà suspendue');
    }

    organization.statut = OrganizationStatus.SUSPENDU;
    organization.actif = false;
    organization.motifRejet = motif;

    const savedOrganization = await this.organizationsRepository.save(organization);

    // Envoyer SMS de suspension
    await this.smsService.sendSuspensionSms(
      organization.telephone,
      organization.nom,
      motif,
    );

    return {
      organization: savedOrganization,
      message: `Organisation suspendue. SMS envoyé à ${organization.telephone}.`,
    };
  }

  /**
   * Réactiver une organisation suspendue
   */
  async reactivate(id: string): Promise<{ organization: Organization; message: string }> {
    const organization = await this.findOne(id);

    if (organization.statut !== OrganizationStatus.SUSPENDU) {
      throw new BadRequestException('Seule une organisation suspendue peut être réactivée');
    }

    organization.statut = OrganizationStatus.APPROUVE;
    organization.actif = true;
    organization.motifRejet = null;

    const savedOrganization = await this.organizationsRepository.save(organization);

    // Envoyer SMS de réactivation
    await this.smsService.sendReactivationSms(
      organization.telephone,
      organization.nom,
    );

    return {
      organization: savedOrganization,
      message: `Organisation réactivée. SMS envoyé à ${organization.telephone}.`,
    };
  }

  /**
   * Vérifier l'unicité des champs (méthode utilitaire)
   */
  private async checkUniqueFields(dto: Partial<RegisterOrganizationDto>, excludeId?: string): Promise<void> {
    const checks = [
      { field: 'nom', value: dto.nom },
      { field: 'slug', value: dto.slug },
      { field: 'email', value: dto.email },
      { field: 'telephone', value: dto.telephone },
      { field: 'rccm', value: dto.rccm },
      { field: 'nif', value: dto.nif },
      { field: 'registreCommerce', value: dto.registreCommerce },
    ];

    for (const check of checks) {
      if (check.value) {
        const existing = await this.organizationsRepository.findOne({
          where: { [check.field]: check.value },
        });
        if (existing && existing.id !== excludeId) {
          throw new ConflictException(
            `Une organisation avec ce ${check.field} existe déjà`,
          );
        }
      }
    }
  }
}
