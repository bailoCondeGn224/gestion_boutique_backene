import { Fournisseur } from '../../fournisseurs/entities/fournisseur.entity';
import { LigneApprovisionnement } from './ligne-approvisionnement.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

/**
 * Statut d'un approvisionnement
 */
export enum StatutApprovisionnement {
  VALIDE = 'VALIDE',     // Approvisionnement actif
  ANNULE = 'ANNULE',     // Approvisionnement annulé (gardé pour traçabilité)
}

@Entity('approvisionnement')
@Unique(['numero', 'organizationId']) // Contrainte unique composite
export class Approvisionnement extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  numero: string;

  @Column()
  fournisseurId: string;

  @Column()
  fournisseurNom: string;

  @ManyToOne(() => Fournisseur, (fournisseur) => fournisseur.approvisionnements)
  @JoinColumn({ name: 'fournisseurId' })
  fournisseur: Fournisseur;

  @OneToMany(() => LigneApprovisionnement, (ligne) => ligne.approvisionnement, {
    cascade: true,
    eager: true,
  })
  lignes: LigneApprovisionnement[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantPaye: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantRestant: number;

  @Column({ type: 'date' })
  dateLivraison: Date;

  @Column({ nullable: true })
  numeroFacture: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: StatutApprovisionnement.VALIDE,
    comment: 'Statut de l\'approvisionnement (VALIDE ou ANNULE)',
  })
  statut: StatutApprovisionnement;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Date d\'annulation si l\'approvisionnement a été annulé',
  })
  annuleLe: Date;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'Utilisateur qui a annulé l\'approvisionnement',
  })
  annulePar: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Raison de l\'annulation',
  })
  motifAnnulation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
