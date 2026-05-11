import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { RetoursService } from './retours.service';
import { CreateRetourClientDto } from './dto/create-retour-client.dto';
import { CreateRetourFournisseurDto } from './dto/create-retour-fournisseur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@ApiTags('retours')
@Controller('retours')
export class RetoursController {
  constructor(private readonly retoursService: RetoursService) {}

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('client')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer l\'historique des retours clients' })
  @ApiResponse({ status: 200, description: 'Liste des retours clients' })
  getRetoursClients(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.retoursService.getRetoursClients(organizationId, page, limit);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('client/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques des retours clients' })
  @ApiResponse({ status: 200, description: 'Statistiques des retours clients' })
  getStatsRetoursClients(@CurrentOrganization() organizationId: string) {
    return this.retoursService.getStatsRetoursClients(organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('client/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détails d\'un retour client' })
  @ApiResponse({ status: 200, description: 'Détails du retour client' })
  @ApiResponse({ status: 404, description: 'Retour client non trouvé' })
  getRetourClient(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.retoursService.getRetourClient(id, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('fournisseur')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer l\'historique des retours fournisseurs' })
  @ApiResponse({ status: 200, description: 'Liste des retours fournisseurs' })
  getRetoursFournisseurs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.retoursService.getRetoursFournisseurs(organizationId, page, limit);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('fournisseur/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques des retours fournisseurs' })
  @ApiResponse({ status: 200, description: 'Statistiques des retours fournisseurs' })
  getStatsRetoursFournisseurs(@CurrentOrganization() organizationId: string) {
    return this.retoursService.getStatsRetoursFournisseurs(organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('retours.create')
  @Post('client')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Créer un retour client (incrémente le stock, ajuste finances client)',
  })
  @ApiResponse({ status: 201, description: 'Retour client créé avec succès' })
  @ApiResponse({
    status: 400,
    description: 'Quantité invalide ou vente introuvable',
  })
  @ApiResponse({ status: 404, description: 'Vente ou client introuvable' })
  createRetourClient(
    @Body() dto: CreateRetourClientDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    dto.userId = req.user.id;
    dto.userNom = req.user.nom;
    return this.retoursService.createRetourClient(dto, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('retours.create')
  @Post('fournisseur')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Créer un retour fournisseur (décrémente le stock, ajuste finances fournisseur)',
  })
  @ApiResponse({
    status: 201,
    description: 'Retour fournisseur créé avec succès',
  })
  @ApiResponse({
    status: 400,
    description:
      'Quantité invalide, stock insuffisant ou approvisionnement introuvable',
  })
  @ApiResponse({
    status: 404,
    description: 'Approvisionnement ou fournisseur introuvable',
  })
  createRetourFournisseur(
    @Body() dto: CreateRetourFournisseurDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    dto.userId = req.user.id;
    dto.userNom = req.user.nom;
    return this.retoursService.createRetourFournisseur(dto, organizationId);
  }
}
