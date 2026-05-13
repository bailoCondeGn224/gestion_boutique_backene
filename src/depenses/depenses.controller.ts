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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { DepensesService } from './depenses.service';
import { CreateDepenseDto } from './dto/create-depense.dto';
import { UpdateDepenseDto } from './dto/update-depense.dto';
import { DepenseFilterDto } from './dto/depense-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantGuard, CurrentOrganization } from '../common';

@ApiTags('depenses')
@Controller('depenses')
export class DepensesController {
  constructor(private readonly depensesService: DepensesService) {}

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('depenses.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer une nouvelle dépense',
  })
  @ApiResponse({ status: 201, description: 'Dépense créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(
    @Body() createDepenseDto: CreateDepenseDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.depensesService.create(
      createDepenseDto,
      organizationId,
      req.user.id,
      req.user.nom,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('depenses.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Récupérer toutes les dépenses avec filtres et pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des dépenses récupérée avec succès',
  })
  findAll(
    @CurrentOrganization() organizationId: string,
    @Query() filters: DepenseFilterDto,
  ) {
    return this.depensesService.findAll(organizationId, filters);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('depenses.read')
  @Get('statistics')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtenir les statistiques de dépenses',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
  })
  getStatistics(
    @CurrentOrganization() organizationId: string,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.depensesService.getStatistics(
      organizationId,
      dateDebut,
      dateFin,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('depenses.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Récupérer une dépense par ID',
  })
  @ApiResponse({ status: 200, description: 'Dépense récupérée avec succès' })
  @ApiResponse({ status: 404, description: 'Dépense non trouvée' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.depensesService.findOne(id, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('depenses.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mettre à jour une dépense',
  })
  @ApiResponse({ status: 200, description: 'Dépense mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Dépense non trouvée' })
  update(
    @Param('id') id: string,
    @Body() updateDepenseDto: UpdateDepenseDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.depensesService.update(id, updateDepenseDto, organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('depenses.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Supprimer une dépense',
  })
  @ApiResponse({ status: 200, description: 'Dépense supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Dépense non trouvée' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.depensesService.remove(id, organizationId);
  }
}
