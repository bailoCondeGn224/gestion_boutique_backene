import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Fournisseur } from '../../fournisseurs/entities/fournisseur.entity';

export enum ModeVersement {
  ESPECES = 'especes',
  MOBILE = 'mobile',
  VIREMENT = 'virement',
  CHEQUE = 'cheque',
}

export enum StatutVersement {
  VALIDE = 'valide',
  EN_ATTENTE = 'en_attente',
  ANNULE = 'annule',
}

@Entity('versement')
export class Versement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  fournisseurId: string;

  @Column()
  fournisseurNom: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montant: number;

  @Column({
    type: 'enum',
    enum: ModeVersement,
  })
  modePaiement: ModeVersement;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({
    type: 'enum',
    enum: StatutVersement,
    default: StatutVersement.VALIDE,
  })
  statut: StatutVersement;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
