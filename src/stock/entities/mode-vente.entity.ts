import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Article } from './article.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('mode_vente')
@Index(['articleId', 'organizationId'])
export class ModeVente extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  articleId: string;

  @ManyToOne(() => Article, (article) => article.modesVente, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column()
  nom: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
  quantiteStock: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixVente: number;

  @Column({ nullable: true })
  codeBarre: string;

  @Column({ type: 'boolean', default: false })
  parDefaut: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
