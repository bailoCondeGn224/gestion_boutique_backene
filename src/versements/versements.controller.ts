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
import { VersementsService } from './versements.service';
import { CreateVersementDto } from './dto/create-versement.dto';
import { UpdateVersementDto } from './dto/update-versement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard, CurrentOrganization } from '../common';
import { VersementFilterDto } from './dto/versement-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('versements')
@Controller('versements')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VersementsController {
  constructor(private readonly versementsService: VersementsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('versements.create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enregistrer un nouveau paiement fournisseur (met à jour la dette)',
  })
  @ApiResponse({ status: 201, description: 'Versement enregistré avec succès' })
  @ApiResponse({ status: 400, description: 'Montant supérieur à la dette' })
  create(
    @Body() createVersementDto: CreateVersementDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsService.create(createVersementDto, organizationId);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('versements.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les versements (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des versements' })
  findAll(
    @Query() filterDto: VersementFilterDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsService.findAll(organizationId, filterDto);
  }

  @Get('montants-mois')
  @UseGuards(PermissionsGuard)
  @Permissions('versements.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le total des versements du mois' })
  @ApiResponse({ status: 200, description: 'Total des paiements du mois' })
  getMontantsMois(@CurrentOrganization() organizationId: string) {
    return this.versementsService.getMontantsMois(organizationId);
  }

  @Get('fournisseur/:fournisseurId')
  @UseGuards(PermissionsGuard)
  @Permissions('versements.read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lister les versements d\'un fournisseur (paginés)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des versements du fournisseur',
  })
  findByFournisseur(
    @Param('fournisseurId') fournisseurId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsService.findByFournisseur(organizationId, fournisseurId, paginationDto);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('versements.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un versement par ID' })
  @ApiResponse({ status: 200, description: 'Détails du versement' })
  @ApiResponse({ status: 404, description: 'Versement introuvable' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('versements.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un versement' })
  @ApiResponse({ status: 200, description: 'Versement mis à jour' })
  @ApiResponse({ status: 404, description: 'Versement introuvable' })
  update(
    @Param('id') id: string,
    @Body() updateVersementDto: UpdateVersementDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsService.update(id, updateVersementDto, organizationId);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('versements.delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler un versement (restaure la dette)' })
  @ApiResponse({ status: 200, description: 'Versement annulé' })
  @ApiResponse({ status: 404, description: 'Versement introuvable' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsService.remove(id, organizationId);
  }
}
