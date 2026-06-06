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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { VersementsClientService } from './versements-client.service';
import { CreateVersementClientDto } from './dto/create-versement-client.dto';
import { UpdateVersementClientDto } from './dto/update-versement-client.dto';
import { VersementClientFilterDto } from './dto/versement-client-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard, CurrentOrganization } from '../common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Versements Client')
@Controller('versements-client')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VersementsClientController {
  constructor(private readonly versementsClientService: VersementsClientService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('versements.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enregistrer un paiement de dette client' })
  @ApiResponse({ status: 201, description: 'Versement créé avec succès' })
  @ApiResponse({ status: 400, description: 'Montant invalide ou dépasse la dette' })
  create(
    @Body() createDto: CreateVersementClientDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    // Ajouter l'utilisateur pour la traçabilité
    createDto.userId = req.user.id;
    createDto.userNom = req.user.nom;
    return this.versementsClientService.create(organizationId, createDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les versements clients (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des versements' })
  findAll(
    @Query() filterDto: VersementClientFilterDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsClientService.findAll(organizationId, filterDto);
  }

  @Get('client/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les versements d\'un client' })
  @ApiResponse({ status: 200, description: 'Liste des versements du client' })
  findByClient(
    @Param('clientId') clientId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsClientService.findByClient(organizationId, clientId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un versement par ID' })
  @ApiResponse({ status: 200, description: 'Détails du versement' })
  @ApiResponse({ status: 404, description: 'Versement introuvable' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsClientService.findOne(organizationId, id);
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
    @Body() updateDto: UpdateVersementClientDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.versementsClientService.update(organizationId, id, updateDto);
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
    return this.versementsClientService.remove(organizationId, id);
  }
}
