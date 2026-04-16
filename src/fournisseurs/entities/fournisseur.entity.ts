import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Approvisionnement } from '../../approvisionnements/entities/approvisionnement.entity';

export enum StatutFournisseur {
  ACTIF = 'actif',
  EN_ATTENTE = 'en_attente',
  INACTIF = 'inactif',
}

@Entity('fournisseur')
export class Fournisseur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ nullable: true })
  adresse: string;

  @Column()
  telephone: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ type: 'simple-array', nullable: true })
  produits: string[];

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0, nullable: true })
  rating: number;

  @Column({
    type: 'enum',
    enum: StatutFournisseur,
    default: StatutFournisseur.ACTIF,
    nullable: true,
  })
  statut: StatutFournisseur;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAchats: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPaye: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  dette: number;

  @OneToMany(() => Approvisionnement, (approvisionnement) => approvisionnement.fournisseur)
  approvisionnements: Approvisionnement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
