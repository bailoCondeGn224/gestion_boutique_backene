# Espace Client & Commandes en Ligne - Plan d'Implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un espace client public permettant aux clients de passer des commandes en ligne auprès des boutiques de la plateforme.

**Architecture:** 4 nouveaux modules NestJS (customer-auth, storefront, online-orders, notifications) avec JWT séparé pour les clients. Frontend React avec routing séparé (/b/*, /customer/*) et layouts dédiés. Mobile-first avec pattern Mobile* existant.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, React, React Query, shadcn/ui, Tailwind CSS, qrcode (npm)

## Global Constraints

- Multi-tenant: toutes les entités business incluent `organizationId`
- Migrations TypeORM uniquement (pas de synchronize)
- Validation DTO avec class-validator
- Pattern Mobile* pour composants responsives
- JWT client séparé du JWT back-office
- Conventions de nommage existantes (français pour les champs métier)

---

## Phase 1: Backend - Fondations

### Task 1: Migration CustomerAccount

**Files:**
- Create: `src/migrations/1753000000000-CreateCustomerAccount.ts`

**Interfaces:**
- Produces: Table `customer_account` avec colonnes id, nom, telephone, email, passwordHash, isActive, createdAt, updatedAt

- [ ] **Step 1: Créer le fichier de migration**

```typescript
// src/migrations/1753000000000-CreateCustomerAccount.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomerAccount1753000000000 implements MigrationInterface {
  name = 'CreateCustomerAccount1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_account',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nom',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'telephone',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'customer_account',
      new TableIndex({
        name: 'IDX_customer_account_telephone',
        columnNames: ['telephone'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('customer_account', 'IDX_customer_account_telephone');
    await queryRunner.dropTable('customer_account');
  }
}
```

- [ ] **Step 2: Lancer la migration**

Run: `npm run migration:run`
Expected: Migration exécutée avec succès, table `customer_account` créée

- [ ] **Step 3: Vérifier la table**

Run: `npm run typeorm query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_account'"`
Expected: 8 colonnes listées

- [ ] **Step 4: Commit**

```bash
git add src/migrations/1753000000000-CreateCustomerAccount.ts
git commit -m "feat(customer-auth): add CustomerAccount migration"
```

---

### Task 2: Migration StoreFront

**Files:**
- Create: `src/migrations/1753000000001-CreateStorefront.ts`

**Interfaces:**
- Produces: Table `storefront` avec FK vers organization

- [ ] **Step 1: Créer le fichier de migration**

```typescript
// src/migrations/1753000000001-CreateStorefront.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateStorefront1753000000001 implements MigrationInterface {
  name = 'CreateStorefront1753000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'storefront',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logoUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'whatsappNumber',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'horaires',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fraisLivraison',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'adresse',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'storefront',
      new TableIndex({
        name: 'IDX_storefront_slug',
        columnNames: ['slug'],
      }),
    );

    await queryRunner.createForeignKey(
      'storefront',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('storefront');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('organizationId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('storefront', foreignKey);
    }
    await queryRunner.dropIndex('storefront', 'IDX_storefront_slug');
    await queryRunner.dropTable('storefront');
  }
}
```

- [ ] **Step 2: Lancer la migration**

Run: `npm run migration:run`
Expected: Migration exécutée avec succès

- [ ] **Step 3: Commit**

```bash
git add src/migrations/1753000000001-CreateStorefront.ts
git commit -m "feat(storefront): add Storefront migration"
```

---

### Task 3: Migration OnlineOrder et OnlineOrderItem

**Files:**
- Create: `src/migrations/1753000000002-CreateOnlineOrder.ts`

**Interfaces:**
- Produces: Tables `online_order` et `online_order_item` avec enums et FK

- [ ] **Step 1: Créer le fichier de migration**

```typescript
// src/migrations/1753000000002-CreateOnlineOrder.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateOnlineOrder1753000000002 implements MigrationInterface {
  name = 'CreateOnlineOrder1753000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer les enums
    await queryRunner.query(`
      CREATE TYPE "online_order_statut_enum" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'PRETE', 'LIVREE', 'ANNULEE')
    `);
    await queryRunner.query(`
      CREATE TYPE "online_order_mode_livraison_enum" AS ENUM ('LIVRAISON', 'RETRAIT_BOUTIQUE')
    `);

    // Table online_order
    await queryRunner.createTable(
      new Table({
        name: 'online_order',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'numero',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'customerAccountId',
            type: 'uuid',
          },
          {
            name: 'clientId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'statut',
            type: 'online_order_statut_enum',
            default: "'EN_ATTENTE'",
          },
          {
            name: 'modeLivraison',
            type: 'online_order_mode_livraison_enum',
          },
          {
            name: 'adresseLivraison',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'telephoneLivraison',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'fraisLivraison',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'sousTotal',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'motifAnnulation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confirmeePar',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'confirmeeLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'preteLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'livreeLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'annuleeLe',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'venteId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'online_order',
      new TableIndex({
        name: 'IDX_online_order_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'online_order',
      new TableIndex({
        name: 'IDX_online_order_statut',
        columnNames: ['statut'],
      }),
    );

    // Table online_order_item
    await queryRunner.createTable(
      new Table({
        name: 'online_order_item',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'onlineOrderId',
            type: 'uuid',
          },
          {
            name: 'articleId',
            type: 'uuid',
          },
          {
            name: 'articleNom',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'modeVenteId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'modeVenteNom',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'quantite',
            type: 'int',
          },
          {
            name: 'prixUnitaire',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'sousTotal',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'online_order_item',
      new TableIndex({
        name: 'IDX_online_order_item_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'online_order',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'online_order',
      new TableForeignKey({
        columnNames: ['customerAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customer_account',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'online_order_item',
      new TableForeignKey({
        columnNames: ['onlineOrderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'online_order',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('online_order_item');
    await queryRunner.dropTable('online_order');
    await queryRunner.query(`DROP TYPE "online_order_mode_livraison_enum"`);
    await queryRunner.query(`DROP TYPE "online_order_statut_enum"`);
  }
}
```

- [ ] **Step 2: Lancer la migration**

Run: `npm run migration:run`
Expected: Migration exécutée avec succès

- [ ] **Step 3: Commit**

```bash
git add src/migrations/1753000000002-CreateOnlineOrder.ts
git commit -m "feat(online-orders): add OnlineOrder and OnlineOrderItem migrations"
```

---

### Task 4: Migration Notification

**Files:**
- Create: `src/migrations/1753000000003-CreateNotification.ts`

**Interfaces:**
- Produces: Table `notification` avec enums

- [ ] **Step 1: Créer le fichier de migration**

```typescript
// src/migrations/1753000000003-CreateNotification.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotification1753000000003 implements MigrationInterface {
  name = 'CreateNotification1753000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM ('NOUVELLE_COMMANDE', 'COMMANDE_CONFIRMEE', 'COMMANDE_PRETE', 'COMMANDE_LIVREE', 'COMMANDE_ANNULEE')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_recipient_type_enum" AS ENUM ('BOUTIQUE', 'CLIENT')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'notification',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'notification_type_enum',
          },
          {
            name: 'recipientType',
            type: 'notification_recipient_type_enum',
          },
          {
            name: 'recipientId',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notification',
      new TableIndex({
        name: 'IDX_notification_recipientId',
        columnNames: ['recipientId'],
      }),
    );

    await queryRunner.createIndex(
      'notification',
      new TableIndex({
        name: 'IDX_notification_organizationId',
        columnNames: ['organizationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification');
    await queryRunner.query(`DROP TYPE "notification_recipient_type_enum"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
```

- [ ] **Step 2: Lancer la migration**

Run: `npm run migration:run`
Expected: Migration exécutée avec succès

- [ ] **Step 3: Commit**

```bash
git add src/migrations/1753000000003-CreateNotification.ts
git commit -m "feat(notifications): add Notification migration"
```

---

### Task 5: Migration champs Article (disponibleEnLigne, prixEnLigne)

**Files:**
- Create: `src/migrations/1753000000004-AddOnlineFieldsToArticle.ts`
- Modify: `src/stock/entities/article.entity.ts`

**Interfaces:**
- Produces: Colonnes `disponibleEnLigne` et `prixEnLigne` sur table article

- [ ] **Step 1: Créer le fichier de migration**

```typescript
// src/migrations/1753000000004-AddOnlineFieldsToArticle.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOnlineFieldsToArticle1753000000004 implements MigrationInterface {
  name = 'AddOnlineFieldsToArticle1753000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'article',
      new TableColumn({
        name: 'disponibleEnLigne',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'article',
      new TableColumn({
        name: 'prixEnLigne',
        type: 'decimal',
        precision: 15,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('article', 'prixEnLigne');
    await queryRunner.dropColumn('article', 'disponibleEnLigne');
  }
}
```

- [ ] **Step 2: Lancer la migration**

Run: `npm run migration:run`
Expected: Migration exécutée avec succès

- [ ] **Step 3: Modifier l'entité Article**

```typescript
// Ajouter dans src/stock/entities/article.entity.ts après les autres colonnes

@Column({ type: 'boolean', default: false })
disponibleEnLigne: boolean;

@Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
prixEnLigne: number;
```

- [ ] **Step 4: Commit**

```bash
git add src/migrations/1753000000004-AddOnlineFieldsToArticle.ts src/stock/entities/article.entity.ts
git commit -m "feat(stock): add online fields to Article entity"
```

---

### Task 6: Migration customerAccountId sur Client

**Files:**
- Create: `src/migrations/1753000000005-AddCustomerAccountIdToClient.ts`
- Modify: `src/clients/entities/client.entity.ts`

**Interfaces:**
- Produces: Colonne `customerAccountId` sur table client

- [ ] **Step 1: Créer le fichier de migration**

```typescript
// src/migrations/1753000000005-AddCustomerAccountIdToClient.ts
import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCustomerAccountIdToClient1753000000005 implements MigrationInterface {
  name = 'AddCustomerAccountIdToClient1753000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'client',
      new TableColumn({
        name: 'customerAccountId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'client',
      new TableForeignKey({
        columnNames: ['customerAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customer_account',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('client');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('customerAccountId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('client', foreignKey);
    }
    await queryRunner.dropColumn('client', 'customerAccountId');
  }
}
```

- [ ] **Step 2: Lancer la migration**

Run: `npm run migration:run`
Expected: Migration exécutée avec succès

- [ ] **Step 3: Modifier l'entité Client**

```typescript
// Ajouter dans src/clients/entities/client.entity.ts

@Column({ type: 'uuid', nullable: true })
customerAccountId: string;

@ManyToOne(() => CustomerAccount, { nullable: true })
@JoinColumn({ name: 'customerAccountId' })
customerAccount: CustomerAccount;
```

- [ ] **Step 4: Commit**

```bash
git add src/migrations/1753000000005-AddCustomerAccountIdToClient.ts src/clients/entities/client.entity.ts
git commit -m "feat(clients): add customerAccountId to Client entity"
```

---

## Phase 2: Backend - Module Customer Auth

### Task 7: Entité CustomerAccount

**Files:**
- Create: `src/customer-auth/entities/customer-account.entity.ts`

**Interfaces:**
- Produces: Classe `CustomerAccount` avec propriétés id, nom, telephone, email, passwordHash, isActive, createdAt, updatedAt

- [ ] **Step 1: Créer le dossier et l'entité**

```typescript
// src/customer-auth/entities/customer-account.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customer_account')
export class CustomerAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  telephone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/customer-auth/entities/customer-account.entity.ts
git commit -m "feat(customer-auth): add CustomerAccount entity"
```

---

### Task 8: DTOs Customer Auth

**Files:**
- Create: `src/customer-auth/dto/register-customer.dto.ts`
- Create: `src/customer-auth/dto/login-customer.dto.ts`
- Create: `src/customer-auth/dto/update-customer-profile.dto.ts`
- Create: `src/customer-auth/dto/customer-response.dto.ts`

**Interfaces:**
- Produces: DTOs pour register, login, update profile et response

- [ ] **Step 1: Créer RegisterCustomerDto**

```typescript
// src/customer-auth/dto/register-customer.dto.ts
import { IsString, IsNotEmpty, MinLength, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'Mamadou Diallo' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  nom: string;

  @ApiProperty({ example: '624123456' })
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  @Matches(/^[0-9]{9,15}$/, { message: 'Numéro de téléphone invalide' })
  telephone: string;

  @ApiPropertyOptional({ example: 'client@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}
```

- [ ] **Step 2: Créer LoginCustomerDto**

```typescript
// src/customer-auth/dto/login-customer.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginCustomerDto {
  @ApiProperty({ example: '624123456' })
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  telephone: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  password: string;
}
```

- [ ] **Step 3: Créer UpdateCustomerProfileDto**

```typescript
// src/customer-auth/dto/update-customer-profile.dto.ts
import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'Mamadou Diallo' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ example: 'client@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiPropertyOptional({ example: 'nouveaumotdepasse' })
  @IsOptional()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password?: string;
}
```

- [ ] **Step 4: Créer CustomerResponseDto**

```typescript
// src/customer-auth/dto/customer-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nom: string;

  @ApiProperty()
  telephone: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
```

- [ ] **Step 5: Créer index.ts**

```typescript
// src/customer-auth/dto/index.ts
export * from './register-customer.dto';
export * from './login-customer.dto';
export * from './update-customer-profile.dto';
export * from './customer-response.dto';
```

- [ ] **Step 6: Commit**

```bash
git add src/customer-auth/dto/
git commit -m "feat(customer-auth): add DTOs for customer authentication"
```

---

### Task 9: Customer JWT Strategy et Guard

**Files:**
- Create: `src/customer-auth/strategies/customer-jwt.strategy.ts`
- Create: `src/customer-auth/guards/customer-jwt-auth.guard.ts`
- Create: `src/customer-auth/decorators/current-customer.decorator.ts`

**Interfaces:**
- Produces: Strategy JWT pour clients, Guard d'authentification, Decorator @CurrentCustomer()

- [ ] **Step 1: Créer la stratégie JWT**

```typescript
// src/customer-auth/strategies/customer-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAccount } from '../entities/customer-account.entity';

export interface CustomerJwtPayload {
  sub: string;
  telephone: string;
  type: 'customer';
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(CustomerAccount)
    private customerAccountRepository: Repository<CustomerAccount>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<CustomerAccount> {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Token invalide');
    }

    const customer = await this.customerAccountRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Compte client non trouvé ou désactivé');
    }

    return customer;
  }
}
```

- [ ] **Step 2: Créer le guard**

```typescript
// src/customer-auth/guards/customer-jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerJwtAuthGuard extends AuthGuard('customer-jwt') {}
```

- [ ] **Step 3: Créer le decorator**

```typescript
// src/customer-auth/decorators/current-customer.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerAccount } from '../entities/customer-account.entity';

export const CurrentCustomer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CustomerAccount => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 4: Commit**

```bash
git add src/customer-auth/strategies/ src/customer-auth/guards/ src/customer-auth/decorators/
git commit -m "feat(customer-auth): add JWT strategy, guard and decorator"
```

---

### Task 10: Customer Auth Service

**Files:**
- Create: `src/customer-auth/customer-auth.service.ts`

**Interfaces:**
- Consumes: CustomerAccount entity, DTOs
- Produces: Methods register(), login(), getProfile(), updateProfile()

- [ ] **Step 1: Créer le service**

```typescript
// src/customer-auth/customer-auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CustomerAccount } from './entities/customer-account.entity';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  CustomerResponseDto,
} from './dto';

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(CustomerAccount)
    private customerAccountRepository: Repository<CustomerAccount>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterCustomerDto): Promise<{ customer: CustomerResponseDto; access_token: string }> {
    // Vérifier si le téléphone existe déjà
    const existing = await this.customerAccountRepository.findOne({
      where: { telephone: dto.telephone },
    });

    if (existing) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Créer le compte
    const customer = this.customerAccountRepository.create({
      nom: dto.nom,
      telephone: dto.telephone,
      email: dto.email,
      passwordHash,
    });

    await this.customerAccountRepository.save(customer);

    // Générer le token
    const token = this.generateToken(customer);

    return {
      customer: this.toResponseDto(customer),
      access_token: token,
    };
  }

  async login(dto: LoginCustomerDto): Promise<{ customer: CustomerResponseDto; access_token: string }> {
    const customer = await this.customerAccountRepository.findOne({
      where: { telephone: dto.telephone },
    });

    if (!customer) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    if (!customer.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, customer.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    const token = this.generateToken(customer);

    return {
      customer: this.toResponseDto(customer),
      access_token: token,
    };
  }

  async getProfile(customerId: string): Promise<CustomerResponseDto> {
    const customer = await this.customerAccountRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Compte client non trouvé');
    }

    return this.toResponseDto(customer);
  }

  async updateProfile(customerId: string, dto: UpdateCustomerProfileDto): Promise<CustomerResponseDto> {
    const customer = await this.customerAccountRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Compte client non trouvé');
    }

    if (dto.nom) {
      customer.nom = dto.nom;
    }

    if (dto.email !== undefined) {
      customer.email = dto.email;
    }

    if (dto.password) {
      customer.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.customerAccountRepository.save(customer);

    return this.toResponseDto(customer);
  }

  private generateToken(customer: CustomerAccount): string {
    const payload = {
      sub: customer.id,
      telephone: customer.telephone,
      type: 'customer',
    };

    return this.jwtService.sign(payload, { expiresIn: '30d' });
  }

  private toResponseDto(customer: CustomerAccount): CustomerResponseDto {
    return {
      id: customer.id,
      nom: customer.nom,
      telephone: customer.telephone,
      email: customer.email,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/customer-auth/customer-auth.service.ts
git commit -m "feat(customer-auth): add CustomerAuthService"
```

---

### Task 11: Customer Auth Controller

**Files:**
- Create: `src/customer-auth/customer-auth.controller.ts`

**Interfaces:**
- Consumes: CustomerAuthService
- Produces: Endpoints POST /register, POST /login, GET /me, PUT /profile

- [ ] **Step 1: Créer le controller**

```typescript
// src/customer-auth/customer-auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  CustomerResponseDto,
} from './dto';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { CustomerAccount } from './entities/customer-account.entity';

@ApiTags('public/auth')
@Controller('public/auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte client' })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  @ApiResponse({ status: 409, description: 'Téléphone déjà utilisé' })
  register(@Body() dto: RegisterCustomerDto) {
    return this.customerAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Connexion client' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants incorrects' })
  login(@Body() dto: LoginCustomerDto) {
    return this.customerAuthService.login(dto);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil du client connecté' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  getProfile(@CurrentCustomer() customer: CustomerAccount) {
    return this.customerAuthService.getProfile(customer.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier le profil client' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  updateProfile(
    @CurrentCustomer() customer: CustomerAccount,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customerAuthService.updateProfile(customer.id, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/customer-auth/customer-auth.controller.ts
git commit -m "feat(customer-auth): add CustomerAuthController"
```

---

### Task 12: Customer Auth Module

**Files:**
- Create: `src/customer-auth/customer-auth.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: Module CustomerAuth importé dans AppModule

- [ ] **Step 1: Créer le module**

```typescript
// src/customer-auth/customer-auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { CustomerAccount } from './entities/customer-account.entity';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerAccount]),
    PassportModule.register({ defaultStrategy: 'customer-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerJwtStrategy],
  exports: [CustomerAuthService, TypeOrmModule],
})
export class CustomerAuthModule {}
```

- [ ] **Step 2: Ajouter dans AppModule**

```typescript
// Dans src/app.module.ts, ajouter l'import
import { CustomerAuthModule } from './customer-auth/customer-auth.module';

// Dans le tableau imports:
CustomerAuthModule,
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npm run build`
Expected: Build réussi sans erreurs

- [ ] **Step 4: Commit**

```bash
git add src/customer-auth/customer-auth.module.ts src/app.module.ts
git commit -m "feat(customer-auth): add CustomerAuthModule and register in AppModule"
```

---

## Phase 3: Backend - Module Storefront

### Task 13: Entité et DTOs Storefront

**Files:**
- Create: `src/storefront/entities/storefront.entity.ts`
- Create: `src/storefront/dto/update-storefront.dto.ts`
- Create: `src/storefront/dto/storefront-response.dto.ts`
- Create: `src/storefront/dto/index.ts`

**Interfaces:**
- Produces: Entité StoreFront et DTOs associés

- [ ] **Step 1: Créer l'entité StoreFront**

```typescript
// src/storefront/entities/storefront.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('storefront')
export class StoreFront {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  organizationId: string;

  @OneToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsappNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  horaires: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fraisLivraison: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  adresse: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Créer UpdateStorefrontDto**

```typescript
// src/storefront/dto/update-storefront.dto.ts
import { IsString, IsOptional, IsBoolean, IsNumber, Min, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStorefrontDto {
  @ApiPropertyOptional({ example: 'boutique-mariama' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets' })
  slug?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Vêtements et accessoires de qualité' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '+224624123456' })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 'Lun-Sam 9h-18h' })
  @IsOptional()
  @IsString()
  horaires?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fraisLivraison?: number;

  @ApiPropertyOptional({ example: 'Marché Madina, Conakry' })
  @IsOptional()
  @IsString()
  adresse?: string;
}
```

- [ ] **Step 3: Créer StorefrontResponseDto**

```typescript
// src/storefront/dto/storefront-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StorefrontResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  whatsappNumber?: string;

  @ApiPropertyOptional()
  horaires?: string;

  @ApiProperty()
  fraisLivraison: number;

  @ApiPropertyOptional()
  adresse?: string;

  @ApiProperty()
  organizationNom: string;

  @ApiProperty()
  fullUrl: string;
}
```

- [ ] **Step 4: Créer index.ts**

```typescript
// src/storefront/dto/index.ts
export * from './update-storefront.dto';
export * from './storefront-response.dto';
```

- [ ] **Step 5: Commit**

```bash
git add src/storefront/
git commit -m "feat(storefront): add StoreFront entity and DTOs"
```

---

### Task 14: Storefront Service

**Files:**
- Create: `src/storefront/storefront.service.ts`

**Interfaces:**
- Consumes: StoreFront entity, Organization entity, Article entity
- Produces: Methods getByOrganization(), update(), uploadLogo(), generateQrCode(), getBySlug(), getProducts()

- [ ] **Step 1: Installer qrcode**

Run: `npm install qrcode @types/qrcode --save`
Expected: Package installé

- [ ] **Step 2: Créer le service**

```typescript
// src/storefront/storefront.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { StoreFront } from './entities/storefront.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Article } from '../stock/entities/article.entity';
import { UpdateStorefrontDto, StorefrontResponseDto } from './dto';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(StoreFront)
    private storefrontRepository: Repository<StoreFront>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    private configService: ConfigService,
  ) {}

  async getOrCreateByOrganization(organizationId: string): Promise<StorefrontResponseDto> {
    let storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });

    if (!storefront) {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organisation non trouvée');
      }

      // Générer un slug à partir du nom de l'organisation
      const slug = this.generateSlug(organization.nom);

      storefront = this.storefrontRepository.create({
        organizationId,
        slug,
        isActive: false,
      });

      await this.storefrontRepository.save(storefront);
      storefront.organization = organization;
    }

    return this.toResponseDto(storefront);
  }

  async update(organizationId: string, dto: UpdateStorefrontDto): Promise<StorefrontResponseDto> {
    let storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });

    if (!storefront) {
      // Créer si n'existe pas
      await this.getOrCreateByOrganization(organizationId);
      storefront = await this.storefrontRepository.findOne({
        where: { organizationId },
        relations: ['organization'],
      });
    }

    // Vérifier l'unicité du slug si modifié
    if (dto.slug && dto.slug !== storefront.slug) {
      const existingSlug = await this.storefrontRepository.findOne({
        where: { slug: dto.slug },
      });

      if (existingSlug) {
        throw new ConflictException('Ce slug est déjà utilisé');
      }
    }

    Object.assign(storefront, dto);
    await this.storefrontRepository.save(storefront);

    return this.toResponseDto(storefront);
  }

  async updateLogo(organizationId: string, logoUrl: string): Promise<StorefrontResponseDto> {
    const storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non trouvée');
    }

    storefront.logoUrl = logoUrl;
    await this.storefrontRepository.save(storefront);

    return this.toResponseDto(storefront);
  }

  async generateQrCode(organizationId: string): Promise<Buffer> {
    const storefront = await this.storefrontRepository.findOne({
      where: { organizationId },
    });

    if (!storefront) {
      throw new NotFoundException('Vitrine non trouvée');
    }

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const url = `${baseUrl}/b/${storefront.slug}`;

    const qrCodeBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
    });

    return qrCodeBuffer;
  }

  // API Publique
  async getActiveStores(): Promise<StorefrontResponseDto[]> {
    const storefronts = await this.storefrontRepository.find({
      where: { isActive: true },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });

    return storefronts.map(sf => this.toResponseDto(sf));
  }

  async getBySlug(slug: string): Promise<StorefrontResponseDto> {
    const storefront = await this.storefrontRepository.findOne({
      where: { slug, isActive: true },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée');
    }

    return this.toResponseDto(storefront);
  }

  async getProducts(slug: string, page: number = 1, limit: number = 20): Promise<any> {
    const storefront = await this.storefrontRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée');
    }

    const skip = (page - 1) * limit;

    const [articles, total] = await this.articleRepository.findAndCount({
      where: {
        organizationId: storefront.organizationId,
        disponibleEnLigne: true,
      },
      relations: ['categorie', 'modesVente'],
      order: { nom: 'ASC' },
      skip,
      take: limit,
    });

    // Transformer pour inclure le prix en ligne
    const data = articles.map(article => ({
      id: article.id,
      nom: article.nom,
      description: article.description,
      photoUrl: article.photoUrl,
      prix: article.prixEnLigne || article.prixVente,
      prixOriginal: article.prixVente,
      stock: article.stock,
      categorie: article.categorie?.nom,
      modesVente: article.modesVente?.filter(mv => mv.isActive).map(mv => ({
        id: mv.id,
        nom: mv.nom,
        quantiteStock: mv.quantiteStock,
        prix: mv.prixVente,
      })),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  private generateSlug(nom: string): string {
    return nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toResponseDto(storefront: StoreFront): StorefrontResponseDto {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    return {
      id: storefront.id,
      organizationId: storefront.organizationId,
      slug: storefront.slug,
      isActive: storefront.isActive,
      description: storefront.description,
      logoUrl: storefront.logoUrl,
      whatsappNumber: storefront.whatsappNumber,
      horaires: storefront.horaires,
      fraisLivraison: Number(storefront.fraisLivraison),
      adresse: storefront.adresse,
      organizationNom: storefront.organization?.nom || '',
      fullUrl: `${baseUrl}/b/${storefront.slug}`,
    };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/storefront/storefront.service.ts package.json package-lock.json
git commit -m "feat(storefront): add StorefrontService with QR code generation"
```

---

### Task 15: Storefront Controllers et Module

**Files:**
- Create: `src/storefront/storefront.controller.ts`
- Create: `src/storefront/storefront-public.controller.ts`
- Create: `src/storefront/storefront.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: Controllers back-office et public, module intégré

- [ ] **Step 1: Créer le controller back-office**

```typescript
// src/storefront/storefront.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { StorefrontService } from './storefront.service';
import { UpdateStorefrontDto } from './dto';

@ApiTags('storefront')
@Controller('storefront')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la configuration de ma vitrine' })
  getMyStorefront(@CurrentOrganization() organizationId: string) {
    return this.storefrontService.getOrCreateByOrganization(organizationId);
  }

  @Put()
  @ApiOperation({ summary: 'Modifier la configuration de ma vitrine' })
  updateStorefront(
    @CurrentOrganization() organizationId: string,
    @Body() dto: UpdateStorefrontDto,
  ) {
    return this.storefrontService.update(organizationId, dto);
  }

  @Post('logo')
  @ApiOperation({ summary: 'Uploader le logo de la vitrine' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @CurrentOrganization() organizationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: Implémenter l'upload vers le stockage (utiliser le service existant)
    const logoUrl = `/uploads/storefronts/${organizationId}/${file.originalname}`;
    return this.storefrontService.updateLogo(organizationId, logoUrl);
  }

  @Get('qrcode')
  @ApiOperation({ summary: 'Générer le QR code de ma vitrine' })
  async getQrCode(
    @CurrentOrganization() organizationId: string,
    @Res() res: Response,
  ) {
    const qrCodeBuffer = await this.storefrontService.generateQrCode(organizationId);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename=qrcode-boutique.png');
    res.send(qrCodeBuffer);
  }
}
```

- [ ] **Step 2: Créer le controller public**

```typescript
// src/storefront/storefront-public.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';

@ApiTags('public/stores')
@Controller('public/stores')
export class StorefrontPublicController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des boutiques actives' })
  getActiveStores() {
    return this.storefrontService.getActiveStores();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Détails d\'une boutique' })
  getBySlug(@Param('slug') slug: string) {
    return this.storefrontService.getBySlug(slug);
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'Catalogue produits d\'une boutique' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getProducts(
    @Param('slug') slug: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.storefrontService.getProducts(slug, Number(page), Number(limit));
  }
}
```

- [ ] **Step 3: Créer le module**

```typescript
// src/storefront/storefront.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreFront } from './entities/storefront.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Article } from '../stock/entities/article.entity';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { StorefrontPublicController } from './storefront-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreFront, Organization, Article]),
  ],
  controllers: [StorefrontController, StorefrontPublicController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
```

- [ ] **Step 4: Ajouter dans AppModule**

```typescript
// Dans src/app.module.ts, ajouter l'import
import { StorefrontModule } from './storefront/storefront.module';

// Dans le tableau imports:
StorefrontModule,
```

- [ ] **Step 5: Vérifier la compilation**

Run: `npm run build`
Expected: Build réussi sans erreurs

- [ ] **Step 6: Commit**

```bash
git add src/storefront/ src/app.module.ts
git commit -m "feat(storefront): add controllers and module"
```

---

## Phase 4: Backend - Module Notifications

### Task 16: Module Notifications complet

**Files:**
- Create: `src/notifications/entities/notification.entity.ts`
- Create: `src/notifications/dto/notification-response.dto.ts`
- Create: `src/notifications/providers/notification.provider.ts`
- Create: `src/notifications/providers/default-notification.provider.ts`
- Create: `src/notifications/notifications.service.ts`
- Create: `src/notifications/notifications.controller.ts`
- Create: `src/notifications/notifications.module.ts`

**Interfaces:**
- Produces: Système de notifications complet avec interface abstraite

- [ ] **Step 1: Créer l'entité Notification**

```typescript
// src/notifications/entities/notification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  NOUVELLE_COMMANDE = 'NOUVELLE_COMMANDE',
  COMMANDE_CONFIRMEE = 'COMMANDE_CONFIRMEE',
  COMMANDE_PRETE = 'COMMANDE_PRETE',
  COMMANDE_LIVREE = 'COMMANDE_LIVREE',
  COMMANDE_ANNULEE = 'COMMANDE_ANNULEE',
}

export enum RecipientType {
  BOUTIQUE = 'BOUTIQUE',
  CLIENT = 'CLIENT',
}

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: RecipientType })
  recipientType: RecipientType;

  @Column({ type: 'uuid' })
  @Index()
  recipientId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 2: Créer le DTO**

```typescript
// src/notifications/dto/notification-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, RecipientType } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: RecipientType })
  recipientType: RecipientType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: Record<string, any>;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
}
```

- [ ] **Step 3: Créer l'interface du provider**

```typescript
// src/notifications/providers/notification.provider.ts
import { NotificationType } from '../entities/notification.entity';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationProvider {
  sendToStore(organizationId: string, payload: NotificationPayload): Promise<void>;
  sendToCustomer(customerAccountId: string, payload: NotificationPayload): Promise<void>;
}

export const NOTIFICATION_PROVIDER = 'NOTIFICATION_PROVIDER';
```

- [ ] **Step 4: Créer le provider par défaut**

```typescript
// src/notifications/providers/default-notification.provider.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, RecipientType } from '../entities/notification.entity';
import { NotificationProvider, NotificationPayload } from './notification.provider';

@Injectable()
export class DefaultNotificationProvider implements NotificationProvider {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async sendToStore(organizationId: string, payload: NotificationPayload): Promise<void> {
    const notification = this.notificationRepository.create({
      type: payload.type,
      recipientType: RecipientType.BOUTIQUE,
      recipientId: organizationId,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      organizationId,
    });

    await this.notificationRepository.save(notification);
  }

  async sendToCustomer(customerAccountId: string, payload: NotificationPayload): Promise<void> {
    const notification = this.notificationRepository.create({
      type: payload.type,
      recipientType: RecipientType.CLIENT,
      recipientId: customerAccountId,
      title: payload.title,
      message: payload.message,
      data: payload.data,
    });

    await this.notificationRepository.save(notification);
  }
}
```

- [ ] **Step 5: Créer le service**

```typescript
// src/notifications/notifications.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, RecipientType } from './entities/notification.entity';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NOTIFICATION_PROVIDER, NotificationProvider, NotificationPayload } from './providers/notification.provider';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @Inject(NOTIFICATION_PROVIDER)
    private notificationProvider: NotificationProvider,
  ) {}

  async sendToStore(organizationId: string, payload: NotificationPayload): Promise<void> {
    await this.notificationProvider.sendToStore(organizationId, payload);
  }

  async sendToCustomer(customerAccountId: string, payload: NotificationPayload): Promise<void> {
    await this.notificationProvider.sendToCustomer(customerAccountId, payload);
  }

  async getForStore(organizationId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: {
        recipientType: RecipientType.BOUTIQUE,
        recipientId: organizationId,
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: notifications.map(n => this.toResponseDto(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(organizationId, RecipientType.BOUTIQUE),
      },
    };
  }

  async getForCustomer(customerAccountId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: {
        recipientType: RecipientType.CLIENT,
        recipientId: customerAccountId,
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: notifications.map(n => this.toResponseDto(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(customerAccountId, RecipientType.CLIENT),
      },
    };
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, { isRead: true });
  }

  private async getUnreadCount(recipientId: string, recipientType: RecipientType): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId, recipientType, isRead: false },
    });
  }

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      recipientType: notification.recipientType,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
```

- [ ] **Step 6: Créer le controller**

```typescript
// src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer mes notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getNotifications(
    @CurrentOrganization() organizationId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.notificationsService.getForStore(organizationId, Number(page), Number(limit));
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
```

- [ ] **Step 7: Créer le module**

```typescript
// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DefaultNotificationProvider } from './providers/default-notification.provider';
import { NOTIFICATION_PROVIDER } from './providers/notification.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_PROVIDER,
      useClass: DefaultNotificationProvider,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **Step 8: Ajouter dans AppModule**

```typescript
// Dans src/app.module.ts
import { NotificationsModule } from './notifications/notifications.module';

// Dans imports:
NotificationsModule,
```

- [ ] **Step 9: Commit**

```bash
git add src/notifications/ src/app.module.ts
git commit -m "feat(notifications): add notifications module with abstract provider"
```

---

## Phase 5: Backend - Module Online Orders

### Task 17: Entités OnlineOrder et OnlineOrderItem

**Files:**
- Create: `src/online-orders/entities/online-order.entity.ts`
- Create: `src/online-orders/entities/online-order-item.entity.ts`

**Interfaces:**
- Produces: Entités pour les commandes en ligne

- [ ] **Step 1: Créer OnlineOrder entity**

```typescript
// src/online-orders/entities/online-order.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerAccount } from '../../customer-auth/entities/customer-account.entity';
import { Client } from '../../clients/entities/client.entity';
import { Vente } from '../../ventes/entities/vente.entity';
import { OnlineOrderItem } from './online-order-item.entity';

export enum OnlineOrderStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRMEE = 'CONFIRMEE',
  PRETE = 'PRETE',
  LIVREE = 'LIVREE',
  ANNULEE = 'ANNULEE',
}

export enum ModeLivraison {
  LIVRAISON = 'LIVRAISON',
  RETRAIT_BOUTIQUE = 'RETRAIT_BOUTIQUE',
}

@Entity('online_order')
export class OnlineOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  numero: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid' })
  customerAccountId: string;

  @ManyToOne(() => CustomerAccount)
  @JoinColumn({ name: 'customerAccountId' })
  customerAccount: CustomerAccount;

  @Column({ type: 'uuid', nullable: true })
  clientId: string;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({
    type: 'enum',
    enum: OnlineOrderStatut,
    default: OnlineOrderStatut.EN_ATTENTE,
  })
  @Index()
  statut: OnlineOrderStatut;

  @Column({ type: 'enum', enum: ModeLivraison })
  modeLivraison: ModeLivraison;

  @Column({ type: 'varchar', length: 500, nullable: true })
  adresseLivraison: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephoneLivraison: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fraisLivraison: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sousTotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  motifAnnulation: string;

  @Column({ type: 'uuid', nullable: true })
  confirmeePar: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmeeLe: Date;

  @Column({ type: 'timestamp', nullable: true })
  preteLe: Date;

  @Column({ type: 'timestamp', nullable: true })
  livreeLe: Date;

  @Column({ type: 'timestamp', nullable: true })
  annuleeLe: Date;

  @Column({ type: 'uuid', nullable: true })
  venteId: string;

  @ManyToOne(() => Vente, { nullable: true })
  @JoinColumn({ name: 'venteId' })
  vente: Vente;

  @OneToMany(() => OnlineOrderItem, item => item.onlineOrder, { cascade: true })
  items: OnlineOrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Créer OnlineOrderItem entity**

```typescript
// src/online-orders/entities/online-order-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OnlineOrder } from './online-order.entity';
import { Article } from '../../stock/entities/article.entity';
import { ModeVente } from '../../stock/entities/mode-vente.entity';

@Entity('online_order_item')
export class OnlineOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  onlineOrderId: string;

  @ManyToOne(() => OnlineOrder, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'onlineOrderId' })
  onlineOrder: OnlineOrder;

  @Column({ type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column({ type: 'varchar', length: 255 })
  articleNom: string;

  @Column({ type: 'uuid', nullable: true })
  modeVenteId: string;

  @ManyToOne(() => ModeVente, { nullable: true })
  @JoinColumn({ name: 'modeVenteId' })
  modeVente: ModeVente;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modeVenteNom: string;

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sousTotal: number;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/online-orders/entities/
git commit -m "feat(online-orders): add OnlineOrder and OnlineOrderItem entities"
```

---

### Task 18: DTOs Online Orders

**Files:**
- Create: `src/online-orders/dto/create-online-order.dto.ts`
- Create: `src/online-orders/dto/update-order-status.dto.ts`
- Create: `src/online-orders/dto/online-order-response.dto.ts`
- Create: `src/online-orders/dto/index.ts`

**Interfaces:**
- Produces: DTOs pour la création et gestion des commandes

- [ ] **Step 1: Créer CreateOnlineOrderDto**

```typescript
// src/online-orders/dto/create-online-order.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModeLivraison } from '../entities/online-order.entity';

export class CreateOnlineOrderItemDto {
  @ApiProperty()
  @IsUUID()
  articleId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modeVenteId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantite: number;
}

export class CreateOnlineOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeSlug: string;

  @ApiProperty({ enum: ModeLivraison })
  @IsEnum(ModeLivraison)
  modeLivraison: ModeLivraison;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresseLivraison?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telephoneLivraison?: string;

  @ApiProperty({ type: [CreateOnlineOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOnlineOrderItemDto)
  items: CreateOnlineOrderItemDto[];
}
```

- [ ] **Step 2: Créer UpdateOrderStatusDto**

```typescript
// src/online-orders/dto/update-order-status.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motif?: string;
}
```

- [ ] **Step 3: Créer OnlineOrderResponseDto**

```typescript
// src/online-orders/dto/online-order-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnlineOrderStatut, ModeLivraison } from '../entities/online-order.entity';

export class OnlineOrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  articleId: string;

  @ApiProperty()
  articleNom: string;

  @ApiPropertyOptional()
  modeVenteId?: string;

  @ApiPropertyOptional()
  modeVenteNom?: string;

  @ApiProperty()
  quantite: number;

  @ApiProperty()
  prixUnitaire: number;

  @ApiProperty()
  sousTotal: number;
}

export class OnlineOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  numero: string;

  @ApiProperty({ enum: OnlineOrderStatut })
  statut: OnlineOrderStatut;

  @ApiProperty({ enum: ModeLivraison })
  modeLivraison: ModeLivraison;

  @ApiPropertyOptional()
  adresseLivraison?: string;

  @ApiPropertyOptional()
  telephoneLivraison?: string;

  @ApiProperty()
  fraisLivraison: number;

  @ApiProperty()
  sousTotal: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  customerNom: string;

  @ApiProperty()
  customerTelephone: string;

  @ApiPropertyOptional()
  motifAnnulation?: string;

  @ApiProperty({ type: [OnlineOrderItemResponseDto] })
  items: OnlineOrderItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  confirmeeLe?: Date;

  @ApiPropertyOptional()
  preteLe?: Date;

  @ApiPropertyOptional()
  livreeLe?: Date;

  @ApiPropertyOptional()
  annuleeLe?: Date;

  @ApiPropertyOptional()
  whatsappLink?: string;
}
```

- [ ] **Step 4: Créer index.ts**

```typescript
// src/online-orders/dto/index.ts
export * from './create-online-order.dto';
export * from './update-order-status.dto';
export * from './online-order-response.dto';
```

- [ ] **Step 5: Commit**

```bash
git add src/online-orders/dto/
git commit -m "feat(online-orders): add DTOs"
```

---

### Task 19: Online Orders Service

**Files:**
- Create: `src/online-orders/online-orders.service.ts`

**Interfaces:**
- Consumes: Entities, StorefrontService, NotificationsService, VentesService
- Produces: Service complet de gestion des commandes

- [ ] **Step 1: Créer le service (partie 1 - création commande)**

```typescript
// src/online-orders/online-orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnlineOrder, OnlineOrderStatut, ModeLivraison } from './entities/online-order.entity';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { StoreFront } from '../storefront/entities/storefront.entity';
import { Article } from '../stock/entities/article.entity';
import { ModeVente } from '../stock/entities/mode-vente.entity';
import { Client } from '../clients/entities/client.entity';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateOnlineOrderDto, OnlineOrderResponseDto, CancelOrderDto } from './dto';

@Injectable()
export class OnlineOrdersService {
  constructor(
    @InjectRepository(OnlineOrder)
    private onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(OnlineOrderItem)
    private onlineOrderItemRepository: Repository<OnlineOrderItem>,
    @InjectRepository(StoreFront)
    private storefrontRepository: Repository<StoreFront>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(ModeVente)
    private modeVenteRepository: Repository<ModeVente>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(CustomerAccount)
    private customerAccountRepository: Repository<CustomerAccount>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOnlineOrderDto, customerId: string): Promise<OnlineOrderResponseDto> {
    // Récupérer la boutique
    const storefront = await this.storefrontRepository.findOne({
      where: { slug: dto.storeSlug, isActive: true },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée ou inactive');
    }

    // Récupérer le customer
    const customer = await this.customerAccountRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Compte client non trouvé');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Générer le numéro de commande
      const numero = await this.generateNumero(storefront.organizationId);

      // Calculer les totaux et créer les items
      let sousTotal = 0;
      const orderItems: Partial<OnlineOrderItem>[] = [];

      for (const itemDto of dto.items) {
        const article = await this.articleRepository.findOne({
          where: { id: itemDto.articleId, organizationId: storefront.organizationId, disponibleEnLigne: true },
        });

        if (!article) {
          throw new BadRequestException(`Article ${itemDto.articleId} non trouvé ou non disponible en ligne`);
        }

        let prixUnitaire = article.prixEnLigne || article.prixVente;
        let modeVenteNom: string | null = null;

        if (itemDto.modeVenteId) {
          const modeVente = await this.modeVenteRepository.findOne({
            where: { id: itemDto.modeVenteId, articleId: article.id },
          });

          if (modeVente) {
            prixUnitaire = modeVente.prixVente;
            modeVenteNom = modeVente.nom;
          }
        }

        const itemSousTotal = prixUnitaire * itemDto.quantite;
        sousTotal += itemSousTotal;

        orderItems.push({
          articleId: article.id,
          articleNom: article.nom,
          modeVenteId: itemDto.modeVenteId,
          modeVenteNom,
          quantite: itemDto.quantite,
          prixUnitaire,
          sousTotal: itemSousTotal,
          organizationId: storefront.organizationId,
        });
      }

      // Frais de livraison
      const fraisLivraison = dto.modeLivraison === ModeLivraison.LIVRAISON
        ? Number(storefront.fraisLivraison)
        : 0;

      const total = sousTotal + fraisLivraison;

      // Chercher ou créer le client lié
      let clientId: string | null = null;
      const existingClient = await this.clientRepository.findOne({
        where: { telephone: customer.telephone, organizationId: storefront.organizationId },
      });

      if (existingClient) {
        clientId = existingClient.id;
        // Lier le customerAccount si pas déjà fait
        if (!existingClient.customerAccountId) {
          await queryRunner.manager.update(Client, existingClient.id, {
            customerAccountId: customer.id,
          });
        }
      }

      // Créer la commande
      const order = queryRunner.manager.create(OnlineOrder, {
        numero,
        organizationId: storefront.organizationId,
        customerAccountId: customer.id,
        clientId,
        statut: OnlineOrderStatut.EN_ATTENTE,
        modeLivraison: dto.modeLivraison,
        adresseLivraison: dto.adresseLivraison,
        telephoneLivraison: dto.telephoneLivraison || customer.telephone,
        fraisLivraison,
        sousTotal,
        total,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Créer les items
      for (const item of orderItems) {
        const orderItem = queryRunner.manager.create(OnlineOrderItem, {
          ...item,
          onlineOrderId: savedOrder.id,
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      // Envoyer notification à la boutique
      await this.notificationsService.sendToStore(storefront.organizationId, {
        type: NotificationType.NOUVELLE_COMMANDE,
        title: 'Nouvelle commande',
        message: `Nouvelle commande #${numero} de ${customer.nom} - ${total} GNF`,
        data: { orderId: savedOrder.id, numero, total },
      });

      // Récupérer la commande complète
      return this.getById(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getById(id: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id },
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    return this.toResponseDto(order);
  }

  async getByCustomer(customerId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [orders, total] = await this.onlineOrderRepository.findAndCount({
      where: { customerAccountId: customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Charger les customerAccount séparément pour éviter les problèmes de relation
    const customer = await this.customerAccountRepository.findOne({ where: { id: customerId } });

    return {
      data: orders.map(o => this.toResponseDto(o, customer)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getByOrganization(organizationId: string, page: number = 1, limit: number = 20, statut?: OnlineOrderStatut): Promise<any> {
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (statut) {
      where.statut = statut;
    }

    const [orders, total] = await this.onlineOrderRepository.findAndCount({
      where,
      relations: ['items', 'customerAccount'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: orders.map(o => this.toResponseDto(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingCount(organizationId: string): Promise<{ count: number; lastOrderAt: Date | null }> {
    const count = await this.onlineOrderRepository.count({
      where: { organizationId, statut: OnlineOrderStatut.EN_ATTENTE },
    });

    const lastOrder = await this.onlineOrderRepository.findOne({
      where: { organizationId, statut: OnlineOrderStatut.EN_ATTENTE },
      order: { createdAt: 'DESC' },
    });

    return {
      count,
      lastOrderAt: lastOrder?.createdAt || null,
    };
  }

  async getStats(organizationId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [enAttente, confirmees, pretes, livreesToday, total] = await Promise.all([
      this.onlineOrderRepository.count({ where: { organizationId, statut: OnlineOrderStatut.EN_ATTENTE } }),
      this.onlineOrderRepository.count({ where: { organizationId, statut: OnlineOrderStatut.CONFIRMEE } }),
      this.onlineOrderRepository.count({ where: { organizationId, statut: OnlineOrderStatut.PRETE } }),
      this.onlineOrderRepository
        .createQueryBuilder('o')
        .where('o.organizationId = :organizationId', { organizationId })
        .andWhere('o.statut = :statut', { statut: OnlineOrderStatut.LIVREE })
        .andWhere('o.livreeLe >= :today', { today })
        .getCount(),
      this.onlineOrderRepository.count({ where: { organizationId } }),
    ]);

    return {
      enAttente,
      confirmees,
      pretes,
      livreesToday,
      total,
    };
  }

  async confirm(orderId: string, organizationId: string, userId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.EN_ATTENTE) {
      throw new BadRequestException('Cette commande ne peut pas être confirmée');
    }

    // TODO: Décrémenter le stock et créer la vente
    // Pour l'instant, juste changer le statut

    order.statut = OnlineOrderStatut.CONFIRMEE;
    order.confirmeePar = userId;
    order.confirmeeLe = new Date();

    await this.onlineOrderRepository.save(order);

    // Notifier le client
    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_CONFIRMEE,
      title: 'Commande confirmée',
      message: `Votre commande #${order.numero} a été confirmée`,
      data: { orderId: order.id, numero: order.numero },
    });

    return this.toResponseDto(order);
  }

  async markReady(orderId: string, organizationId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.CONFIRMEE) {
      throw new BadRequestException('Cette commande ne peut pas être marquée prête');
    }

    order.statut = OnlineOrderStatut.PRETE;
    order.preteLe = new Date();

    await this.onlineOrderRepository.save(order);

    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_PRETE,
      title: 'Commande prête',
      message: `Votre commande #${order.numero} est prête`,
      data: { orderId: order.id, numero: order.numero },
    });

    return this.toResponseDto(order);
  }

  async markDelivered(orderId: string, organizationId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.PRETE && order.statut !== OnlineOrderStatut.CONFIRMEE) {
      throw new BadRequestException('Cette commande ne peut pas être marquée livrée');
    }

    order.statut = OnlineOrderStatut.LIVREE;
    order.livreeLe = new Date();

    await this.onlineOrderRepository.save(order);

    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_LIVREE,
      title: 'Commande livrée',
      message: `Votre commande #${order.numero} a été livrée. Merci !`,
      data: { orderId: order.id, numero: order.numero },
    });

    return this.toResponseDto(order);
  }

  async cancel(orderId: string, organizationId: string, dto: CancelOrderDto): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut === OnlineOrderStatut.LIVREE || order.statut === OnlineOrderStatut.ANNULEE) {
      throw new BadRequestException('Cette commande ne peut pas être annulée');
    }

    // TODO: Si confirmée, remettre le stock

    order.statut = OnlineOrderStatut.ANNULEE;
    order.motifAnnulation = dto.motif;
    order.annuleeLe = new Date();

    await this.onlineOrderRepository.save(order);

    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_ANNULEE,
      title: 'Commande annulée',
      message: `Votre commande #${order.numero} a été annulée${dto.motif ? ': ' + dto.motif : ''}`,
      data: { orderId: order.id, numero: order.numero, motif: dto.motif },
    });

    return this.toResponseDto(order);
  }

  private async generateNumero(organizationId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const lastOrder = await this.onlineOrderRepository
      .createQueryBuilder('o')
      .where('o.organizationId = :organizationId', { organizationId })
      .andWhere('o.numero LIKE :pattern', { pattern: `CMD-${year}${month}-%` })
      .orderBy('o.numero', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.numero.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `CMD-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  private toResponseDto(order: OnlineOrder, customer?: CustomerAccount): OnlineOrderResponseDto {
    const customerData = order.customerAccount || customer;

    return {
      id: order.id,
      numero: order.numero,
      statut: order.statut,
      modeLivraison: order.modeLivraison,
      adresseLivraison: order.adresseLivraison,
      telephoneLivraison: order.telephoneLivraison,
      fraisLivraison: Number(order.fraisLivraison),
      sousTotal: Number(order.sousTotal),
      total: Number(order.total),
      customerNom: customerData?.nom || '',
      customerTelephone: customerData?.telephone || '',
      motifAnnulation: order.motifAnnulation,
      items: order.items?.map(item => ({
        id: item.id,
        articleId: item.articleId,
        articleNom: item.articleNom,
        modeVenteId: item.modeVenteId,
        modeVenteNom: item.modeVenteNom,
        quantite: item.quantite,
        prixUnitaire: Number(item.prixUnitaire),
        sousTotal: Number(item.sousTotal),
      })) || [],
      createdAt: order.createdAt,
      confirmeeLe: order.confirmeeLe,
      preteLe: order.preteLe,
      livreeLe: order.livreeLe,
      annuleeLe: order.annuleeLe,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/online-orders/online-orders.service.ts
git commit -m "feat(online-orders): add OnlineOrdersService"
```

---

### Task 20: Online Orders Controllers et Module

**Files:**
- Create: `src/online-orders/online-orders.controller.ts`
- Create: `src/online-orders/online-orders-public.controller.ts`
- Create: `src/online-orders/online-orders.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: Controllers et module intégrés

- [ ] **Step 1: Créer le controller back-office**

```typescript
// src/online-orders/online-orders.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { OnlineOrdersService } from './online-orders.service';
import { CancelOrderDto } from './dto';
import { OnlineOrderStatut } from './entities/online-order.entity';

@ApiTags('online-orders')
@Controller('online-orders')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class OnlineOrdersController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des commandes en ligne' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'statut', required: false, enum: OnlineOrderStatut })
  getOrders(
    @CurrentOrganization() organizationId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('statut') statut?: OnlineOrderStatut,
  ) {
    return this.onlineOrdersService.getByOrganization(organizationId, Number(page), Number(limit), statut);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des commandes' })
  getStats(@CurrentOrganization() organizationId: string) {
    return this.onlineOrdersService.getStats(organizationId);
  }

  @Get('pending-count')
  @ApiOperation({ summary: 'Nombre de commandes en attente' })
  getPendingCount(@CurrentOrganization() organizationId: string) {
    return this.onlineOrdersService.getPendingCount(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une commande' })
  getOrder(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.onlineOrdersService.getById(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmer une commande' })
  confirmOrder(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
    @Request() req,
  ) {
    return this.onlineOrdersService.confirm(id, organizationId, req.user.id);
  }

  @Patch(':id/ready')
  @ApiOperation({ summary: 'Marquer une commande comme prête' })
  markReady(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.onlineOrdersService.markReady(id, organizationId);
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Marquer une commande comme livrée' })
  markDelivered(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.onlineOrdersService.markDelivered(id, organizationId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une commande' })
  cancelOrder(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.onlineOrdersService.cancel(id, organizationId, dto);
  }
}
```

- [ ] **Step 2: Créer le controller public**

```typescript
// src/online-orders/online-orders-public.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { OnlineOrdersService } from './online-orders.service';
import { CreateOnlineOrderDto } from './dto';

@ApiTags('public/orders')
@Controller('public/orders')
export class OnlineOrdersPublicController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @UseGuards(CustomerJwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Passer une commande' })
  createOrder(
    @CurrentCustomer() customer: CustomerAccount,
    @Body() dto: CreateOnlineOrderDto,
  ) {
    return this.onlineOrdersService.create(dto, customer.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes commandes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyOrders(
    @CurrentCustomer() customer: CustomerAccount,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.onlineOrdersService.getByCustomer(customer.id, Number(page), Number(limit));
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'une commande' })
  getOrder(@Param('id') id: string) {
    return this.onlineOrdersService.getById(id);
  }
}
```

- [ ] **Step 3: Créer le module**

```typescript
// src/online-orders/online-orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { StoreFront } from '../storefront/entities/storefront.entity';
import { Article } from '../stock/entities/article.entity';
import { ModeVente } from '../stock/entities/mode-vente.entity';
import { Client } from '../clients/entities/client.entity';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { OnlineOrdersService } from './online-orders.service';
import { OnlineOrdersController } from './online-orders.controller';
import { OnlineOrdersPublicController } from './online-orders-public.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnlineOrder,
      OnlineOrderItem,
      StoreFront,
      Article,
      ModeVente,
      Client,
      CustomerAccount,
    ]),
    NotificationsModule,
  ],
  controllers: [OnlineOrdersController, OnlineOrdersPublicController],
  providers: [OnlineOrdersService],
  exports: [OnlineOrdersService],
})
export class OnlineOrdersModule {}
```

- [ ] **Step 4: Ajouter dans AppModule**

```typescript
// Dans src/app.module.ts
import { OnlineOrdersModule } from './online-orders/online-orders.module';

// Dans imports:
OnlineOrdersModule,
```

- [ ] **Step 5: Vérifier la compilation**

Run: `npm run build`
Expected: Build réussi sans erreurs

- [ ] **Step 6: Commit**

```bash
git add src/online-orders/ src/app.module.ts
git commit -m "feat(online-orders): add controllers and module"
```

---

## Phase 6: Backend - Modifications Stock

### Task 21: Modifier le DTO et Service Stock

**Files:**
- Modify: `src/stock/dto/create-article.dto.ts`
- Modify: `src/stock/dto/update-article.dto.ts`

**Interfaces:**
- Produces: DTOs avec champs disponibleEnLigne et prixEnLigne

- [ ] **Step 1: Modifier CreateArticleDto**

Ajouter les champs dans `src/stock/dto/create-article.dto.ts`:

```typescript
@ApiPropertyOptional({ default: false })
@IsOptional()
@IsBoolean()
disponibleEnLigne?: boolean;

@ApiPropertyOptional()
@IsOptional()
@IsNumber()
@Min(0)
prixEnLigne?: number;
```

- [ ] **Step 2: Modifier UpdateArticleDto**

Ajouter les mêmes champs dans `src/stock/dto/update-article.dto.ts`:

```typescript
@ApiPropertyOptional()
@IsOptional()
@IsBoolean()
disponibleEnLigne?: boolean;

@ApiPropertyOptional()
@IsOptional()
@IsNumber()
@Min(0)
prixEnLigne?: number;
```

- [ ] **Step 3: Commit**

```bash
git add src/stock/dto/
git commit -m "feat(stock): add online fields to Article DTOs"
```

---

## Phase 7: Tests et validation Backend

### Task 22: Tester l'API complète

**Files:**
- Aucun fichier créé

**Interfaces:**
- Validates: Tous les endpoints fonctionnent

- [ ] **Step 1: Lancer le serveur**

Run: `npm run start:dev`
Expected: Serveur démarré sans erreurs

- [ ] **Step 2: Tester l'enregistrement client**

```bash
curl -X POST http://localhost:3000/api/public/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test Client","telephone":"624000001","password":"test123"}'
```
Expected: Réponse avec customer et access_token

- [ ] **Step 3: Tester la liste des boutiques**

```bash
curl http://localhost:3000/api/public/stores
```
Expected: Liste des boutiques actives (peut être vide)

- [ ] **Step 4: Commit final Phase Backend**

```bash
git add .
git commit -m "feat: complete backend for Espace Client & Online Orders"
```

---

## Notes pour les phases Frontend

Les phases Frontend (7-13) suivront le même pattern de tasks détaillées pour:
- Layouts PublicLayout et CustomerLayout
- Routing avec lazy loading
- Context CustomerAuthContext
- Pages publiques (StorePage, CartPage, CheckoutPage)
- Pages customer (Login, Register, Orders)
- Pages back-office (OnlineOrders, StorefrontSettings)
- Hooks et API clients
- Intégration polling et notifications navigateur

Ces tasks seront développées dans un plan complémentaire ou implémentées directement en suivant les patterns existants du projet.
