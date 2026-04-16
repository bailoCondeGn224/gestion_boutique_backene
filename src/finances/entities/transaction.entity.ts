import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum TypeTransaction {
  IN = 'in',
  OUT = 'out',
}

export enum CategorieTransaction {
  VENTE = 'vente',
  APPROVISIONNEMENT = 'approvisionnement',
  PAIEMENT_FOURNISSEUR = 'paiement_fournisseur',
  CHARGE = 'charge',
  AUTRE = 'autre',
}

@Entity('transaction')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montant: number;

  @Column({
    type: 'enum',
    enum: TypeTransaction,
  })
  type: TypeTransaction;

  @Column({
    type: 'enum',
    enum: CategorieTransaction,
    default: CategorieTransaction.AUTRE,
  })
  categorie: CategorieTransaction;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'uuid', nullable: true })
  venteId: string;

  @Column({ type: 'uuid', nullable: true })
  approvisionnementId: string;

  @Column({ type: 'uuid', nullable: true })
  paiementFournisseurId: string;

  @CreateDateColumn()
  createdAt: Date;
}
