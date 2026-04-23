import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
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
  role: Role;

  // Multi-tenant: organization nullable (null = SUPER_ADMIN)
  @ManyToOne(() => Organization, { nullable: true })
  organization: Organization;

  // Flag pour identifier rapidement les SUPER_ADMIN
  @Column({ default: false })
  isSuperAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
