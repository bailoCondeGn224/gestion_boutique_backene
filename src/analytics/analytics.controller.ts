import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('analytics.read')
  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les statistiques du dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques complètes pour le dashboard analytics',
  })
  getDashboard() {
    return this.analyticsService.getDashboardStats();
  }
}
