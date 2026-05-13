import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { ComptageInventaire } from './comptage-inventaire.entity';

export enum StatutInventaire {
  EN_COURS = 'EN_COURS',
  TERMINE = 'TERMINE',
}

@Entity('inventaire')
export class Inventaire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: StatutInventaire.EN_COURS,
  })
  statut: StatutInventaire;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'int', default: 0 })
  totalArticles: number;

  @Column({ type: 'int', default: 0 })
  articlesComptes: number;

  @Column({ type: 'int', default: 0 })
  articlesAvecEcarts: number;

  @Column({ type: 'uuid', nullable: true })
  responsableId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsableId' })
  responsable: User;

  @Column({ type: 'varchar', length: 200, nullable: true })
  responsableNom: string;

  @Column({ type: 'timestamp', nullable: true })
  termineLe: Date;

  @OneToMany(() => ComptageInventaire, (comptage) => comptage.inventaire)
  comptages: ComptageInventaire[];

  // ============ CHAMPS FINANCIERS ============
  // Période de l'inventaire
  @Column({ type: 'timestamp', nullable: true })
  dateDebut: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateFin: Date;

  @Column({ type: 'int', nullable: true })
  dureeJours: number;

  // Revenus
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  chiffreAffaires: number;

  @Column({ type: 'int', default: 0 })
  nombreVentes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  panierMoyen: number;

  // Coûts
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutMarchandises: number;

  // Bénéfice brut
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  beneficeBrut: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  tauxMarge: number;

  // Dépenses
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  depensesFixes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  depensesVariables: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  depensesExceptionnelles: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDepenses: number;

  // Pertes
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeurArticlesManquants: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeurArticlesAbimes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPertes: number;

  // Résultat final
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  beneficeNet: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  tauxRentabilite: number;

  // Statut financier
  @Column({ type: 'boolean', default: false })
  estBeneficiaire: boolean;

  @Column({ type: 'boolean', default: false })
  financesCalcules: boolean;

  @Column({ type: 'timestamp', nullable: true })
  financesCalculesLe: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
