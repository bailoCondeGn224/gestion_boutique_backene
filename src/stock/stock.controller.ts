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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { StockFilterDto } from './dto/stock-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel article' })
  @ApiResponse({ status: 201, description: 'Article créé avec succès' })
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.stockService.create(createArticleDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les articles (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des articles' })
  findAll(@Query() filterDto: StockFilterDto) {
    return this.stockService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.read')
  @Get('alerts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les articles en alerte (stock faible)' })
  @ApiResponse({ status: 200, description: 'Articles dont le stock est <= au seuil' })
  findAlerts() {
    return this.stockService.findAlerts();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.read')
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques du stock' })
  @ApiResponse({ status: 200, description: 'Statistiques globales' })
  getStats() {
    return this.stockService.getStats();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.read')
  @Get('zones/:zone')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les articles d\'une zone spécifique' })
  @ApiResponse({ status: 200, description: 'Articles de la zone' })
  findByZone(@Param('zone') zone: string) {
    return this.stockService.findByZone(zone);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un article par ID' })
  @ApiResponse({ status: 200, description: 'Détails de l\'article' })
  @ApiResponse({ status: 404, description: 'Article introuvable' })
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un article' })
  @ApiResponse({ status: 200, description: 'Article mis à jour' })
  @ApiResponse({ status: 404, description: 'Article introuvable' })
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.stockService.update(id, updateArticleDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('stock.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un article' })
  @ApiResponse({ status: 200, description: 'Article supprimé' })
  @ApiResponse({ status: 404, description: 'Article introuvable' })
  remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
