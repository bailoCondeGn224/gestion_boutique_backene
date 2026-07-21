// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DefaultNotificationProvider } from './providers/default-notification.provider';
import { NOTIFICATION_PROVIDER } from './providers/notification.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
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
