import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
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
  plan: Plan;

  // Dates d'abonnement
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  abonnementDebut: Date;

  @Column({ type: 'timestamp', nullable: true })
  abonnementExpire: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
