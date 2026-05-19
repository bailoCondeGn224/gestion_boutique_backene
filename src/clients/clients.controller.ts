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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard, CurrentOrganization } from '../common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('clients')
@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('clients.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau client' })
  @ApiResponse({ status: 201, description: 'Client créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(
    @Body() createClientDto: CreateClientDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.clientsService.create(organizationId, createClientDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister tous les clients (paginés avec filtres)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des clients' })
  findAll(
    @Query() filterDto: ClientFilterDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.clientsService.findAll(organizationId, filterDto);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les statistiques des clients' })
  @ApiResponse({ status: 200, description: 'Statistiques globales des clients' })
  getStats(@CurrentOrganization() organizationId: string) {
    return this.clientsService.getStats(organizationId);
  }

  @Get('credits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les clients avec des crédits en cours' })
  @ApiResponse({
    status: 200,
    description: 'Liste des clients ayant des crédits',
  })
  getClientsAvecCredits(@CurrentOrganization() organizationId: string) {
    return this.clientsService.getClientsAvecCredits(organizationId);
  }

  @Get('top')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top clients par montant total d\'achats' })
  @ApiResponse({ status: 200, description: 'Liste des meilleurs clients' })
  getTopClients(
    @Query('limit') limit: string | undefined,
    @CurrentOrganization() organizationId: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.clientsService.getTopClients(organizationId, parsedLimit);
  }

  @Get(':id/historique')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir l\'historique complet d\'un client (achats + paiements + stats)' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Historique du client avec statistiques et bénéfices' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  getHistorique(
    @Param('id') id: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('type') type: 'tous' | 'achats' | 'paiements' | undefined,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.clientsService.getHistorique(
      organizationId,
      id,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        type: type || 'tous',
      },
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir un client par ID' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Client trouvé' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.clientsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('clients.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un client' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Client mis à jour' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.clientsService.update(organizationId, id, updateClientDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('clients.delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un client' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Client supprimé' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.clientsService.remove(organizationId, id);
  }
}
