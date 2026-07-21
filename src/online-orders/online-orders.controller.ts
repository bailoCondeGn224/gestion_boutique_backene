// src/online-orders/online-orders.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { OnlineOrdersService } from './online-orders.service';
import { CancelOrderDto } from './dto';
import { OnlineOrderStatut } from './entities/online-order.entity';

@ApiTags('online-orders')
@Controller('online-orders')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class OnlineOrdersController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des commandes en ligne' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'statut', required: false, enum: OnlineOrderStatut })
  getOrders(
    @CurrentOrganization() organizationId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('statut') statut?: OnlineOrderStatut,
  ) {
    return this.onlineOrdersService.getByOrganization(organizationId, Number(page), Number(limit), statut);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des commandes' })
  getStats(@CurrentOrganization() organizationId: string) {
    return this.onlineOrdersService.getStats(organizationId);
  }

  @Get('pending-count')
  @ApiOperation({ summary: 'Nombre de commandes en attente' })
  getPendingCount(@CurrentOrganization() organizationId: string) {
    return this.onlineOrdersService.getPendingCount(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une commande' })
  getOrder(@Param('id') id: string) {
    return this.onlineOrdersService.getById(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmer une commande' })
  confirmOrder(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
    @Request() req,
  ) {
    return this.onlineOrdersService.confirm(id, organizationId, req.user.id);
  }

  @Patch(':id/ready')
  @ApiOperation({ summary: 'Marquer une commande comme prête' })
  markReady(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.onlineOrdersService.markReady(id, organizationId);
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Marquer une commande comme livrée' })
  markDelivered(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.onlineOrdersService.markDelivered(id, organizationId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une commande' })
  cancelOrder(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.onlineOrdersService.cancel(id, organizationId, dto);
  }
}
