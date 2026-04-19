import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Article } from '../../stock/entities/article.entity';
import { Zone } from '../../zones/entities/zone.entity';

@Entity('categorie')
export class Categorie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nom: string;

  @Column({ unique: true })
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
