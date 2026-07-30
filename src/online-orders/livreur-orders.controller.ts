// src/online-orders/livreur-orders.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnlineOrdersService } from './online-orders.service';

/**
 * Contrôleur pour les livreurs authentifiés
 * Permet de voir leurs commandes assignées et les marquer comme livrées
 */
@ApiTags('livreur-orders')
@Controller('livreur/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LivreurOrdersController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Commandes assignées au livreur' })
  getMyOrders(@Request() req) {
    const livreurId = req.user.sub || req.user.id;
    return this.onlineOrdersService.getOrdersForLivreur(livreurId);
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: 'Marquer une commande comme livrée' })
  markDelivered(@Request() req, @Param('id') orderId: string) {
    const livreurId = req.user.sub || req.user.id;
    return this.onlineOrdersService.markDeliveredByLivreur(orderId, livreurId);
  }
}
