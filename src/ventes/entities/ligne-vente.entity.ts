import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Vente } from './vente.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';
import { ModeVente } from '../../stock/entities/mode-vente.entity';

@Entity('ligne_vente')
export class LigneVente extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  venteId: string;

  @ManyToOne(() => Vente, (vente) => vente.lignes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'venteId' })
  vente: Vente;

  @Column()
  articleId: string;

  @Column({ nullable: true })
  modeVenteId: string;

  @ManyToOne(() => ModeVente, { nullable: true })
  @JoinColumn({ name: 'modeVenteId' })
  modeVente: ModeVente;

  @Column({ type: 'int', nullable: true })
  quantiteBase: number;

  @Column()
  nom: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  prixAchat: number; // Prix d'achat au moment de la vente (pour calculer le bénéfice)

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sousTotal: number;

  @CreateDateColumn()
  createdAt: Date;
}
