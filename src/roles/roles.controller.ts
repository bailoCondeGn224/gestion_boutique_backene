import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau rôle' })
  @ApiResponse({ status: 201, description: 'Rôle créé' })
  @ApiResponse({ status: 409, description: 'Nom déjà existant' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les rôles' })
  @ApiResponse({ status: 200, description: 'Liste des rôles avec leurs permissions' })
  findAll() {
    return this.rolesService.findAll();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un rôle par ID' })
  @ApiResponse({ status: 200, description: 'Rôle trouvé' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un rôle' })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable' })
  update(@Param('id') id: string, @Body() updateRoleDto: CreateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.update')
  @Post(':id/permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assigner des permissions à un rôle' })
  @ApiResponse({ status: 200, description: 'Permissions assignées' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable' })
  assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, assignPermissionsDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un rôle' })
  @ApiResponse({ status: 200, description: 'Rôle supprimé' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
