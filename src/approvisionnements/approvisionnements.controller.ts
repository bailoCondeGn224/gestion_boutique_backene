import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ApprovisionnementService } from './approvisionnements.service';
import { CreateApprovisionnementDto } from './dto/create-approvisionnement.dto';
import { UpdateApprovisionnementDto } from './dto/update-approvisionnement.dto';
import { ApprovisionnementFilterDto } from './dto/approvisionnement-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard, CurrentOrganization } from '../common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('approvisionnements')
@Controller('approvisionnements')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ApprovisionnementController {
  constructor(
    private readonly approvisionnementService: ApprovisionnementService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('approvisionnements.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enregistrer un nouvel approvisionnement' })
  @ApiResponse({
    status: 201,
    description: 'Approvisionnement créé avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(
    @Body() createDto: CreateApprovisionnementDto,
    @CurrentOrganization() organizationId: string,
    @Request() req,
  ) {
    // Ajouter l'utilisateur authentifié pour la traçabilité
    createDto.userId = req.user.id;
    createDto.userNom = req.user.nom;
    return this.approvisionnementService.create(createDto, organizationId);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister tous les approvisionnements (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des approvisionnements' })
  findAll(
    @Query() filterDto: ApprovisionnementFilterDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.approvisionnementService.findAll(filterDto, organizationId);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques globales des approvisionnements' })
  @ApiResponse({ status: 200, description: 'Statistiques globales' })
  getStatsGlobales(@CurrentOrganization() organizationId: string) {
    return this.approvisionnementService.getStatsGlobales(organizationId);
  }

  @Get('fournisseur/:fournisseurId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lister les approvisionnements d\'un fournisseur (paginés)',
  })
  @ApiParam({ name: 'fournisseurId', description: 'ID du fournisseur' })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des approvisionnements du fournisseur',
  })
  findByFournisseur(
    @Param('fournisseurId') fournisseurId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.approvisionnementService.findByFournisseur(
      organizationId,
      fournisseurId,
      paginationDto,
    );
  }

  @Get('fournisseur/:fournisseurId/stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Statistiques des approvisionnements d\'un fournisseur',
  })
  @ApiParam({ name: 'fournisseurId', description: 'ID du fournisseur' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des approvisionnements',
  })
  getStatsFournisseur(
    @Param('fournisseurId') fournisseurId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.approvisionnementService.getStatsFournisseur(fournisseurId, organizationId);
  }

  @Get(':id/lignes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les lignes paginées d\'un approvisionnement' })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiResponse({ status: 200, description: 'Lignes paginées' })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  getApproLignes(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.approvisionnementService.getApproLignes(
      id,
      organizationId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir un approvisionnement par ID' })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiResponse({ status: 200, description: 'Approvisionnement trouvé' })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.approvisionnementService.findOne(id, organizationId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('approvisionnements.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un approvisionnement' })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiResponse({ status: 200, description: 'Approvisionnement mis à jour' })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApprovisionnementDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.approvisionnementService.update(id, updateDto, organizationId);
  }

  @Post(':id/annuler')
  @UseGuards(PermissionsGuard)
  @Permissions('approvisionnements.delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler un approvisionnement (conservé pour traçabilité)' })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        motifAnnulation: {
          type: 'string',
          description: 'Raison de l\'annulation',
          example: 'Erreur de commande',
        },
      },
      required: ['motifAnnulation'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Approvisionnement annulé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Annulation impossible - Articles déjà vendus',
  })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  annuler(
    @Param('id') id: string,
    @Body('motifAnnulation') motifAnnulation: string,
    @CurrentOrganization() organizationId: string,
    @Request() req,
  ) {
    return this.approvisionnementService.annuler(
      id,
      organizationId,
      motifAnnulation,
      req.user?.id,
      req.user?.nom,
    );
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('approvisionnements.delete')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Supprimer définitivement un approvisionnement',
    description: 'ATTENTION: Supprime complètement l\'enregistrement. Préférer l\'annulation pour garder la traçabilité.',
  })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiResponse({ status: 200, description: 'Approvisionnement supprimé définitivement' })
  @ApiResponse({
    status: 400,
    description: 'Suppression impossible - Articles déjà vendus',
  })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.approvisionnementService.remove(id, organizationId);
  }
}
