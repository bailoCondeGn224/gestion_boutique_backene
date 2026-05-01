import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  create(
    @Body() createUserDto: CreateUserDto,
    @Request() req,
  ) {
    // Récupérer les infos du créateur
    const creatorOrganizationId = req.user.organizationId || null;
    const isSuperAdmin = req.user.isSuperAdmin || false;

    return this.usersService.create(createUserDto, creatorOrganizationId, isSuperAdmin);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les utilisateurs (paginés)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des utilisateurs' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Request() req,
  ) {
    // Récupérer l'organizationId de l'utilisateur connecté
    // null pour SUPER_ADMIN (verra tous les utilisateurs)
    const organizationId = req.user.organizationId || null;
    return this.usersService.findAll(paginationDto, organizationId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID' })
  @ApiResponse({ status: 200, description: 'Détails de l\'utilisateur' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.update')
  @Post(':id/role')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assigner un rôle à un utilisateur' })
  @ApiResponse({ status: 200, description: 'Rôle assigné avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur ou rôle introuvable' })
  assignRole(@Param('id') id: string, @Body() assignRoleDto: AssignRoleDto) {
    return this.usersService.assignRole(id, assignRoleDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé' })
  @ApiResponse({ status: 400, description: 'Impossible de se supprimer soi-même ou dernier admin' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user.id);
  }
}
