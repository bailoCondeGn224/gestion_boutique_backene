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
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('ligne_approvisionnement')
export class LigneApprovisionnement extends BaseTenantEntity {
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

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sousTotal: number;

  // Champs pour mode gros/détail
  @Column({ nullable: true })
  modeVenteId: string;

  @Column({ type: 'int', default: 1 })
  modeQuantiteStock: number;

  @Column({ type: 'int', nullable: true })
  quantiteUnites: number;

  // Quantité déjà retournée au fournisseur
  @Column({ type: 'int', default: 0 })
  quantiteRetournee: number;

  @CreateDateColumn()
  createdAt: Date;
}
