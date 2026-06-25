import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  nom: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  // Multi-tenant: organization nullable (null = SUPER_ADMIN)
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Flag pour identifier rapidement les SUPER_ADMIN
  @Column({ default: false })
  isSuperAdmin: boolean;

  // Flag pour forcer le changement de mot de passe à la première connexion
  @Column({ default: true })
  mustChangePassword: boolean;

  // Statut actif/inactif de l'utilisateur
  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
