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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
