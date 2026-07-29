// src/notifications/notifications-public.controller.ts
import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('public/notifications')
@Controller('public/notifications')
export class NotificationsPublicController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(CustomerJwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer mes notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getNotifications(
    @CurrentCustomer() customer: CustomerAccount,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getForCustomer(
      customer.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
