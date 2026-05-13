import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventairesService } from './inventaires.service';
import { CreateInventaireDto } from './dto/create-inventaire.dto';
import { AddComptageDto } from './dto/add-comptage.dto';
import { Inventaire } from './entities/inventaire.entity';
import { ComptageInventaire } from './entities/comptage-inventaire.entity';

@ApiTags('Inventaires')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventaires')
export class InventairesController {
  constructor(private readonly inventairesService: InventairesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel inventaire' })
  create(
    @Body() createInventaireDto: CreateInventaireDto,
    @Request() req,
  ): Promise<Inventaire> {
    return this.inventairesService.create(
      createInventaireDto,
      req.user.userId,
      req.user.organizationId,
      req.user.nom || 'Utilisateur',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Liste des inventaires' })
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: Inventaire[]; meta: any }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.inventairesService.findAll(req.user.organizationId, pageNum, limitNum);
  }

  @Get('date-min')
  @ApiOperation({ summary: 'Date minimale autorisée pour un nouvel inventaire' })
  async getDateMin(@Request() req): Promise<{ dateMin: string | null }> {
    return this.inventairesService.getDateMin(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un inventaire' })
  findOne(@Param('id') id: string, @Request() req): Promise<Inventaire> {
    return this.inventairesService.findOne(id, req.user.organizationId);
  }

  @Post(':id/comptages')
  @ApiOperation({ summary: 'Ajouter un comptage d\'article' })
  addComptage(
    @Param('id') id: string,
    @Body() addComptageDto: AddComptageDto,
    @Request() req,
  ): Promise<ComptageInventaire> {
    return this.inventairesService.addComptage(
      id,
      addComptageDto,
      req.user.organizationId,
      req.user.nom || 'Utilisateur',
    );
  }

  @Get(':id/ecarts')
  @ApiOperation({ summary: 'Liste des écarts d\'un inventaire' })
  getEcarts(
    @Param('id') id: string,
    @Request() req,
  ): Promise<ComptageInventaire[]> {
    return this.inventairesService.getEcarts(id, req.user.organizationId);
  }

  @Post(':id/valider')
  @ApiOperation({ summary: 'Valider l\'inventaire et ajuster les stocks' })
  valider(@Param('id') id: string, @Request() req): Promise<Inventaire> {
    return this.inventairesService.valider(
      id,
      req.user.organizationId,
      req.user.userId,
    );
  }

  @Post(':id/calculer-finances')
  @ApiOperation({ summary: 'Calculer les finances d\'un inventaire' })
  calculerFinances(
    @Param('id') id: string,
    @Request() req,
  ): Promise<Inventaire> {
    return this.inventairesService.calculerFinances(
      id,
      req.user.organizationId,
    );
  }

  @Get(':id/finances-data')
  @ApiOperation({ summary: 'Récupérer les données financières pour génération PDF' })
  async getFinancesData(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.inventairesService.getFinancesData(
      id,
      req.user.organizationId,
    );
  }

  @Get(':id/test-pdf')
  @ApiOperation({ summary: 'Tester la génération PDF basique' })
  async testPDF(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    return this.inventairesService.generateTestPDF(res);
  }

  @Post(':id/save-pdf-debug')
  @ApiOperation({ summary: 'Sauvegarder le PDF sur le disque pour debug' })
  async savePDFDebug(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string; path: string }> {
    return this.inventairesService.savePDFToFile(
      id,
      req.user.organizationId,
    );
  }
}
