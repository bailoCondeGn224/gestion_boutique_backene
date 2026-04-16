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
import { VersementFilterDto } from './dto/versement-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('versements')
@Controller('versements')
export class VersementsController {
  constructor(private readonly versementsService: VersementsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('versements.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enregistrer un nouveau paiement fournisseur (met à jour la dette)',
  })
  @ApiResponse({ status: 201, description: 'Versement enregistré avec succès' })
  @ApiResponse({ status: 400, description: 'Montant supérieur à la dette' })
  create(@Body() createVersementDto: CreateVersementDto) {
    return this.versementsService.create(createVersementDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('versements.read')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les versements (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des versements' })
  findAll(@Query() filterDto: VersementFilterDto) {
    return this.versementsService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('versements.read')
  @Get('montants-mois')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le total des versements du mois' })
  @ApiResponse({ status: 200, description: 'Total des paiements du mois' })
  getMontantsMois() {
    return this.versementsService.getMontantsMois();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('versements.read')
  @Get('fournisseur/:fournisseurId')
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
  ) {
    return this.versementsService.findByFournisseur(fournisseurId, paginationDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('versements.read')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un versement par ID' })
  @ApiResponse({ status: 200, description: 'Détails du versement' })
  @ApiResponse({ status: 404, description: 'Versement introuvable' })
  findOne(@Param('id') id: string) {
    return this.versementsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('versements.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un versement' })
  @ApiResponse({ status: 200, description: 'Versement mis à jour' })
  @ApiResponse({ status: 404, description: 'Versement introuvable' })
  update(
    @Param('id') id: string,
    @Body() updateVersementDto: UpdateVersementDto,
  ) {
    return this.versementsService.update(id, updateVersementDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('versements.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler un versement (restaure la dette)' })
  @ApiResponse({ status: 200, description: 'Versement annulé' })
  @ApiResponse({ status: 404, description: 'Versement introuvable' })
  remove(@Param('id') id: string) {
    return this.versementsService.remove(id);
  }
}
