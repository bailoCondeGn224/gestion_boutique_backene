import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('permissions.manage')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle permission' })
  @ApiResponse({ status: 201, description: 'Permission créée' })
  @ApiResponse({ status: 409, description: 'Code déjà existant' })
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('permissions.manage')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les permissions' })
  @ApiResponse({ status: 200, description: 'Liste des permissions' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('permissions.manage')
  @Get('grouped')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les permissions groupées par module' })
  @ApiResponse({ status: 200, description: 'Permissions groupées' })
  getGroupedByModule() {
    return this.permissionsService.getGroupedByModule();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('permissions.manage')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une permission par ID' })
  @ApiResponse({ status: 200, description: 'Permission trouvée' })
  @ApiResponse({ status: 404, description: 'Permission introuvable' })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('permissions.manage')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une permission' })
  @ApiResponse({ status: 200, description: 'Permission supprimée' })
  @ApiResponse({ status: 404, description: 'Permission introuvable' })
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
