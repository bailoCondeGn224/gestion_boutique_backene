import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Article } from '../../stock/entities/article.entity';
import { Zone } from '../../zones/entities/zone.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('categorie')
@Unique(['nom', 'organizationId'])
@Unique(['code', 'organizationId'])
export class Categorie extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column()
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  actif: boolean;

  @Column({ type: 'uuid', nullable: true })
  zoneId: string;

  @OneToMany(() => Article, (article) => article.categorie)
  articles: Article[];

  @ManyToOne(() => Zone, (zone) => zone.categories, { nullable: true })
  @JoinColumn({ name: 'zoneId' })
  zone: Zone;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
