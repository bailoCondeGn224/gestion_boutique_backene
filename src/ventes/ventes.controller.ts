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
import { VentesService } from './ventes.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { VenteFilterDto } from './dto/vente-filter.dto';

@ApiTags('ventes')
@Controller('ventes')
export class VentesController {
  constructor(private readonly ventesService: VentesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer une nouvelle vente (décrémente automatiquement le stock)',
  })
  @ApiResponse({ status: 201, description: 'Vente créée avec succès' })
  @ApiResponse({ status: 400, description: 'Stock insuffisant' })
  create(@Body() createVenteDto: CreateVenteDto, @Request() req) {
    // Ajouter l'utilisateur authentifié pour la traçabilité
    createVenteDto.userId = req.user.id;
    createVenteDto.userNom = req.user.nom;
    return this.ventesService.create(createVenteDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les ventes (paginées avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des ventes' })
  findAll(@Query() filterDto: VenteFilterDto) {
    return this.ventesService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.read')
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques de ventes (jour, semaine, mois)' })
  @ApiResponse({ status: 200, description: 'Statistiques de ventes' })
  getStats() {
    return this.ventesService.getStats();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.read')
  @Get('recent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les ventes de la dernière heure' })
  @ApiResponse({ status: 200, description: 'Ventes récentes' })
  findRecent() {
    return this.ventesService.findRecent();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une vente par ID' })
  @ApiResponse({ status: 200, description: 'Détails de la vente' })
  @ApiResponse({ status: 404, description: 'Vente introuvable' })
  findOne(@Param('id') id: string) {
    return this.ventesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une vente' })
  @ApiResponse({ status: 200, description: 'Vente mise à jour' })
  @ApiResponse({ status: 404, description: 'Vente introuvable' })
  update(@Param('id') id: string, @Body() updateVenteDto: UpdateVenteDto) {
    return this.ventesService.update(id, updateVenteDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler une vente (restaure le stock)' })
  @ApiResponse({ status: 200, description: 'Vente annulée' })
  @ApiResponse({ status: 404, description: 'Vente introuvable' })
  remove(@Param('id') id: string) {
    return this.ventesService.remove(id);
  }
}
