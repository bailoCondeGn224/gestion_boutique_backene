import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Categorie } from '../../categories/entities/categorie.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('zones')
@Unique(['code', 'organizationId']) // Contrainte unique composite: code unique PAR organisation
export class Zone extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  code: string; // Ex: "A", "B", "C", "D", "E"

  @Column({ type: 'varchar', length: 100 })
  nom: string; // Ex: "Zone Abayas", "Zone Foulards"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Categorie, (categorie) => categorie.zone)
  categories: Categorie[];
}
