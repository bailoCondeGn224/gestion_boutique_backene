import { NotificationType } from '../entities/notification.entity';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationProvider {
  sendToStore(organizationId: string, payload: NotificationPayload): Promise<void>;
  sendToCustomer(customerAccountId: string, payload: NotificationPayload): Promise<void>;
}

export const NOTIFICATION_PROVIDER = 'NOTIFICATION_PROVIDER';
