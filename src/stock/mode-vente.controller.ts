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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModeVenteService } from './mode-vente.service';
import { CreateModeVenteDto } from './dto/create-mode-vente.dto';
import { UpdateModeVenteDto } from './dto/update-mode-vente.dto';
import { TenantGuard } from '../common';

@ApiTags('Modes de Vente')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('modes-vente')
export class ModeVenteController {
  constructor(private readonly modeVenteService: ModeVenteService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un mode de vente' })
  @ApiResponse({ status: 201, description: 'Mode de vente créé' })
  create(@Body() createDto: CreateModeVenteDto, @Request() req) {
    return this.modeVenteService.create(createDto, req.user.organizationId);
  }

  @Get('article/:articleId')
  @ApiOperation({ summary: 'Récupérer les modes de vente d\'un article' })
  @ApiResponse({ status: 200, description: 'Liste des modes de vente' })
  findByArticle(
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @Request() req,
  ) {
    return this.modeVenteService.findByArticle(articleId, req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un mode de vente par ID' })
  @ApiResponse({ status: 200, description: 'Mode de vente trouvé' })
  @ApiResponse({ status: 404, description: 'Mode de vente non trouvé' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.modeVenteService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un mode de vente' })
  @ApiResponse({ status: 200, description: 'Mode de vente modifié' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateModeVenteDto,
    @Request() req,
  ) {
    return this.modeVenteService.update(id, updateDto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un mode de vente' })
  @ApiResponse({ status: 200, description: 'Mode de vente supprimé' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.modeVenteService.remove(id, req.user.organizationId);
  }
}
