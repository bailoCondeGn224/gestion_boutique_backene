import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Inventaire } from './inventaire.entity';
import { Article } from '../../stock/entities/article.entity';

@Entity('comptage_inventaire')
export class ComptageInventaire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inventaireId: string;

  @ManyToOne(() => Inventaire, (inventaire) => inventaire.comptages)
  @JoinColumn({ name: 'inventaireId' })
  inventaire: Inventaire;

  @Column({ type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column({ type: 'varchar', length: 255 })
  articleNom: string;

  @Column({ type: 'int' })
  quantiteSysteme: number;

  @Column({ type: 'int' })
  quantiteComptee: number;

  @Column({ type: 'int' })
  ecart: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  comptePar: string;

  @CreateDateColumn()
  createdAt: Date;
}
