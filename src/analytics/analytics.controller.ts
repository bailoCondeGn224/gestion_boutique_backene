import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantGuard, CurrentOrganization } from '../common';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('analytics.read')
  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les statistiques du dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques complètes pour le dashboard analytics',
  })
  getDashboard(@CurrentOrganization() organizationId: string) {
    return this.analyticsService.getDashboardStats(organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('stock.read')
  @Get('expiration')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques sur les produits expirés et expirant bientôt' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques sur les dates d\'expiration',
  })
  getExpirationStats(@CurrentOrganization() organizationId: string) {
    return this.analyticsService.getExpirationStats(organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('ventes.read')
  @Get('ventes-semaine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les ventes par jour pour les 7 derniers jours' })
  @ApiResponse({
    status: 200,
    description: 'Ventes par jour de la semaine pour le graphique',
  })
  getVentesParJourSemaine(@CurrentOrganization() organizationId: string) {
    return this.analyticsService.getVentesParJourSemaine(organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('ventes.read')
  @Get('revenus-mois')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les revenus par mois pour les 4 derniers mois' })
  @ApiResponse({
    status: 200,
    description: 'Revenus par mois pour le graphique',
  })
  getRevenusParMois(@CurrentOrganization() organizationId: string) {
    return this.analyticsService.getRevenusParMois(organizationId);
  }
}
