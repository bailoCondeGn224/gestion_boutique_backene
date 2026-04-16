import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MouvementsStockService } from './mouvements-stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MouvementFilterDto } from './dto/mouvement-filter.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Mouvements Stock')
@Controller('mouvements') // ✅ Route corrigée : /mouvements au lieu de /mouvements-stock
export class MouvementsStockController {
  constructor(
    private readonly mouvementsStockService: MouvementsStockService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('mouvements.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les mouvements de stock (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des mouvements' })
  async findAll(@Query() filterDto: MouvementFilterDto) {
    return await this.mouvementsStockService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('mouvements.read')
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques globales des mouvements' })
  @ApiResponse({ status: 200, description: 'Statistiques des entrées et sorties' })
  async getStats() {
    return await this.mouvementsStockService.getStats();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('mouvements.read')
  @Get('article/:articleId')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer l'historique d'un article" })
  @ApiResponse({ status: 200, description: 'Mouvements de l\'article' })
  async findByArticle(
    @Param('articleId') articleId: string,
    @Query() filterDto: MouvementFilterDto,
  ) {
    return await this.mouvementsStockService.findByArticle(articleId, filterDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('mouvements.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un mouvement par ID' })
  @ApiResponse({ status: 200, description: 'Détails du mouvement' })
  async findOne(@Param('id') id: string) {
    return await this.mouvementsStockService.findOne(id);
  }
}
