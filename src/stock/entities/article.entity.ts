import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Categorie } from '../../categories/entities/categorie.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('article')
export class Article extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ nullable: true })
  reference: string;

  @Column()
  categorieId: string;

  @ManyToOne(() => Categorie, (categorie) => categorie.articles)
  @JoinColumn({ name: 'categorieId' })
  categorie: Categorie;

  @Column({ length: 1 })
  zone: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 10 })
  seuilAlerte: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixVente: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  prixAchat: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  photo: string; // Chemin relatif: articles/{organizationId}/{filename}

  @Column({ type: 'date', nullable: true })
  dateExpiration?: Date; // Date d'expiration du produit (ou du lot le plus proche si plusieurs)

  @Column({ type: 'int', default: 30 })
  delaiAlerteExpiration: number; // Jours avant expiration pour déclencher une alerte (défaut: 30j)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
