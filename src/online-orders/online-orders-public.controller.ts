// src/online-orders/online-orders-public.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { OnlineOrdersService } from './online-orders.service';
import { CreateOnlineOrderDto } from './dto';

@ApiTags('public/orders')
@Controller('public/orders')
export class OnlineOrdersPublicController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @UseGuards(CustomerJwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Passer une commande' })
  createOrder(
    @CurrentCustomer() customer: CustomerAccount,
    @Body() dto: CreateOnlineOrderDto,
  ) {
    return this.onlineOrdersService.create(dto, customer.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes commandes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyOrders(
    @CurrentCustomer() customer: CustomerAccount,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.onlineOrdersService.getByCustomer(
      customer.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'une commande' })
  getOrder(@Param('id') id: string) {
    return this.onlineOrdersService.getById(id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get(':id/tracking')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Position du livreur pour une commande' })
  getTracking(@Param('id') id: string) {
    return this.onlineOrdersService.getTrackingInfo(id);
  }
}
