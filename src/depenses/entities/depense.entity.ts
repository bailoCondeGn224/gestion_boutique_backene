import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Inventaire } from '../../inventaires/entities/inventaire.entity';

/**
 * Types de dépenses disponibles
 */
export enum TypeDepense {
  LOYER = 'LOYER',
  TRANSPORT = 'TRANSPORT',
  SALAIRES = 'SALAIRES',
  ELECTRICITE = 'ELECTRICITE',
  EAU = 'EAU',
  INTERNET = 'INTERNET',
  TELEPHONE = 'TELEPHONE',
  FOURNITURES = 'FOURNITURES',
  MAINTENANCE = 'MAINTENANCE',
  ASSURANCE = 'ASSURANCE',
  TAXES = 'TAXES',
  MARKETING = 'MARKETING',
  EMBALLAGE = 'EMBALLAGE',
  AUTRE = 'AUTRE',
}

/**
 * Catégories de dépenses
 */
export enum CategorieDepense {
  FIXE = 'FIXE', // Dépenses fixes mensuelles (loyer, salaires, etc.)
  VARIABLE = 'VARIABLE', // Dépenses variables (transport, emballage, etc.)
  EXCEPTIONNELLE = 'EXCEPTIONNELLE', // Dépenses exceptionnelles (réparations, etc.)
}

/**
 * Mapping strict entre les types et catégories de dépenses
 * Chaque type de dépense a une catégorie logique prédéfinie
 */
export const TYPE_TO_CATEGORIE_MAP: Record<TypeDepense, CategorieDepense> = {
  // Dépenses fixes (mensuelles/récurrentes)
  [TypeDepense.LOYER]: CategorieDepense.FIXE,
  [TypeDepense.SALAIRES]: CategorieDepense.FIXE,
  [TypeDepense.ELECTRICITE]: CategorieDepense.FIXE,
  [TypeDepense.EAU]: CategorieDepense.FIXE,
  [TypeDepense.INTERNET]: CategorieDepense.FIXE,
  [TypeDepense.TELEPHONE]: CategorieDepense.FIXE,
  [TypeDepense.ASSURANCE]: CategorieDepense.FIXE,
  [TypeDepense.TAXES]: CategorieDepense.FIXE,

  // Dépenses variables (occasionnelles)
  [TypeDepense.TRANSPORT]: CategorieDepense.VARIABLE,
  [TypeDepense.FOURNITURES]: CategorieDepense.VARIABLE,
  [TypeDepense.EMBALLAGE]: CategorieDepense.VARIABLE,
  [TypeDepense.MARKETING]: CategorieDepense.VARIABLE,

  // Dépenses exceptionnelles (ponctuelles)
  [TypeDepense.MAINTENANCE]: CategorieDepense.EXCEPTIONNELLE,
  [TypeDepense.AUTRE]: CategorieDepense.EXCEPTIONNELLE,
};

/**
 * Entité Depense
 * Représente une dépense de l'organisation (loyer, transport, salaires, etc.)
 * Les dépenses sont automatiquement associées aux périodes d'inventaire par leur date
 */
@Entity('depense')
export class Depense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { comment: "Multi-tenant: ID de l'organisation" })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: TypeDepense,
    comment: 'Type de dépense (loyer, transport, etc.)',
  })
  type: TypeDepense;

  @Column({
    type: 'enum',
    enum: CategorieDepense,
    comment: 'Catégorie de dépense (fixe, variable, exceptionnelle)',
  })
  categorie: CategorieDepense;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    comment: 'Montant de la dépense en GNF',
  })
  montant: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Description détaillée de la dépense',
  })
  description: string;

  @Column({
    type: 'date',
    comment: 'Date de la dépense (utilisée pour calculer la période)',
  })
  date: Date;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'Référence ou numéro de facture',
  })
  reference: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: "Utilisateur qui a enregistré la dépense",
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: "Nom de l'utilisateur (dénormalisé pour historique)",
  })
  userNom: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: "Inventaire auquel cette dépense est rattachée (null si pas encore clôturée)",
  })
  inventaireId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Inventaire, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventaireId' })
  inventaire: Inventaire;
}
