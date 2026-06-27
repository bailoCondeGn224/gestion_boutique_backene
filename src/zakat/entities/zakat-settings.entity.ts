import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('zakat_settings')
export class ZakatSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  organizationId: string;

  // ===== PRIX MÉTAUX (API) =====
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  prixOrGrammeUsd: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  prixArgentGrammeUsd: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 8600 })
  tauxUsdGnf: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  prixOrGrammeGnf: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  prixArgentGrammeGnf: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  nisabGnf: number;

  // ===== PRIX BÉTAIL (configurables par l'admin) =====

  // Ovins/Caprins
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 500000 })
  prixMouton: number;

  // Bovins
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 1500000 })
  prixVeau1an: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 2500000 })
  prixVeau2ans: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 3500000 })
  prixVache: number;

  // Chameaux
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 5000000 })
  prixChamelle1an: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 8000000 })
  prixChamelle2ans: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 12000000 })
  prixChameauAdulte: number;

  // ===== TIMESTAMPS =====
  @Column({ type: 'timestamp', nullable: true })
  lastPriceUpdate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
