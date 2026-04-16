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
import { FournisseursService } from './fournisseurs.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FournisseurFilterDto } from './dto/fournisseur-filter.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('fournisseurs')
@Controller('fournisseurs')
export class FournisseursController {
  constructor(private readonly fournisseursService: FournisseursService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau fournisseur' })
  @ApiResponse({ status: 201, description: 'Fournisseur créé avec succès' })
  create(@Body() createFournisseurDto: CreateFournisseurDto) {
    return this.fournisseursService.create(createFournisseurDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les fournisseurs (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des fournisseurs' })
  findAll(@Query() filterDto: FournisseurFilterDto) {
    return this.fournisseursService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.read')
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques globales des fournisseurs' })
  @ApiResponse({ status: 200, description: 'Statistiques globales' })
  getGlobalStats() {
    return this.fournisseursService.getGlobalStats();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.read')
  @Get(':id/details')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les détails complets d\'un fournisseur' })
  @ApiResponse({
    status: 200,
    description: 'Détails complets avec approvisionnements et versements récents',
  })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  getDetails(@Param('id') id: string) {
    return this.fournisseursService.getDetails(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.read')
  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques d\'un fournisseur' })
  @ApiResponse({ status: 200, description: 'Statistiques du fournisseur' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  getStats(@Param('id') id: string) {
    return this.fournisseursService.getStats(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.read')
  @Get(':id/dettes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer la dette actuelle d\'un fournisseur' })
  @ApiResponse({ status: 200, description: 'Dette du fournisseur' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  getDette(@Param('id') id: string) {
    return this.fournisseursService.getDette(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un fournisseur par ID' })
  @ApiResponse({ status: 200, description: 'Détails du fournisseur' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  findOne(@Param('id') id: string) {
    return this.fournisseursService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un fournisseur' })
  @ApiResponse({ status: 200, description: 'Fournisseur mis à jour' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  update(
    @Param('id') id: string,
    @Body() updateFournisseurDto: UpdateFournisseurDto,
  ) {
    return this.fournisseursService.update(id, updateFournisseurDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('fournisseurs.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un fournisseur' })
  @ApiResponse({ status: 200, description: 'Fournisseur supprimé' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  remove(@Param('id') id: string) {
    return this.fournisseursService.remove(id);
  }
}
