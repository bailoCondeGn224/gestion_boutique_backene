import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private permissionsService: PermissionsService,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Vérifier si le nom existe déjà
    const existing = await this.rolesRepository.findOne({
      where: { nom: createRoleDto.nom },
    });

    if (existing) {
      throw new ConflictException(
        `Le rôle "${createRoleDto.nom}" existe déjà`,
      );
    }

    const role = this.rolesRepository.create({
      nom: createRoleDto.nom,
      description: createRoleDto.description,
      actif: createRoleDto.actif !== undefined ? createRoleDto.actif : true,
    });

    // Assigner les permissions si fournies
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      role.permissions = await this.permissionsService.findByIds(
        createRoleDto.permissionIds,
      );
    }

    return await this.rolesRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return await this.rolesRepository.find({
      relations: ['permissions'],
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Rôle avec l'ID ${id} introuvable`);
    }

    return role;
  }

  async findByNom(nom: string): Promise<Role> {
    return await this.rolesRepository.findOne({
      where: { nom },
      relations: ['permissions'],
    });
  }

  async update(id: string, updateRoleDto: Partial<CreateRoleDto>): Promise<Role> {
    const role = await this.findOne(id);

    if (updateRoleDto.nom) {
      role.nom = updateRoleDto.nom;
    }

    if (updateRoleDto.description !== undefined) {
      role.description = updateRoleDto.description;
    }

    if (updateRoleDto.actif !== undefined) {
      role.actif = updateRoleDto.actif;
    }

    if (updateRoleDto.permissionIds) {
      role.permissions = await this.permissionsService.findByIds(
        updateRoleDto.permissionIds,
      );
    }

    return await this.rolesRepository.save(role);
  }

  async assignPermissions(
    roleId: string,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<Role> {
    const role = await this.findOne(roleId);

    role.permissions = await this.permissionsService.findByIds(
      assignPermissionsDto.permissionIds,
    );

    return await this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    await this.rolesRepository.remove(role);
  }

  /**
   * Vérifier si un rôle a une permission spécifique
   */
  async hasPermission(roleId: string, permissionCode: string): Promise<boolean> {
    const role = await this.findOne(roleId);

    return role.permissions.some(
      permission => permission.code === permissionCode,
    );
  }
}
