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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
