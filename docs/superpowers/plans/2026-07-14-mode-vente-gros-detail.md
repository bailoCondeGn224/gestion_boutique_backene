# Mode de Vente (Gros/Détail) - Plan d'Implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre la vente d'un même article sous différentes unités (casier/bouteille, sac/kilo, carton/pièce) avec des prix distincts et une gestion automatique du stock en unité de base.

**Architecture:**
- L'entité `Article` stocke toujours en unité de base (ex: bouteilles, kilos, pièces)
- L'entité `ModeVente` définit les différentes façons de vendre un article avec leur facteur de conversion
- `LigneVente` référence le mode de vente utilisé pour calculer automatiquement la déduction du stock

**Tech Stack:** NestJS, TypeORM, PostgreSQL, class-validator, Swagger

## Global Constraints

- Tous les fichiers backend sont dans `src/`
- Toutes les entités doivent étendre `BaseTenantEntity` pour le multi-tenant
- Les migrations suivent le format `TIMESTAMP-NomMigration.ts`
- Les DTOs utilisent class-validator pour la validation
- Les endpoints sont documentés avec Swagger (@ApiProperty)
- Les prix sont en GNF avec precision(15, 2)

---

## Phase 1: Backend - Entités et Migration

### Task 1: Créer l'entité ModeVente

**Files:**
- Create: `src/stock/entities/mode-vente.entity.ts`

**Interfaces:**
- Consumes: `BaseTenantEntity` de `src/common/entities/base-tenant.entity.ts`
- Produces: `ModeVente` entity avec relations vers `Article`

- [ ] **Step 1: Créer le fichier de l'entité ModeVente**

```typescript
// src/stock/entities/mode-vente.entity.ts
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
  nom: string; // Ex: "Casier", "Bouteille", "Sac 50kg", "Kilo"

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
  quantiteStock: number; // Facteur de conversion (ex: 12 pour un casier de 12 bouteilles)

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  prixVente: number; // Prix de vente pour ce mode

  @Column({ nullable: true })
  codeBarre: string; // Code-barres optionnel pour ce mode

  @Column({ type: 'boolean', default: false })
  parDefaut: boolean; // Mode de vente par défaut pour cet article

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Vérifier que le fichier est créé**

Run: `dir src\stock\entities\mode-vente.entity.ts`
Expected: Le fichier existe

---

### Task 2: Modifier l'entité Article pour ajouter la relation ModeVente

**Files:**
- Modify: `src/stock/entities/article.entity.ts:1-63`

**Interfaces:**
- Consumes: `ModeVente` de `src/stock/entities/mode-vente.entity.ts`
- Produces: `Article` avec `uniteStock: string` et relation `modesVente: ModeVente[]`

- [ ] **Step 1: Ajouter l'import de ModeVente et OneToMany**

Dans `src/stock/entities/article.entity.ts`, ajouter après les imports existants:

```typescript
import { OneToMany } from 'typeorm';
// ... (ajouter au bloc d'import de typeorm: OneToMany)
import { ModeVente } from './mode-vente.entity';
```

- [ ] **Step 2: Ajouter le champ uniteStock à l'entité Article**

Après le champ `description`, ajouter:

```typescript
  @Column({ default: 'Unité' })
  uniteStock: string; // Nom de l'unité de base (ex: "Bouteille", "Kilo", "Pièce")
```

- [ ] **Step 3: Ajouter la relation OneToMany vers ModeVente**

Avant le champ `createdAt`, ajouter:

```typescript
  @OneToMany(() => ModeVente, (mode) => mode.article, {
    cascade: true,
    eager: false,
  })
  modesVente: ModeVente[];
```

- [ ] **Step 4: Vérifier la syntaxe**

Run: `npx tsc --noEmit src/stock/entities/article.entity.ts`
Expected: Pas d'erreurs de compilation

---

### Task 3: Modifier l'entité LigneVente pour référencer ModeVente

**Files:**
- Modify: `src/ventes/entities/ligne-vente.entity.ts:1-47`

**Interfaces:**
- Consumes: `ModeVente` de `src/stock/entities/mode-vente.entity.ts`
- Produces: `LigneVente` avec `modeVenteId?: string` et `quantiteBase: number`

- [ ] **Step 1: Ajouter l'import de ModeVente**

Dans `src/ventes/entities/ligne-vente.entity.ts`, ajouter:

```typescript
import { ModeVente } from '../../stock/entities/mode-vente.entity';
```

- [ ] **Step 2: Ajouter les champs modeVenteId et quantiteBase**

Après le champ `articleId`, ajouter:

```typescript
  @Column({ nullable: true })
  modeVenteId: string; // Mode de vente utilisé (null = vente directe en unité de base)

  @ManyToOne(() => ModeVente, { nullable: true })
  @JoinColumn({ name: 'modeVenteId' })
  modeVente: ModeVente;

  @Column({ type: 'int', nullable: true })
  quantiteBase: number; // Quantité réellement déduite du stock (en unité de base)
```

- [ ] **Step 3: Vérifier la syntaxe**

Run: `npx tsc --noEmit src/ventes/entities/ligne-vente.entity.ts`
Expected: Pas d'erreurs de compilation

---

### Task 4: Créer la migration pour ModeVente

**Files:**
- Create: `src/migrations/1752000000000-CreateModeVenteTable.ts`

**Interfaces:**
- Produces: Tables `mode_vente` avec colonnes et contraintes

- [ ] **Step 1: Créer le fichier de migration**

```typescript
// src/migrations/1752000000000-CreateModeVenteTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModeVenteTable1752000000000 implements MigrationInterface {
  name = 'CreateModeVenteTable1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Créer la table mode_vente
    await queryRunner.query(`
      CREATE TABLE "mode_vente" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "articleId" uuid NOT NULL,
        "nom" character varying NOT NULL,
        "quantiteStock" numeric(15,4) NOT NULL DEFAULT '1',
        "prixVente" numeric(15,2) NOT NULL,
        "codeBarre" character varying,
        "parDefaut" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mode_vente" PRIMARY KEY ("id")
      )
    `);

    // 2. Ajouter les index
    await queryRunner.query(`
      CREATE INDEX "IDX_mode_vente_organization" ON "mode_vente" ("organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_mode_vente_article_org" ON "mode_vente" ("articleId", "organizationId")
    `);

    // 3. Ajouter les clés étrangères
    await queryRunner.query(`
      ALTER TABLE "mode_vente"
      ADD CONSTRAINT "FK_mode_vente_article"
      FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "mode_vente"
      ADD CONSTRAINT "FK_mode_vente_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE
    `);

    // 4. Ajouter le champ uniteStock à la table article
    await queryRunner.query(`
      ALTER TABLE "article"
      ADD COLUMN IF NOT EXISTS "uniteStock" character varying NOT NULL DEFAULT 'Unité'
    `);

    // 5. Ajouter les champs à ligne_vente
    await queryRunner.query(`
      ALTER TABLE "ligne_vente"
      ADD COLUMN IF NOT EXISTS "modeVenteId" uuid,
      ADD COLUMN IF NOT EXISTS "quantiteBase" integer
    `);

    // 6. Ajouter la clé étrangère pour modeVenteId
    await queryRunner.query(`
      ALTER TABLE "ligne_vente"
      ADD CONSTRAINT "FK_ligne_vente_mode_vente"
      FOREIGN KEY ("modeVenteId") REFERENCES "mode_vente"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Supprimer la contrainte FK sur ligne_vente
    await queryRunner.query(`
      ALTER TABLE "ligne_vente" DROP CONSTRAINT IF EXISTS "FK_ligne_vente_mode_vente"
    `);

    // 2. Supprimer les colonnes de ligne_vente
    await queryRunner.query(`
      ALTER TABLE "ligne_vente"
      DROP COLUMN IF EXISTS "modeVenteId",
      DROP COLUMN IF EXISTS "quantiteBase"
    `);

    // 3. Supprimer le champ uniteStock de article
    await queryRunner.query(`
      ALTER TABLE "article" DROP COLUMN IF EXISTS "uniteStock"
    `);

    // 4. Supprimer la table mode_vente
    await queryRunner.query(`DROP TABLE IF EXISTS "mode_vente"`);
  }
}
```

- [ ] **Step 2: Exécuter la migration**

Run: `npm run migration:run`
Expected: Migration exécutée avec succès

- [ ] **Step 3: Commit les entités et la migration**

```bash
git add src/stock/entities/mode-vente.entity.ts src/stock/entities/article.entity.ts src/ventes/entities/ligne-vente.entity.ts src/migrations/1752000000000-CreateModeVenteTable.ts
git commit -m "feat(stock): add ModeVente entity for wholesale/retail sales

- Create ModeVente entity with conversion factor (quantiteStock)
- Add uniteStock field to Article entity
- Add modeVenteId and quantiteBase to LigneVente
- Create migration for database schema changes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Backend - DTOs et Validation

### Task 5: Créer les DTOs pour ModeVente

**Files:**
- Create: `src/stock/dto/create-mode-vente.dto.ts`
- Create: `src/stock/dto/update-mode-vente.dto.ts`

**Interfaces:**
- Produces: `CreateModeVenteDto`, `UpdateModeVenteDto` avec validation class-validator

- [ ] **Step 1: Créer le DTO de création**

```typescript
// src/stock/dto/create-mode-vente.dto.ts
import { IsString, IsNumber, Min, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModeVenteDto {
  @ApiProperty({
    example: 'uuid-article',
    description: 'ID de l\'article associé',
  })
  @IsUUID()
  articleId: string;

  @ApiProperty({
    example: 'Casier',
    description: 'Nom du mode de vente (ex: Casier, Bouteille, Sac 50kg)',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: 12,
    description: 'Nombre d\'unités de base dans ce mode (ex: 12 bouteilles par casier)',
    minimum: 0.0001,
  })
  @IsNumber()
  @Min(0.0001, { message: 'La quantité doit être supérieure à 0' })
  quantiteStock: number;

  @ApiProperty({
    example: 60000,
    description: 'Prix de vente pour ce mode en GNF',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Le prix de vente ne peut pas être négatif' })
  prixVente: number;

  @ApiProperty({
    example: '1234567890123',
    description: 'Code-barres pour ce mode de vente',
    required: false,
  })
  @IsString()
  @IsOptional()
  codeBarre?: string;

  @ApiProperty({
    example: true,
    description: 'Définir comme mode de vente par défaut',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  parDefaut?: boolean;
}
```

- [ ] **Step 2: Créer le DTO de mise à jour**

```typescript
// src/stock/dto/update-mode-vente.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateModeVenteDto } from './create-mode-vente.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateModeVenteDto extends PartialType(
  OmitType(CreateModeVenteDto, ['articleId'] as const),
) {}
```

- [ ] **Step 3: Mettre à jour le DTO CreateArticleDto pour inclure uniteStock**

Modifier `src/stock/dto/create-article.dto.ts`, ajouter après `description`:

```typescript
  @ApiProperty({
    example: 'Bouteille',
    description: 'Unité de stockage de base (ex: Bouteille, Kilo, Pièce)',
    required: false,
  })
  @IsString()
  @IsOptional()
  uniteStock?: string;
```

- [ ] **Step 4: Commit les DTOs**

```bash
git add src/stock/dto/create-mode-vente.dto.ts src/stock/dto/update-mode-vente.dto.ts src/stock/dto/create-article.dto.ts
git commit -m "feat(stock): add DTOs for ModeVente CRUD operations

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Créer le DTO pour les modes de vente intégrés à l'article

**Files:**
- Create: `src/stock/dto/mode-vente-inline.dto.ts`
- Modify: `src/stock/dto/create-article.dto.ts`

**Interfaces:**
- Produces: `ModeVenteInlineDto` pour créer des modes de vente avec l'article

- [ ] **Step 1: Créer le DTO inline**

```typescript
// src/stock/dto/mode-vente-inline.dto.ts
import { IsString, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModeVenteInlineDto {
  @ApiProperty({
    example: 'Casier',
    description: 'Nom du mode de vente',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: 12,
    description: 'Nombre d\'unités de base dans ce mode',
    minimum: 0.0001,
  })
  @IsNumber()
  @Min(0.0001)
  quantiteStock: number;

  @ApiProperty({
    example: 60000,
    description: 'Prix de vente pour ce mode',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  prixVente: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  codeBarre?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  parDefaut?: boolean;
}
```

- [ ] **Step 2: Ajouter modesVente au CreateArticleDto**

Dans `src/stock/dto/create-article.dto.ts`, ajouter:

```typescript
import { ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ModeVenteInlineDto } from './mode-vente-inline.dto';

// ... dans la classe, après uniteStock:

  @ApiProperty({
    type: [ModeVenteInlineDto],
    description: 'Modes de vente disponibles pour cet article',
    required: false,
    example: [
      { nom: 'Casier', quantiteStock: 12, prixVente: 60000, parDefaut: true },
      { nom: 'Bouteille', quantiteStock: 1, prixVente: 5500 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModeVenteInlineDto)
  @IsOptional()
  modesVente?: ModeVenteInlineDto[];
```

- [ ] **Step 3: Commit**

```bash
git add src/stock/dto/mode-vente-inline.dto.ts src/stock/dto/create-article.dto.ts
git commit -m "feat(stock): add inline ModeVente DTO for article creation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Backend - Service et Controller

### Task 7: Créer le service ModeVenteService

**Files:**
- Create: `src/stock/mode-vente.service.ts`

**Interfaces:**
- Consumes: `ModeVente` entity, `Repository<ModeVente>`
- Produces: Service avec méthodes CRUD pour ModeVente

- [ ] **Step 1: Créer le service**

```typescript
// src/stock/mode-vente.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModeVente } from './entities/mode-vente.entity';
import { CreateModeVenteDto } from './dto/create-mode-vente.dto';
import { UpdateModeVenteDto } from './dto/update-mode-vente.dto';
import { Article } from './entities/article.entity';

@Injectable()
export class ModeVenteService {
  constructor(
    @InjectRepository(ModeVente)
    private modeVenteRepository: Repository<ModeVente>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async create(
    createDto: CreateModeVenteDto,
    organizationId: string,
  ): Promise<ModeVente> {
    // Vérifier que l'article existe
    const article = await this.articleRepository.findOne({
      where: { id: createDto.articleId, organizationId },
    });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${createDto.articleId} introuvable`);
    }

    // Si parDefaut = true, désactiver les autres modes par défaut
    if (createDto.parDefaut) {
      await this.modeVenteRepository.update(
        { articleId: createDto.articleId, organizationId },
        { parDefaut: false },
      );
    }

    const modeVente = this.modeVenteRepository.create({
      ...createDto,
      organizationId,
    });

    return this.modeVenteRepository.save(modeVente);
  }

  async createMany(
    articleId: string,
    modes: Array<Omit<CreateModeVenteDto, 'articleId'>>,
    organizationId: string,
  ): Promise<ModeVente[]> {
    const created: ModeVente[] = [];

    for (const mode of modes) {
      const modeVente = this.modeVenteRepository.create({
        ...mode,
        articleId,
        organizationId,
      });
      created.push(await this.modeVenteRepository.save(modeVente));
    }

    return created;
  }

  async findByArticle(articleId: string, organizationId: string): Promise<ModeVente[]> {
    return this.modeVenteRepository.find({
      where: { articleId, organizationId },
      order: { parDefaut: 'DESC', nom: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<ModeVente> {
    const modeVente = await this.modeVenteRepository.findOne({
      where: { id, organizationId },
      relations: ['article'],
    });

    if (!modeVente) {
      throw new NotFoundException(`Mode de vente avec l'ID ${id} introuvable`);
    }

    return modeVente;
  }

  async findDefault(articleId: string, organizationId: string): Promise<ModeVente | null> {
    return this.modeVenteRepository.findOne({
      where: { articleId, organizationId, parDefaut: true },
    });
  }

  async update(
    id: string,
    updateDto: UpdateModeVenteDto,
    organizationId: string,
  ): Promise<ModeVente> {
    const modeVente = await this.findOne(id, organizationId);

    // Si on définit ce mode comme défaut, désactiver les autres
    if (updateDto.parDefaut) {
      await this.modeVenteRepository.update(
        { articleId: modeVente.articleId, organizationId },
        { parDefaut: false },
      );
    }

    Object.assign(modeVente, updateDto);
    return this.modeVenteRepository.save(modeVente);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const modeVente = await this.findOne(id, organizationId);

    // Vérifier si ce mode est utilisé dans des ventes
    // TODO: Ajouter cette vérification quand LigneVente sera mis à jour

    await this.modeVenteRepository.delete({ id, organizationId });
  }

  async removeByArticle(articleId: string, organizationId: string): Promise<void> {
    await this.modeVenteRepository.delete({ articleId, organizationId });
  }
}
```

- [ ] **Step 2: Vérifier la syntaxe**

Run: `npx tsc --noEmit src/stock/mode-vente.service.ts`
Expected: Pas d'erreurs

- [ ] **Step 3: Commit**

```bash
git add src/stock/mode-vente.service.ts
git commit -m "feat(stock): add ModeVenteService for CRUD operations

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Créer le controller ModeVenteController

**Files:**
- Create: `src/stock/mode-vente.controller.ts`

**Interfaces:**
- Consumes: `ModeVenteService`
- Produces: Endpoints REST pour CRUD ModeVente

- [ ] **Step 1: Créer le controller**

```typescript
// src/stock/mode-vente.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModeVenteService } from './mode-vente.service';
import { CreateModeVenteDto } from './dto/create-mode-vente.dto';
import { UpdateModeVenteDto } from './dto/update-mode-vente.dto';
import { SubscriptionGuard } from '../common/guards/subscription.guard';

@ApiTags('Modes de Vente')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('modes-vente')
export class ModeVenteController {
  constructor(private readonly modeVenteService: ModeVenteService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un mode de vente' })
  @ApiResponse({ status: 201, description: 'Mode de vente créé' })
  create(@Body() createDto: CreateModeVenteDto, @Request() req) {
    return this.modeVenteService.create(createDto, req.user.organizationId);
  }

  @Get('article/:articleId')
  @ApiOperation({ summary: 'Récupérer les modes de vente d\'un article' })
  @ApiResponse({ status: 200, description: 'Liste des modes de vente' })
  findByArticle(
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @Request() req,
  ) {
    return this.modeVenteService.findByArticle(articleId, req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un mode de vente par ID' })
  @ApiResponse({ status: 200, description: 'Mode de vente trouvé' })
  @ApiResponse({ status: 404, description: 'Mode de vente non trouvé' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.modeVenteService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un mode de vente' })
  @ApiResponse({ status: 200, description: 'Mode de vente modifié' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateModeVenteDto,
    @Request() req,
  ) {
    return this.modeVenteService.update(id, updateDto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un mode de vente' })
  @ApiResponse({ status: 200, description: 'Mode de vente supprimé' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.modeVenteService.remove(id, req.user.organizationId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stock/mode-vente.controller.ts
git commit -m "feat(stock): add ModeVenteController with REST endpoints

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Mettre à jour StockModule pour inclure ModeVente

**Files:**
- Modify: `src/stock/stock.module.ts:1-23`

**Interfaces:**
- Consumes: `ModeVente`, `ModeVenteService`, `ModeVenteController`
- Produces: Module mis à jour avec exports

- [ ] **Step 1: Mettre à jour le module**

```typescript
// src/stock/stock.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Article } from './entities/article.entity';
import { ModeVente } from './entities/mode-vente.entity';
import { ModeVenteService } from './mode-vente.service';
import { ModeVenteController } from './mode-vente.controller';
import { CategoriesModule } from '../categories/categories.module';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';
import { MouvementStock } from '../mouvements-stock/entities/mouvement-stock.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ModeVente,
      LigneVente,
      LigneApprovisionnement,
      MouvementStock,
    ]),
    CategoriesModule,
    MouvementsStockModule,
  ],
  controllers: [StockController, ModeVenteController],
  providers: [StockService, ModeVenteService],
  exports: [StockService, ModeVenteService],
})
export class StockModule {}
```

- [ ] **Step 2: Commit**

```bash
git add src/stock/stock.module.ts
git commit -m "feat(stock): register ModeVente in StockModule

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Modifier StockService pour gérer les modes de vente

**Files:**
- Modify: `src/stock/stock.service.ts`

**Interfaces:**
- Consumes: `ModeVenteService`
- Produces: `StockService` avec création automatique des modes de vente

- [ ] **Step 1: Ajouter ModeVenteService au constructeur**

Dans `src/stock/stock.service.ts`, ajouter l'import et l'injection:

```typescript
import { ModeVenteService } from './mode-vente.service';

// Dans le constructeur:
constructor(
  // ... autres injections
  private modeVenteService: ModeVenteService,
) {}
```

- [ ] **Step 2: Modifier la méthode create pour gérer modesVente**

```typescript
async create(
  createArticleDto: CreateArticleDto,
  organizationId: string,
  file?: Express.Multer.File,
): Promise<Article> {
  let photoPath: string | undefined;

  if (file) {
    photoPath = `articles/${organizationId}/${file.filename}`;
    compressImage(file.path).catch((error) => {
      console.error('Erreur compression image:', error);
    });
  }

  // Extraire modesVente du DTO
  const { modesVente, ...articleData } = createArticleDto;

  const article = this.articlesRepository.create({
    ...articleData,
    photo: photoPath,
    organizationId,
  });

  const savedArticle = await this.articlesRepository.save(article);

  // Créer les modes de vente si fournis
  if (modesVente && modesVente.length > 0) {
    await this.modeVenteService.createMany(
      savedArticle.id,
      modesVente,
      organizationId,
    );
  }

  // Créer un mouvement de stock si l'article a un stock initial > 0
  if (savedArticle.stock > 0) {
    await this.mouvementsStockService.create(
      {
        articleId: savedArticle.id,
        articleNom: savedArticle.nom,
        type: TypeMouvement.ENTREE,
        motif: MotifMouvement.AJUSTEMENT,
        quantite: savedArticle.stock,
        stockAvant: 0,
        stockApres: savedArticle.stock,
        prixUnitaire: Number(savedArticle.prixAchat),
        valeurTotal: savedArticle.stock * Number(savedArticle.prixAchat),
        date: new Date(),
        note: 'Stock initial lors de la création de l\'article',
      },
      organizationId,
    );
  }

  return savedArticle;
}
```

- [ ] **Step 3: Modifier findOne pour inclure les modes de vente**

```typescript
async findOne(id: string, organizationId: string): Promise<Article> {
  const article = await this.articlesRepository.findOne({
    where: { id, organizationId },
    relations: ['categorie', 'modesVente'],
  });
  if (!article) {
    throw new NotFoundException(`Article avec l'ID ${id} introuvable`);
  }
  return article;
}
```

- [ ] **Step 4: Modifier findAll pour inclure les modes de vente**

Dans la méthode `findAll`, ajouter:

```typescript
.leftJoinAndSelect('article.modesVente', 'modesVente')
```

- [ ] **Step 5: Commit**

```bash
git add src/stock/stock.service.ts
git commit -m "feat(stock): integrate ModeVente creation in StockService

- Create modes de vente when creating an article
- Load modesVente in findOne and findAll

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Backend - Mise à jour du service Ventes

### Task 11: Modifier VentesService pour utiliser ModeVente

**Files:**
- Modify: `src/ventes/ventes.service.ts`
- Modify: `src/ventes/dto/create-vente.dto.ts`

**Interfaces:**
- Consumes: `ModeVenteService`
- Produces: Déduction stock basée sur quantiteStock du mode

- [ ] **Step 1: Ajouter modeVenteId au LigneVenteDto**

Dans `src/ventes/dto/create-vente.dto.ts`, modifier `LigneVenteDto`:

```typescript
export class LigneVenteDto {
  @ApiProperty({ example: 'uuid-article' })
  @IsUUID()
  articleId: string;

  @ApiProperty({
    example: 'uuid-mode-vente',
    description: 'ID du mode de vente (optionnel, sinon vente en unité de base)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  modeVenteId?: string;

  // ... autres champs existants
}
```

- [ ] **Step 2: Injecter ModeVenteService dans VentesService**

Dans `src/ventes/ventes.service.ts`:

```typescript
import { ModeVenteService } from '../stock/mode-vente.service';
import { ModeVente } from '../stock/entities/mode-vente.entity';

// Dans le constructeur:
constructor(
  // ... autres injections
  private modeVenteService: ModeVenteService,
) {}
```

- [ ] **Step 3: Mettre à jour VentesModule pour importer StockModule**

Dans `src/ventes/ventes.module.ts`:

```typescript
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    // ... autres imports
    StockModule, // Ajouter pour avoir accès à ModeVenteService
  ],
  // ...
})
```

- [ ] **Step 4: Modifier la logique de création de vente**

Dans la méthode `create` de `VentesService`, modifier la boucle des lignes:

```typescript
for (const item of createVenteDto.lignes) {
  // Récupérer le stock avant modification
  const article = await this.stockService.findOne(item.articleId, organizationId);
  const stockAvant = article.stock;

  // Calculer la quantité en unité de base
  let quantiteBase = item.quantite;
  let modeVente: ModeVente | null = null;

  if (item.modeVenteId) {
    modeVente = await this.modeVenteService.findOne(item.modeVenteId, organizationId);
    quantiteBase = item.quantite * Number(modeVente.quantiteStock);
  }

  // Vérifier le stock disponible
  if (article.stock < quantiteBase) {
    throw new BadRequestException(
      `Stock insuffisant pour ${article.nom}. ` +
      `Disponible: ${article.stock} ${article.uniteStock || 'unités'}, ` +
      `Demandé: ${quantiteBase} ${article.uniteStock || 'unités'}`,
    );
  }

  // Stocker le prixAchat
  if (!item.prixAchat) {
    item.prixAchat = Number(article.prixAchat) || 0;
  }

  // Décrémenter le stock en unité de base
  await this.stockService.decrementStock(item.articleId, quantiteBase, organizationId);
  const stockApres = stockAvant - quantiteBase;

  // ... reste de la logique pour mouvement de stock
}
```

- [ ] **Step 5: Modifier l'insertion des lignes de vente**

```typescript
await queryRunner.manager.query(
  `INSERT INTO ligne_vente
   ("venteId", "articleId", "modeVenteId", nom, quantite, "quantiteBase", "prixUnitaire", "prixAchat", "sousTotal", "organizationId", "createdAt")
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
  [
    savedVente.id,
    ligne.articleId,
    ligne.modeVenteId || null,
    ligne.nom,
    ligne.quantite,
    quantiteBase,
    ligne.prixUnitaire,
    prixAchat,
    ligne.sousTotal,
    organizationId,
  ],
);
```

- [ ] **Step 6: Commit**

```bash
git add src/ventes/ventes.service.ts src/ventes/dto/create-vente.dto.ts src/ventes/ventes.module.ts
git commit -m "feat(ventes): integrate ModeVente for stock deduction

- Add modeVenteId to LigneVenteDto
- Calculate quantiteBase using mode conversion factor
- Update stock deduction to use base units

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Tests et Validation

### Task 12: Tester l'API ModeVente

**Files:**
- Aucun fichier à créer (tests manuels via Swagger)

**Interfaces:**
- Tester les endpoints CRUD via Swagger UI

- [ ] **Step 1: Démarrer le serveur**

Run: `npm run start:dev`
Expected: Serveur démarré sans erreurs

- [ ] **Step 2: Ouvrir Swagger**

Naviguer vers: `http://localhost:3000/api-docs`

- [ ] **Step 3: Tester la création d'un article avec modes de vente**

```json
POST /articles
{
  "nom": "Jus Banga Orange",
  "reference": "JUS-001",
  "categorieId": "uuid-boissons",
  "zone": "A",
  "stock": 120,
  "seuilAlerte": 24,
  "prixVente": 5500,
  "prixAchat": 4500,
  "uniteStock": "Bouteille",
  "modesVente": [
    {
      "nom": "Casier",
      "quantiteStock": 12,
      "prixVente": 60000,
      "parDefaut": true
    },
    {
      "nom": "Bouteille",
      "quantiteStock": 1,
      "prixVente": 5500
    }
  ]
}
```

- [ ] **Step 4: Tester une vente avec mode de vente**

```json
POST /ventes
{
  "lignes": [
    {
      "articleId": "uuid-jus",
      "modeVenteId": "uuid-mode-casier",
      "nom": "Jus Banga Orange (Casier)",
      "quantite": 2,
      "prixUnitaire": 60000,
      "sousTotal": 120000
    }
  ],
  "total": 120000,
  "modePaiement": "especes"
}
```

Expected: Stock déduit de 24 bouteilles (2 casiers × 12)

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "feat: complete ModeVente implementation for wholesale/retail sales

Phase 1: Backend entities and migration
- ModeVente entity with conversion factor
- Article.uniteStock field
- LigneVente.modeVenteId reference

Phase 2: DTOs and validation
- CreateModeVenteDto, UpdateModeVenteDto
- ModeVenteInlineDto for article creation

Phase 3: Service and Controller
- ModeVenteService with CRUD operations
- ModeVenteController with REST endpoints
- StockModule integration

Phase 4: Ventes integration
- Stock deduction using base unit conversion
- modeVenteId in LigneVente

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Résumé des fichiers

| Fichier | Action |
|---------|--------|
| `src/stock/entities/mode-vente.entity.ts` | Créer |
| `src/stock/entities/article.entity.ts` | Modifier |
| `src/ventes/entities/ligne-vente.entity.ts` | Modifier |
| `src/migrations/1752000000000-CreateModeVenteTable.ts` | Créer |
| `src/stock/dto/create-mode-vente.dto.ts` | Créer |
| `src/stock/dto/update-mode-vente.dto.ts` | Créer |
| `src/stock/dto/mode-vente-inline.dto.ts` | Créer |
| `src/stock/dto/create-article.dto.ts` | Modifier |
| `src/stock/mode-vente.service.ts` | Créer |
| `src/stock/mode-vente.controller.ts` | Créer |
| `src/stock/stock.module.ts` | Modifier |
| `src/stock/stock.service.ts` | Modifier |
| `src/ventes/dto/create-vente.dto.ts` | Modifier |
| `src/ventes/ventes.service.ts` | Modifier |
| `src/ventes/ventes.module.ts` | Modifier |

---

## Prochaines phases (Frontend)

Après validation du backend, implémenter le frontend:

1. **Phase 6**: Modifier `StockForm.tsx` pour ajouter les modes de vente
2. **Phase 7**: Modifier `VenteForm.tsx` pour sélectionner le mode de vente
3. **Phase 8**: Modifier `ArticleCard.tsx` pour afficher les différents prix
4. **Phase 9**: Modifier `BulkArticleForm.tsx` pour supporter les modes de vente
