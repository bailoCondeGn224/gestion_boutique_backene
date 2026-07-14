# Task 1: Créer l'entité ModeVente

## Context
Ce projet est un backend NestJS pour une application de gestion de boutique. Cette tâche fait partie de l'implémentation du système ModeVente (vente en gros/détail).

## Files
- Create: `src/stock/entities/mode-vente.entity.ts`

## Requirements
Créer l'entité ModeVente avec la structure suivante:

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Article } from './article.entity';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

@Entity('mode_vente')
@Index(['articleId', 'organizationId'])
export class ModeVente extends BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  articleId: string;

  @ManyToOne(() => Article, (article) => article.modesVente, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column()
  nom: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
  quantiteStock: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixVente: number;

  @Column({ nullable: true })
  codeBarre: string;

  @Column({ type: 'boolean', default: false })
  parDefaut: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Global Constraints
- Toutes les entités doivent étendre `BaseTenantEntity` pour le multi-tenant
- Les prix sont en GNF avec precision(15, 2)

## Verification
Le fichier doit exister après création.
