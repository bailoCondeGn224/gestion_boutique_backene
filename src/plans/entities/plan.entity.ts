import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanCode } from '../enums/plan-code.enum';

@Entity('plan')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nom: string; // Gratuit, Standard, Premium, Entreprise

  @Column({
    type: 'enum',
    enum: PlanCode,
    unique: true,
  })
  code: PlanCode;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prixMensuel: number;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
