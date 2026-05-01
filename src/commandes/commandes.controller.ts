import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommandesService } from './commandes.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { CommandeFilterDto } from './dto/commande-filter.dto';
import { LivrerCommandeDto } from './dto/livrer-commande.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';

@ApiTags('commandes')
@Controller('commandes')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  @Post()
  @Permissions('commandes.create')
  @ApiOperation({ summary: 'Créer une nouvelle commande' })
  create(
    @Body() createCommandeDto: CreateCommandeDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    // Ajouter les informations de traçabilité
    createCommandeDto.userId = req.user.id;
    createCommandeDto.userNom = req.user.nom;

    return this.commandesService.create(createCommandeDto, organizationId);
  }

  @Get()
  @Permissions('commandes.read')
  @ApiOperation({ summary: 'Liste des commandes avec filtres et pagination' })
  findAll(
    @Query() filterDto: CommandeFilterDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.commandesService.findAll(organizationId, filterDto);
  }

  @Get('stats')
  @Permissions('commandes.read')
  @ApiOperation({ summary: 'Statistiques des commandes' })
  getStats(@CurrentOrganization() organizationId: string) {
    return this.commandesService.getStats(organizationId);
  }

  @Get(':id')
  @Permissions('commandes.read')
  @ApiOperation({ summary: 'Détails d\'une commande' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.commandesService.findOne(id, organizationId);
  }

  @Patch(':id')
  @Permissions('commandes.update')
  @ApiOperation({ summary: 'Modifier une commande en attente' })
  update(
    @Param('id') id: string,
    @Body() updateCommandeDto: UpdateCommandeDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.commandesService.update(id, updateCommandeDto, organizationId);
  }

  @Post(':id/livrer')
  @Permissions('commandes.livrer')
  @ApiOperation({ summary: 'Livrer une commande (la transforme en vente)' })
  livrerCommande(
    @Param('id') id: string,
    @Body() livrerCommandeDto: LivrerCommandeDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.commandesService.livrerCommande(
      id,
      livrerCommandeDto,
      organizationId,
      req.user.id,
      req.user.nom,
    );
  }

  @Post(':id/annuler')
  @Permissions('commandes.delete')
  @ApiOperation({ summary: 'Annuler une commande' })
  annulerCommande(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.commandesService.annulerCommande(id, organizationId);
  }

  @Delete(':id')
  @Permissions('commandes.delete')
  @ApiOperation({ summary: 'Supprimer une commande' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.commandesService.remove(id, organizationId);
  }
}
