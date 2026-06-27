import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZakatService } from './zakat.service';
import { CreateZakatDto } from './dto/create-zakat.dto';
import { UpdateZakatDto } from './dto/update-zakat.dto';
import { UpdateZakatSettingsDto } from './dto/update-settings.dto';

@Controller('zakat')
@UseGuards(JwtAuthGuard)
export class ZakatController {
  constructor(private readonly zakatService: ZakatService) {}

  /**
   * Créer un nouveau calcul de Zakat
   */
  @Post()
  async create(@Body() createZakatDto: CreateZakatDto, @Request() req) {
    return this.zakatService.create(
      createZakatDto,
      req.user.organizationId,
      req.user.id,
    );
  }

  /**
   * Récupérer tous les calculs de Zakat
   */
  @Get()
  async findAll(@Request() req) {
    return this.zakatService.findAll(req.user.organizationId);
  }

  /**
   * Récupérer les statistiques Zakat
   */
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.zakatService.getStatistics(req.user.organizationId);
  }

  /**
   * Récupérer les paramètres actuels (prix or, argent, bétail, nisab)
   */
  @Get('settings')
  async getSettings(
    @Request() req,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true';
    return this.zakatService.getSettings(req.user.organizationId, forceRefresh);
  }

  /**
   * Mettre à jour les paramètres (prix bétail, taux de change)
   */
  @Put('settings')
  async updateSettings(
    @Body() updateSettingsDto: UpdateZakatSettingsDto,
    @Request() req,
  ) {
    return this.zakatService.updateSettings(
      req.user.organizationId,
      updateSettingsDto,
    );
  }

  /**
   * Récupérer les données pré-remplies (stock, créances, dettes)
   */
  @Get('prefilled')
  async getPrefilledData(@Request() req) {
    return this.zakatService.getPrefilledData(req.user.organizationId);
  }

  /**
   * Récupérer un calcul de Zakat par ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.zakatService.findOne(id, req.user.organizationId);
  }

  /**
   * Mettre à jour un calcul de Zakat
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateZakatDto: UpdateZakatDto,
    @Request() req,
  ) {
    return this.zakatService.update(id, updateZakatDto, req.user.organizationId);
  }

  /**
   * Marquer une Zakat comme payée
   */
  @Patch(':id/pay')
  async markAsPaid(@Param('id') id: string, @Request() req) {
    return this.zakatService.markAsPaid(id, req.user.organizationId);
  }

  /**
   * Supprimer un calcul de Zakat
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.zakatService.remove(id, req.user.organizationId);
    return { message: 'Calcul Zakat supprimé' };
  }
}
