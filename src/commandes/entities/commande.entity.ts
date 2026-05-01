import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { LigneCommande } from './ligne-commande.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';
import { StatutCommande } from '../enums/statut-commande.enum';

@Entity('commande')
export class Commande extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  numero: string;

  @Column()
  clientId: string;

  @OneToMany(() => LigneCommande, (ligne) => ligne.commande, {
    cascade: true,
    eager: true,
  })
  lignes: LigneCommande[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  acompte: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantRestant: number;

  @Column({
    type: 'enum',
    enum: StatutCommande,
    default: StatutCommande.EN_ATTENTE,
  })
  @Index()
  statut: StatutCommande;

  @Column({ type: 'date', nullable: true })
  dateLivraison: Date;

  @Column({ type: 'date', nullable: true })
  dateLivree: Date;

  @Column({ nullable: true })
  venteId: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column()
  userId: string;

  @Column()
  userNom: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
