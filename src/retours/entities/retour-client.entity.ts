import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { LigneRetourClient } from './ligne-retour-client.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';
import { ModeRemboursement } from '../enums/mode-remboursement.enum';

@Entity('retour_client')
@Unique(['numero', 'organizationId'])
export class RetourClient extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: false })
  numero: string; // RC-001, RC-002...

  @Column({ type: 'uuid' })
  venteId: string;

  @Column()
  venteNumero: string;

  @Column({ type: 'uuid', nullable: true })
  clientId: string;

  @Column({ nullable: true })
  clientNom: string;

  @OneToMany(() => LigneRetourClient, (ligne) => ligne.retourClient, {
    cascade: true,
    eager: true,
  })
  lignes: LigneRetourClient[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: ModeRemboursement,
  })
  modeRemboursement: ModeRemboursement;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantRembourse: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ nullable: true })
  userNom: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
