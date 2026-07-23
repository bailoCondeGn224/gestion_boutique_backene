import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerAccount } from '../../customer-auth/entities/customer-account.entity';
import { Client } from '../../clients/entities/client.entity';
import { Vente } from '../../ventes/entities/vente.entity';
import { OnlineOrderItem } from './online-order-item.entity';

export enum OnlineOrderStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRMEE = 'CONFIRMEE',
  PRETE = 'PRETE',
  LIVREE = 'LIVREE',
  ANNULEE = 'ANNULEE',
}

export enum ModeLivraison {
  LIVRAISON = 'LIVRAISON',
  RETRAIT_BOUTIQUE = 'RETRAIT_BOUTIQUE',
}

@Entity('online_order')
export class OnlineOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  numero: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  customerAccountId: string;

  @ManyToOne(() => CustomerAccount, { nullable: true })
  @JoinColumn({ name: 'customerAccountId' })
  customerAccount: CustomerAccount;

  @Column({ type: 'uuid', nullable: true })
  clientId: string;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({
    type: 'enum',
    enum: OnlineOrderStatut,
    default: OnlineOrderStatut.EN_ATTENTE,
  })
  @Index()
  statut: OnlineOrderStatut;

  @Column({ type: 'enum', enum: ModeLivraison })
  modeLivraison: ModeLivraison;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientNom: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  adresseLivraison: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephoneLivraison: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fraisLivraison: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sousTotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  motifAnnulation: string;

  @Column({ type: 'uuid', nullable: true })
  confirmeePar: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmeeLe: Date;

  @Column({ type: 'timestamp', nullable: true })
  preteLe: Date;

  @Column({ type: 'timestamp', nullable: true })
  livreeLe: Date;

  @Column({ type: 'timestamp', nullable: true })
  annuleeLe: Date;

  @Column({ type: 'uuid', nullable: true })
  venteId: string;

  @ManyToOne(() => Vente, { nullable: true })
  @JoinColumn({ name: 'venteId' })
  vente: Vente;

  @OneToMany(() => OnlineOrderItem, item => item.onlineOrder, { cascade: true })
  items: OnlineOrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
