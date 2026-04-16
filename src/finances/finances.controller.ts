import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FinancesService } from './finances.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('finances')
@Controller('finances')
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('finances.read')
  @Get('tresorerie')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le solde de trésorerie disponible' })
  @ApiResponse({ status: 200, description: 'Solde, recettes et dépenses totales' })
  getTresorerie() {
    return this.financesService.getTresorerie();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('finances.read')
  @Get('recettes-mois')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les recettes du mois en cours' })
  @ApiResponse({ status: 200, description: 'Total et nombre de recettes du mois' })
  getRecettesMois() {
    return this.financesService.getRecettesMois();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('finances.read')
  @Get('depenses-mois')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les dépenses du mois en cours' })
  @ApiResponse({ status: 200, description: 'Total et nombre de dépenses du mois' })
  getDepensesMois() {
    return this.financesService.getDepensesMois();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('finances.read')
  @Get('charges-breakdown')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer la répartition des charges par catégorie' })
  @ApiResponse({ status: 200, description: 'Répartition des dépenses' })
  getChargesBreakdown() {
    return this.financesService.getChargesBreakdown();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('finances.read')
  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer l\'historique des transactions (paginé)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des transactions récentes' })
  getTransactions(@Query() paginationDto: PaginationDto) {
    return this.financesService.getTransactions(paginationDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('finances.read')
  @Get('rapport-mensuel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le rapport financier complet du mois' })
  @ApiResponse({ status: 200, description: 'Rapport mensuel détaillé' })
  getRapportMensuel() {
    return this.financesService.getRapportMensuel();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('finances.read')
  @Get('stats-periode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les statistiques pour une période donnée' })
  @ApiQuery({ name: 'debut', required: true, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'fin', required: true, type: String, example: '2026-12-31' })
  @ApiResponse({ status: 200, description: 'Statistiques de la période' })
  getStatsPeriode(@Query('debut') debut: string, @Query('fin') fin: string) {
    return this.financesService.getStatsPeriode(
      new Date(debut),
      new Date(fin),
    );
  }
}
