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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { StockService } from './stock.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { StockFilterDto } from './dto/stock-filter.dto';
import { CreateArticlesBulkDto } from './dto/create-articles-bulk.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantGuard, CurrentOrganization } from '../common';
import { multerConfig } from '../common/config/multer.config';

@ApiTags('stock')
@Controller('stock')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Permissions('stock.create')
  @Post()
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel article' })
  @ApiResponse({ status: 201, description: 'Article créé avec succès' })
  create(
    @Body() createArticleDto: CreateArticleDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.stockService.create(createArticleDto, organizationId, file);
  }

  @Permissions('stock.create')
  @Post('bulk')
  @UseInterceptors(AnyFilesInterceptor(multerConfig))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer plusieurs articles en une seule requête avec leurs photos' })
  @ApiResponse({
    status: 201,
    description: 'Retourne les articles créés et les erreurs éventuelles',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'array', items: { type: 'object' } },
        errors: { type: 'array', items: { type: 'object' } }
      }
    }
  })
  async createBulk(
    @Body('articles') articlesJson: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @CurrentOrganization() organizationId: string,
  ) {
    // Parser le JSON des articles depuis le FormData
    let articles: CreateArticleDto[];
    try {
      articles = JSON.parse(articlesJson);
    } catch (error) {
      throw new BadRequestException('Format JSON invalide pour les articles');
    }

    const createArticlesBulkDto: CreateArticlesBulkDto = { articles };

    // Créer un mapping des photos par index depuis les fieldnames (photo_0, photo_1, etc.)
    const photoMap = new Map<number, Express.Multer.File>();
    if (files && files.length > 0) {
      files.forEach((file) => {
        const match = file.fieldname.match(/^photo_(\d+)$/);
        if (match) {
          const index = parseInt(match[1], 10);
          photoMap.set(index, file);
        }
      });
    }

    return this.stockService.createBulk(createArticlesBulkDto, organizationId, photoMap);
  }

  @Permissions('stock.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les articles (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des articles' })
  findAll(
    @Query() filterDto: StockFilterDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.stockService.findAll(filterDto, organizationId);
  }

  @Permissions('stock.read')
  @Get('alerts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les articles en alerte (stock faible)' })
  @ApiResponse({ status: 200, description: 'Articles dont le stock est <= au seuil' })
  findAlerts(@CurrentOrganization() organizationId: string) {
    return this.stockService.findAlerts(organizationId);
  }

  @Permissions('stock.read')
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques du stock' })
  @ApiResponse({ status: 200, description: 'Statistiques globales' })
  getStats(@CurrentOrganization() organizationId: string) {
    return this.stockService.getStats(organizationId);
  }

  @Permissions('stock.read')
  @Get('rotation/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques de rotation du stock (bestsellers, stock mort, taux rotation)' })
  @ApiResponse({ status: 200, description: 'Statistiques de rotation sur 30 jours par défaut' })
  getRotationStats(
    @Query('periode') periode: string | undefined,
    @CurrentOrganization() organizationId: string,
  ) {
    const periodeJours = periode ? parseInt(periode, 10) : 30;
    return this.stockService.getRotationStats(periodeJours, organizationId);
  }

  @Permissions('stock.read')
  @Get('zones/:zone')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les articles d\'une zone spécifique' })
  @ApiResponse({ status: 200, description: 'Articles de la zone' })
  findByZone(
    @Param('zone') zone: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.stockService.findByZone(zone, organizationId);
  }

  @Permissions('stock.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un article par ID' })
  @ApiResponse({ status: 200, description: 'Détails de l\'article' })
  @ApiResponse({ status: 404, description: 'Article introuvable' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.stockService.findOne(id, organizationId);
  }

  @Permissions('stock.update')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un article' })
  @ApiResponse({ status: 200, description: 'Article mis à jour' })
  @ApiResponse({ status: 404, description: 'Article introuvable' })
  update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.stockService.update(id, updateArticleDto, organizationId, file);
  }

  @Permissions('stock.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un article' })
  @ApiResponse({ status: 200, description: 'Article supprimé' })
  @ApiResponse({ status: 404, description: 'Article introuvable' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.stockService.remove(id, organizationId);
  }
}
