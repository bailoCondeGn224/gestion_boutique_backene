import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, RecipientType } from '../entities/notification.entity';
import { NotificationProvider, NotificationPayload } from './notification.provider';

@Injectable()
export class DefaultNotificationProvider implements NotificationProvider {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async sendToStore(organizationId: string, payload: NotificationPayload): Promise<void> {
    const notification = this.notificationRepository.create({
      type: payload.type,
      recipientType: RecipientType.BOUTIQUE,
      recipientId: organizationId,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      organizationId,
    });

    await this.notificationRepository.save(notification);
  }

  async sendToCustomer(customerAccountId: string, payload: NotificationPayload): Promise<void> {
    const notification = this.notificationRepository.create({
      type: payload.type,
      recipientType: RecipientType.CLIENT,
      recipientId: customerAccountId,
      title: payload.title,
      message: payload.message,
      data: payload.data,
    });

    await this.notificationRepository.save(notification);
  }
}
