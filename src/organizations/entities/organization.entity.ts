import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Plan } from '../../plans/entities/plan.entity';

@Entity('organization')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nom: string;

  @Column({ unique: true })
  slug: string; // Pour URLs (ex: walli-industrie)

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  telephone: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ default: true })
  actif: boolean;

  // Relation vers le plan (TypeORM gère planId automatiquement)
  @ManyToOne(() => Plan, { eager: true })
  @JoinColumn({ name: 'planId' })
  plan: Plan;

  // Dates d'abonnement
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  abonnementDebut: Date;

  @Column({ type: 'timestamp', nullable: true })
  abonnementExpire: Date;

  // Informations supplémentaires (fusion ex-Parametre)
  @Column({ nullable: true })
  nomCourt: string; // Pour sidebar (ex: "Walli")

  @Column({ nullable: true })
  slogan: string; // Ex: "Mode & Tradition"

  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ nullable: true })
  siteWeb: string;

  // Informations légales (pour factures)
  @Column({ nullable: true })
  rccm: string; // Registre de Commerce et du Crédit Mobilier

  @Column({ nullable: true })
  nif: string; // Numéro d'Identification Fiscale

  @Column({ nullable: true })
  registreCommerce: string;

  // Paramètres de facturation
  @Column({ default: 'GNF' })
  devise: string;

  @Column({ type: 'text', nullable: true })
  mentionsLegales: string; // Mentions légales sur les factures

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
