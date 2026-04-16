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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('categories.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle catégorie' })
  create(@Body() createDto: CreateCategorieDto) {
    return this.categoriesService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('categories.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les catégories (paginées)' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.categoriesService.findAll(paginationDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('categories.read')
  @Get('active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les catégories actives' })
  findActive() {
    return this.categoriesService.findActive();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('categories.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une catégorie par ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('categories.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une catégorie' })
  update(@Param('id') id: string, @Body() updateDto: UpdateCategorieDto) {
    return this.categoriesService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('categories.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('categories.create')
  @Post('seed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Charger les catégories par défaut' })
  seed() {
    return this.categoriesService.seedDefaultCategories();
  }
}
