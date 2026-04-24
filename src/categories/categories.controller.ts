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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard, CurrentOrganization } from '../common';
import { CategoriesService } from './categories.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('categories.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle catégorie' })
  create(
    @Body() createDto: CreateCategorieDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.categoriesService.create(createDto, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('categories.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les catégories (paginées)' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.categoriesService.findAll(organizationId, paginationDto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('categories.read')
  @Get('active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les catégories actives' })
  findActive(@CurrentOrganization() organizationId: string) {
    return this.categoriesService.findActive(organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('categories.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une catégorie par ID' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.categoriesService.findOne(id, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('categories.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une catégorie' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCategorieDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.categoriesService.update(id, updateDto, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('categories.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.categoriesService.remove(id, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('categories.create')
  @Post('seed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Charger les catégories par défaut' })
  seed(@CurrentOrganization() organizationId: string) {
    return this.categoriesService.seedDefaultCategories(organizationId);
  }
}

