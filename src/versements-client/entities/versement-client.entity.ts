import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Vente } from '../../ventes/entities/vente.entity';

export enum ModeVersementClient {
  ESPECES = 'especes',
  MOBILE_MONEY = 'mobile_money',
  VIREMENT = 'virement',
  CHEQUE = 'cheque',
  CARTE = 'carte',
}

@Entity('versement_client')
export class VersementClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column()
  clientNom: string;

  @Column({ type: 'uuid', nullable: true })
  venteId: string;  

  @Column({ nullable: true })
  venteNumero: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montant: number;

  @Column({
    type: 'enum',
    enum: ModeVersementClient,
    default: ModeVersementClient.ESPECES,
  })
  modePaiement: ModeVersementClient;

  @Column({ nullable: true })
  reference: string;  
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  // Traçabilité
  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ nullable: true })
  userNom: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Client, { eager: false })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @ManyToOne(() => Vente, { eager: false })
  @JoinColumn({ name: 'venteId' })
  vente: Vente;
}
