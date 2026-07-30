// src/livreurs/livreurs.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { LivreursService } from './livreurs.service';
import {
  CreateLivreurDto,
  UpdateLivreurDto,
  LivreurLoginDto,
  UpdatePositionDto,
} from './dto';

// ========== Contrôleur Backoffice (authentifié) ==========
@ApiTags('livreurs')
@Controller('livreurs')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class LivreursController {
  constructor(private readonly livreursService: LivreursService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un livreur' })
  create(
    @Body() dto: CreateLivreurDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.livreursService.create(dto, organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des livreurs' })
  findAll(@CurrentOrganization() organizationId: string) {
    return this.livreursService.findAll(organizationId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Liste des livreurs actifs' })
  findActive(@CurrentOrganization() organizationId: string) {
    return this.livreursService.findActive(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un livreur' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.livreursService.findOne(id, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un livreur' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLivreurDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.livreursService.update(id, dto, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un livreur' })
  delete(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.livreursService.delete(id, organizationId);
  }
}

// ========== Contrôleur Public (vitrine) ==========
@ApiTags('livreurs-public')
@Controller('public/livreurs')
export class LivreursPublicController {
  constructor(private readonly livreursService: LivreursService) {}

  @Post('login')
  @ApiOperation({ summary: 'Connexion livreur' })
  login(@Body() dto: LivreurLoginDto) {
    return this.livreursService.login(dto);
  }
}

// ========== Contrôleur Livreur Authentifié ==========
@ApiTags('livreurs-auth')
@Controller('livreur')
@ApiBearerAuth()
export class LivreurAuthController {
  constructor(private readonly livreursService: LivreursService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Profil du livreur connecté' })
  getProfile(@Request() req) {
    // Le token contient le type 'livreur' et sub = livreurId
    return this.livreursService.getProfile(req.user.sub || req.user.id);
  }

  @Post('position')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mettre à jour la position GPS' })
  updatePosition(@Request() req, @Body() dto: UpdatePositionDto) {
    return this.livreursService.updatePosition(req.user.sub || req.user.id, dto);
  }

  @Post('start-delivery')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Démarrer le mode livraison' })
  startDelivery(@Request() req) {
    return this.livreursService.startDelivering(req.user.sub || req.user.id);
  }

  @Post('stop-delivery')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Arrêter le mode livraison' })
  stopDelivery(@Request() req) {
    return this.livreursService.stopDelivering(req.user.sub || req.user.id);
  }
}
