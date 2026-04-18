import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // Vérifier si le code existe déjà
    const existing = await this.permissionsRepository.findOne({
      where: { code: createPermissionDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `La permission avec le code "${createPermissionDto.code}" existe déjà`,
      );
    }

    const permission = this.permissionsRepository.create(createPermissionDto);
    return await this.permissionsRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return await this.permissionsRepository.find({
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission avec l'ID ${id} introuvable`);
    }

    return permission;
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return await this.permissionsRepository.findByIds(ids);
  }

  async findByCode(code: string): Promise<Permission> {
    return await this.permissionsRepository.findOne({
      where: { code },
    });
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findOne(id);

    // Vérifier s'il existe des rôles utilisant cette permission
    const rolesWithPermission = await this.rolesRepository
      .createQueryBuilder('role')
      .leftJoin('role.permissions', 'permission')
      .where('permission.id = :permissionId', { permissionId: id })
      .getCount();

    if (rolesWithPermission > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette permission : ${rolesWithPermission} rôle(s) l'utilisent. Retirez d'abord la permission des rôles.`,
      );
    }

    await this.permissionsRepository.remove(permission);
  }

  /**
   * Grouper les permissions par module (ex: ventes, stock, users)
   */
  async getGroupedByModule(): Promise<Record<string, Permission[]>> {
    const permissions = await this.findAll();

    const grouped: Record<string, Permission[]> = {};

    permissions.forEach(permission => {
      const module = permission.code.split('.')[0]; // Ex: "ventes" from "ventes.create"

      if (!grouped[module]) {
        grouped[module] = [];
      }

      grouped[module].push(permission);
    });

    return grouped;
  }
}
