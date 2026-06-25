import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { RolesService } from '../roles/roles.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private rolesService: RolesService,
    private organizationsService: OrganizationsService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    creatorOrganizationId: string | null,
    isSuperAdmin: boolean = false,
  ): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Récupérer le rôle si roleId est fourni
    let role = null;
    if (createUserDto.roleId) {
      role = await this.rolesService.findOne(createUserDto.roleId);
    }

    // LOGIQUE DE SÉCURITÉ POUR L'ORGANIZATION
    let targetOrganizationId: string | null = null;

    if (isSuperAdmin) {
      // CAS 1: SUPER_ADMIN crée un utilisateur
      // Il DOIT spécifier l'organizationId dans le DTO
      if (!createUserDto.organizationId) {
        throw new BadRequestException(
          'Le SUPER_ADMIN doit spécifier l\'organizationId lors de la création d\'un utilisateur',
        );
      }
      targetOrganizationId = createUserDto.organizationId;
    } else {
      // CAS 2: ADMIN crée un utilisateur
      // On utilise TOUJOURS son organizationId (sécurité)
      // On ignore l'organizationId du DTO même s'il est fourni
      if (!creatorOrganizationId) {
        throw new BadRequestException(
          'Impossible de créer un utilisateur sans organization',
        );
      }
      targetOrganizationId = creatorOrganizationId;
    }

    // Récupérer l'organisation
    let organization = null;
    if (targetOrganizationId) {
      organization = await this.organizationsService.findOne(targetOrganizationId);
    }

    // Créer l'utilisateur avec les relations
    const { roleId, organizationId, ...userData } = createUserDto;
    const user = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
      role,
      organization,
    });

    return this.usersRepository.save(user);
  }

  async findAll(paginationDto?: PaginationDto, organizationId?: string | null): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    // Construire le queryBuilder pour filtrer par organizationId si nécessaire
    const queryBuilder = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('user.organization', 'organization')
      .leftJoinAndSelect('organization.plan', 'plan')
      .select([
        'user.id',
        'user.email',
        'user.nom',
        'user.roleId',
        'user.isSuperAdmin',
        'user.actif',
        'user.createdAt',
        'user.updatedAt',
        'role.id',
        'role.nom',
        'role.description',
        'permissions.id',
        'permissions.code',
        'permissions.nom',
        'organization.id',
        'organization.nom',
        'organization.slug',
        'plan.id',
        'plan.nom',
      ]);

    // Filtrer par organizationId seulement si fourni
    // SUPER_ADMIN (organizationId = null) voit tous les utilisateurs
    // ADMIN (organizationId = son org) voit seulement ses utilisateurs
    if (organizationId) {
      queryBuilder.where('user.organizationId = :organizationId', { organizationId });
    }

    const [data, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'nom', 'isSuperAdmin', 'actif', 'createdAt', 'updatedAt'],
      relations: ['role', 'role.permissions', 'organization', 'organization.plan'],
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} introuvable`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions', 'organization', 'organization.plan'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string, currentUserId?: string): Promise<void> {
    const user = await this.findOne(id);

    // Empêcher l'auto-suppression
    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }

    // Vérifier si c'est un admin
    if (user.role && user.role.nom === 'ADMIN') {
      // Compter le nombre d'admins
      const adminCount = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoin('user.role', 'role')
        .where('role.nom = :roleName', { roleName: 'ADMIN' })
        .getCount();

      // Empêcher la suppression du dernier admin
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Impossible de supprimer le dernier administrateur du système',
        );
      }
    }

    // Utiliser delete() au lieu de remove() pour éviter les erreurs
    await this.usersRepository.delete({ id: user.id });
  }

  async assignRole(userId: string, assignRoleDto: AssignRoleDto): Promise<User> {
    const user = await this.findOne(userId);

    // Vérifier que le rôle existe
    const role = await this.rolesService.findOne(assignRoleDto.roleId);

    user.role = role;
    return await this.usersRepository.save(user);
  }

  async findOneWithPassword(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} introuvable`);
    }

    return user;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      mustChangePassword: false,
    });
  }

  async toggleStatus(id: string, actif: boolean, currentUserId?: string): Promise<User> {
    const user = await this.findOne(id);

    // Empêcher la désactivation de son propre compte
    if (currentUserId && id === currentUserId && !actif) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte');
    }

    // Empêcher la désactivation d'un super admin
    if (user.isSuperAdmin) {
      throw new BadRequestException('Impossible de désactiver un super administrateur');
    }

    // Mettre à jour le statut
    await this.usersRepository.update(id, { actif });

    // Retourner l'utilisateur complet avec toutes les relations
    return this.findOne(id);
  }
}
