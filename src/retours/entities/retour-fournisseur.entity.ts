import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { LigneRetourFournisseur } from './ligne-retour-fournisseur.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('retour_fournisseur')
@Unique(['numero', 'organizationId'])
export class RetourFournisseur extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: false })
  numero: string; // RF-001, RF-002...

  @Column({ type: 'uuid' })
  approvisionnementId: string;

  @Column()
  approvisionnementNumero: string;

  @Column({ type: 'uuid', nullable: true })
  fournisseurId: string;

  @Column({ nullable: true })
  fournisseurNom: string;

  @OneToMany(() => LigneRetourFournisseur, (ligne) => ligne.retourFournisseur, {
    cascade: true,
    eager: true,
  })
  lignes: LigneRetourFournisseur[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ type: 'boolean', default: false })
  remboursementRecu: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantRembourse: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ nullable: true })
  userNom: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
