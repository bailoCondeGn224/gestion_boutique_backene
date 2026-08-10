import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('livreur')
export class Livreur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  telephone: string;

  // select: false — sans ça, GET /livreurs renvoie le hash bcrypt au navigateur.
  // Les rares endroits qui en ont besoin doivent l'ajouter explicitement
  // (voir LivreursService.login).
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPositionAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
