import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OnlineOrder } from './online-order.entity';
import { Article } from '../../stock/entities/article.entity';
import { ModeVente } from '../../stock/entities/mode-vente.entity';

@Entity('online_order_item')
export class OnlineOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  onlineOrderId: string;

  @ManyToOne(() => OnlineOrder, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'onlineOrderId' })
  onlineOrder: OnlineOrder;

  @Column({ type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column({ type: 'varchar', length: 255 })
  articleNom: string;

  @Column({ type: 'uuid', nullable: true })
  modeVenteId: string;

  @ManyToOne(() => ModeVente, { nullable: true })
  @JoinColumn({ name: 'modeVenteId' })
  modeVente: ModeVente;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modeVenteNom: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'int', nullable: true })
  quantiteBase: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sousTotal: number;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;
}
