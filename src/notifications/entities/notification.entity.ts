import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  NOUVELLE_COMMANDE = 'NOUVELLE_COMMANDE',
  COMMANDE_CONFIRMEE = 'COMMANDE_CONFIRMEE',
  COMMANDE_PRETE = 'COMMANDE_PRETE',
  COMMANDE_LIVREE = 'COMMANDE_LIVREE',
  COMMANDE_ANNULEE = 'COMMANDE_ANNULEE',
  LIVREUR_ARRIVE = 'LIVREUR_ARRIVE',
}

export enum RecipientType {
  BOUTIQUE = 'BOUTIQUE',
  CLIENT = 'CLIENT',
}

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: RecipientType })
  recipientType: RecipientType;

  @Column({ type: 'uuid' })
  @Index()
  recipientId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;
}
