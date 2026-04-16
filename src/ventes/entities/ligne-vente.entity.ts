import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Vente } from './vente.entity';

@Entity('ligne_vente')
export class LigneVente {
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

  @Column()
  nom: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prixAchat: number; // Prix d'achat au moment de la vente (pour calculer le bénéfice)

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  sousTotal: number;

  @CreateDateColumn()
  createdAt: Date;
}
