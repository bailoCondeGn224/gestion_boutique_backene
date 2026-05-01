import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Commande } from './commande.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('ligne_commande')
export class LigneCommande extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  commandeId: string;

  @ManyToOne(() => Commande, (commande) => commande.lignes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commandeId' })
  commande: Commande;

  @Column()
  articleId: string;

  @Column()
  nom: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sousTotal: number;

  @CreateDateColumn()
  createdAt: Date;
}
