// src/notifications/notifications.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, RecipientType } from './entities/notification.entity';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NOTIFICATION_PROVIDER, NotificationProvider, NotificationPayload } from './providers/notification.provider';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @Inject(NOTIFICATION_PROVIDER)
    private notificationProvider: NotificationProvider,
  ) {}

  async sendToStore(organizationId: string, payload: NotificationPayload): Promise<void> {
    await this.notificationProvider.sendToStore(organizationId, payload);
  }

  async sendToCustomer(customerAccountId: string, payload: NotificationPayload): Promise<void> {
    await this.notificationProvider.sendToCustomer(customerAccountId, payload);
  }

  async getForStore(organizationId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: {
        recipientType: RecipientType.BOUTIQUE,
        recipientId: organizationId,
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: notifications.map(n => this.toResponseDto(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(organizationId, RecipientType.BOUTIQUE),
      },
    };
  }

  async getForCustomer(customerAccountId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: {
        recipientType: RecipientType.CLIENT,
        recipientId: customerAccountId,
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: notifications.map(n => this.toResponseDto(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(customerAccountId, RecipientType.CLIENT),
      },
    };
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, { isRead: true });
  }

  private async getUnreadCount(recipientId: string, recipientType: RecipientType): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId, recipientType, isRead: false },
    });
  }

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      recipientType: notification.recipientType,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
