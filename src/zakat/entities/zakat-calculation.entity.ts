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
import { User } from '../../users/entities/user.entity';
import { ZakatStatus, IrrigationType } from '../enums/zakat-status.enum';

@Entity('zakat_calculations')
export class ZakatCalculation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'date' })
  dateCalcul: Date;

  @Column({ type: 'int' })
  annee: number;

  // ===== HAWL (année lunaire) =====
  @Column({ type: 'date', nullable: true })
  dateAtteinteNisab: Date; // Date où le nisab a été atteint

  @Column({ type: 'boolean', default: false })
  hawlComplete: boolean; // True si 354 jours passés depuis dateAtteinteNisab

  // ===== LIQUIDITÉS (saisie utilisateur) =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  cashMaison: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  cashBanque: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  cashMobile: number;

  // ===== OR & ARGENT (saisie utilisateur) =====
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  orPoids: number; // en grammes

  @Column({ type: 'boolean', default: true })
  orInclureBijoux: boolean; // Inclure les bijoux personnels dans le calcul

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  orPrixGramme: number; // prix utilisé au moment du calcul

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  argentPoids: number; // en grammes

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  argentPrixGramme: number; // prix utilisé au moment du calcul

  // ===== INVESTISSEMENTS (saisie utilisateur) =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  investActions: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  investImmobilier: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  investAutres: number;

  // ===== COMMERCE (saisie utilisateur) =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  comStockValeur: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  comCreances: number; // Uniquement créances récupérables

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  comLiquidites: number;

  // ===== AGRICULTURE (saisie utilisateur) =====
  @Column({ type: 'boolean', default: false })
  hasAgriculture: boolean; // Checkbox: J'ai des activités agricoles

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  agriQuantiteKg: number; // Quantité récoltée en kg (nisab = 653kg)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  agriValeurRecolte: number;

  @Column({ type: 'enum', enum: IrrigationType, default: IrrigationType.AUCUN })
  agriIrrigation: IrrigationType;

  // ===== BÉTAIL (saisie utilisateur) =====
  @Column({ type: 'boolean', default: false })
  hasBetail: boolean; // Checkbox: J'ai du bétail

  @Column({ type: 'int', default: 0 })
  betailChameaux: number;

  @Column({ type: 'int', default: 0 })
  betailBovins: number;

  @Column({ type: 'int', default: 0 })
  betailOvins: number;

  @Column({ type: 'int', default: 0 })
  betailCaprins: number;

  // ===== DETTES (saisie utilisateur) =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  dettesPersonnelles: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  dettesFournisseurs: number;

  // ===== TOTAUX CALCULÉS PAR BACKEND =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalLiquidites: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalOrArgent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalInvestissements: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalCommerce: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalActifs: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDettes: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  montantZakatable: number;

  // ===== NISAB ET ASSUJETTISSEMENT =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  nisabUtilise: number;

  @Column({ type: 'boolean', default: false })
  assujetti: boolean; // true si montantZakatable >= nisab ET hawl complet

  // ===== ZAKAT CALCULÉE PAR CATÉGORIE =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  zakatMal: number; // 2.5% sur liquidités, or, argent, invest, commerce

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  zakatAgriculture: number; // 5%, 10% ou 7.5% selon irrigation

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  zakatBetail: number; // selon barème islamique

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  zakatTotal: number;

  // ===== STATUT =====
  @Column({ type: 'enum', enum: ZakatStatus, default: ZakatStatus.CALCULE })
  statut: ZakatStatus;

  @Column({ type: 'date', nullable: true })
  datePaiement: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
