import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { IsSuperAdmin } from '../common/decorators/is-super-admin.decorator';

@ApiTags('Admin Dashboard')
@Controller('admin-dashboard')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats/global')
  @IsSuperAdmin()
  @ApiOperation({
    summary: 'Obtenir les statistiques globales de la plateforme',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques globales (organizations, users, ventes, etc.)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux super administrateurs',
  })
  getGlobalStats() {
    return this.dashboardService.getGlobalStats();
  }

  @Get('organizations')
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Lister toutes les organizations' })
  @ApiResponse({ status: 200, description: 'Liste de toutes les organizations' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux super administrateurs',
  })
  getAllOrganizations() {
    return this.dashboardService.getAllOrganizations();
  }

  @Get('organizations/:id')
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Obtenir les détails d\'une organization' })
  @ApiParam({ name: 'id', description: 'ID de l\'organization' })
  @ApiResponse({
    status: 200,
    description: 'Détails de l\'organization avec statistiques',
  })
  @ApiResponse({ status: 404, description: 'Organization introuvable' })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux super administrateurs',
  })
  getOrganizationDetails(@Param('id') id: string) {
    return this.dashboardService.getOrganizationDetails(id);
  }

  @Get('stats/by-plan')
  @IsSuperAdmin()
  @ApiOperation({
    summary: 'Répartition des organizations par plan',
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre d\'organizations par plan',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux super administrateurs',
  })
  getOrganizationsByPlan() {
    return this.dashboardService.getOrganizationsByPlan();
  }

  @Get('activity/recent')
  @IsSuperAdmin()
  @ApiOperation({
    summary: 'Obtenir l\'activité récente (nouvelles orgs et utilisateurs)',
  })
  @ApiResponse({
    status: 200,
    description: 'Activité récente de la plateforme',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux super administrateurs',
  })
  getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  @Get('stats/growth')
  @IsSuperAdmin()
  @ApiOperation({
    summary: 'Statistiques de croissance (mois actuel vs mois dernier)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de croissance des organizations et users',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès réservé aux super administrateurs',
  })
  getGrowthStats() {
    return this.dashboardService.getGrowthStats();
  }
}
