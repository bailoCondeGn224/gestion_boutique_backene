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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovisionnementService } from './approvisionnements.service';
import { CreateApprovisionnementDto } from './dto/create-approvisionnement.dto';
import { UpdateApprovisionnementDto } from './dto/update-approvisionnement.dto';
import { ApprovisionnementFilterDto } from './dto/approvisionnement-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('approvisionnements')
@Controller('approvisionnements')
export class ApprovisionnementController {
  constructor(
    private readonly approvisionnementService: ApprovisionnementService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enregistrer un nouvel approvisionnement' })
  @ApiResponse({
    status: 201,
    description: 'Approvisionnement créé avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(@Body() createDto: CreateApprovisionnementDto, @Request() req) {
    // Ajouter l'utilisateur authentifié pour la traçabilité
    createDto.userId = req.user.id;
    createDto.userNom = req.user.nom;
    return this.approvisionnementService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister tous les approvisionnements (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des approvisionnements' })
  findAll(@Query() filterDto: ApprovisionnementFilterDto) {
    return this.approvisionnementService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.read')
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques globales des approvisionnements' })
  @ApiResponse({ status: 200, description: 'Statistiques globales' })
  getStatsGlobales() {
    return this.approvisionnementService.getStatsGlobales();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.read')
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
  ) {
    return this.approvisionnementService.findByFournisseur(
      fournisseurId,
      paginationDto,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.read')
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
  getStatsFournisseur(@Param('fournisseurId') fournisseurId: string) {
    return this.approvisionnementService.getStatsFournisseur(fournisseurId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir un approvisionnement par ID' })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiResponse({ status: 200, description: 'Approvisionnement trouvé' })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  findOne(@Param('id') id: string) {
    return this.approvisionnementService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un approvisionnement' })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiResponse({ status: 200, description: 'Approvisionnement mis à jour' })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApprovisionnementDto,
  ) {
    return this.approvisionnementService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('approvisionnements.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un approvisionnement' })
  @ApiParam({ name: 'id', description: 'ID de l\'approvisionnement' })
  @ApiResponse({ status: 200, description: 'Approvisionnement supprimé' })
  @ApiResponse({ status: 404, description: 'Approvisionnement introuvable' })
  remove(@Param('id') id: string) {
    return this.approvisionnementService.remove(id);
  }
}
