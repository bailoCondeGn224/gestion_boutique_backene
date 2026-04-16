import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LigneVente } from './ligne-vente.entity';

export enum ModePaiement {
  ESPECES = 'especes',
  MOBILE_MONEY = 'mobile_money',
  VIREMENT = 'virement',
  CREDIT = 'credit',
  ACOMPTE_50 = 'acompte_50',
}

@Entity('vente')
export class Vente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  numero: string;

  @Column({ nullable: true })
  clientId: string;

  @Column({ nullable: true })
  nom: string;

  @Column({ nullable: true })
  prenom: string;

  @Column({ nullable: true })
  tel: string;

  @OneToMany(() => LigneVente, (ligne) => ligne.vente, {
    cascade: true,
    eager: true,
  })
  lignes: LigneVente[];

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  montantPaye: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  montantRestant: number;

  @Column({
    type: 'enum',
    enum: ModePaiement,
  })
  modePaiement: ModePaiement;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  heure: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
