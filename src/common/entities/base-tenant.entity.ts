import { Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Classe abstraite de base pour toutes les entités multi-tenant
 * Toutes les entités métier doivent étendre cette classe pour avoir organizationId
 */
export abstract class BaseTenantEntity {
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}
