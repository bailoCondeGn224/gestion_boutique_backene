import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RetourClient } from './retour-client.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';
import { RaisonRetour } from '../enums/raison-retour.enum';

@Entity('ligne_retour_client')
export class LigneRetourClient extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  retourClientId: string;

  @ManyToOne(() => RetourClient, (retour) => retour.lignes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retourClientId' })
  retourClient: RetourClient;

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

  @Column({
    type: 'enum',
    enum: RaisonRetour,
    nullable: true,
  })
  raison: RaisonRetour;

  @Column({ type: 'text', nullable: true })
  noteArticle: string;

  @CreateDateColumn()
  createdAt: Date;
}
