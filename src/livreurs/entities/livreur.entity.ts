// src/livreurs/entities/livreur.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('livreurs')
@Index(['telephone', 'organizationId'], { unique: true }) // Unique par organisation
export class Livreur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column()
  telephone: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  photo: string;

  // Position actuelle (mise à jour en temps réel)
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  lastPositionAt: Date;

  // Est-ce que le livreur est en train de livrer ?
  @Column({ default: false })
  isDelivering: boolean;

  // Tenant
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
