import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Categorie } from '../../categories/entities/categorie.entity';

@Entity('article')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ nullable: true })
  reference: string;

  @Column()
  categorieId: string;

  @ManyToOne(() => Categorie, (categorie) => categorie.articles)
  @JoinColumn({ name: 'categorieId' })
  categorie: Categorie;

  @Column({ length: 1 })
  zone: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 10 })
  seuilAlerte: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  prixVente: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prixAchat: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
