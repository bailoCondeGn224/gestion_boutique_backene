import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
} from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nom: string; // Ex: ADMIN, VENDEUR, GESTIONNAIRE_STOCK

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  actif: boolean;

  // Multi-tenant: organization nullable (null = role système comme SUPER_ADMIN)
  @ManyToOne(() => Organization, { nullable: true })
  organization: Organization;

  // Relation ManyToMany avec Permission
  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
