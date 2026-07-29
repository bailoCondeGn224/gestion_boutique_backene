// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsPublicController } from './notifications-public.controller';
import { DefaultNotificationProvider } from './providers/default-notification.provider';
import { NOTIFICATION_PROVIDER } from './providers/notification.provider';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    CustomerAuthModule,
  ],
  controllers: [NotificationsController, NotificationsPublicController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_PROVIDER,
      useClass: DefaultNotificationProvider,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
