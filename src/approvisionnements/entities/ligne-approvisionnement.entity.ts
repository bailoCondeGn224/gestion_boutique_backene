import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Approvisionnement } from './approvisionnement.entity';
import { Article } from '../../stock/entities/article.entity';

@Entity('ligne_approvisionnement')
export class LigneApprovisionnement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  approvisionnementId: string;

  @ManyToOne(() => Approvisionnement, (approvisionnement) => approvisionnement.lignes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'approvisionnementId' })
  approvisionnement: Approvisionnement;

  @Column()
  articleId: string;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column()
  nom: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  sousTotal: number;

  @CreateDateColumn()
  createdAt: Date;
}
