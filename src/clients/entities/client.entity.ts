import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('client')
export class Client extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ nullable: true })
  telephone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  adresse: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAchats: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCredits: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
