import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Article } from '../../stock/entities/article.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Types de mouvements de stock
 */
export enum TypeMouvement {
  ENTREE = 'entree',  // Approvisionnement, retour client, ajustement positif
  SORTIE = 'sortie',  // Vente, retour fournisseur, perte, casse, ajustement négatif
}

/**
 * Motifs/raisons des mouvements
 */
export enum MotifMouvement {
  VENTE = 'vente',
  APPROVISIONNEMENT = 'approvisionnement',
  AJUSTEMENT = 'ajustement',
  RETOUR_CLIENT = 'retour_client',
  RETOUR_FOURNISSEUR = 'retour_fournisseur',
  PERTE = 'perte',
  CASSE = 'casse',
}

@Entity('mouvement_stock')
@Index(['articleId', 'date'])
@Index(['type', 'date'])
@Index(['motif', 'date'])
export class MouvementStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Article concerné
  @Column()
  articleId: string;

  @Column()
  articleNom: string; // Stocké pour performance (éviter JOIN systématique)

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'articleId' })
  article: Article;

  // Type de mouvement
  @Column({
    type: 'enum',
    enum: TypeMouvement,
  })
  type: TypeMouvement;

  // Motif du mouvement
  @Column({
    type: 'enum',
    enum: MotifMouvement,
  })
  motif: MotifMouvement;

  // Quantité du mouvement
  @Column({ type: 'int' })
  quantite: number;

  // Stock avant le mouvement
  @Column({ type: 'int' })
  stockAvant: number;

  // Stock après le mouvement
  @Column({ type: 'int' })
  stockApres: number;

  // Prix unitaire au moment du mouvement
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  prixUnitaire: number;

  // Valeur totale du mouvement (quantité × prix)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valeurTotal: number;

  // Utilisateur qui a effectué l'opération
  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userNom: string; // Stocké pour performance

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Références pour la traçabilité
  @Column({ nullable: true })
  reference: string; // Numéro de vente (V-001) ou approvisionnement (APP-001)

  @Column({ nullable: true })
  venteId: string;

  @Column({ nullable: true })
  approvisionnementId: string;

  // Note/commentaire optionnel
  @Column({ type: 'text', nullable: true })
  note: string;

  // Date du mouvement (peut être différente de createdAt pour historique)
  @Column({ type: 'timestamp' })
  date: Date;

  // Date de création de l'enregistrement
  @CreateDateColumn()
  createdAt: Date;
}
