import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RetourFournisseur } from './retour-fournisseur.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';
import { RaisonRetour } from '../enums/raison-retour.enum';
import { ModeVente } from '../../stock/entities/mode-vente.entity';

@Entity('ligne_retour_fournisseur')
export class LigneRetourFournisseur extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  retourFournisseurId: string;

  @ManyToOne(() => RetourFournisseur, (retour) => retour.lignes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retourFournisseurId' })
  retourFournisseur: RetourFournisseur;

  @Column()
  articleId: string;

  @Column()
  nom: string;

  @Column({ type: 'int' })
  quantite: number;

  // Quantité en unités de base (pour le stock)
  @Column({ type: 'int', nullable: true })
  quantiteBase: number;

  // Mode de vente utilisé lors de l'approvisionnement original
  @Column({ nullable: true })
  modeVenteId: string;

  @ManyToOne(() => ModeVente, { nullable: true })
  @JoinColumn({ name: 'modeVenteId' })
  modeVente: ModeVente;

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
