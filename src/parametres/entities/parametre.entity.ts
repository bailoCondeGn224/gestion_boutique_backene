import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('parametres')
export class Parametre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Informations générales
  @Column()
  nomComplet: string; // Ex: "Walli Industrie SARL"

  @Column()
  nomCourt: string; // Ex: "Walli" - affiché dans le sidebar

  @Column({ nullable: true })
  slogan: string; // Ex: "Mode & Tradition"

  @Column({ nullable: true, type: 'text' })
  logo: string; // URL ou base64 du logo

  // Coordonnées
  @Column()
  email: string;

  @Column()
  telephone: string;

  @Column({ type: 'text' })
  adresse: string;

  @Column({ nullable: true })
  siteWeb: string;

  // Informations légales (pour factures)
  @Column({ nullable: true })
  rccm: string; // Registre de Commerce et du Crédit Mobilier

  @Column({ nullable: true })
  nif: string; // Numéro d'Identification Fiscale

  @Column({ nullable: true })
  registreCommerce: string;

  // Paramètres de facturation
  @Column({ default: 'GNF' })
  devise: string;

  @Column({ nullable: true, type: 'text' })
  mentionsLegales: string; // Mentions légales sur les factures

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
