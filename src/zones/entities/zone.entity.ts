import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Categorie } from '../../categories/entities/categorie.entity';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string; // Ex: "A", "B", "C", "D", "E"

  @Column({ type: 'varchar', length: 100 })
  nom: string; // Ex: "Zone Abayas", "Zone Foulards"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Categorie, (categorie) => categorie.zone)
  categories: Categorie[];
}
