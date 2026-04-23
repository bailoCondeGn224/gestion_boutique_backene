# BaseTenantService - Guide d'utilisation

## 📋 Vue d'ensemble

`BaseTenantService` est une classe abstraite qui fournit les opérations CRUD standard pour toutes les entités multi-tenant, avec filtrage automatique par `organizationId`.

---

## ✅ Service Simple (Article, Client, Fournisseur)

### Exemple: ClientsService

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { BaseTenantService } from '../common/services/base-tenant.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService extends BaseTenantService<Client> {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {
    // Passer le repository et le nom de l'entité
    super(clientsRepository, 'Client');
  }

  // ✅ MÉTHODES HÉRITÉES (pas besoin de les écrire):
  // - findAll(organizationId)
  // - findOne(id, organizationId)
  // - create(dto, organizationId)
  // - update(id, dto, organizationId)
  // - remove(id, organizationId)
  // - count(organizationId)
  // - exists(id, organizationId)

  // ✅ AJOUTER DES MÉTHODES SPÉCIFIQUES si besoin
  async findByEmail(email: string, organizationId: string): Promise<Client | null> {
    return this.repository.findOne({
      where: { email, organizationId },
    });
  }

  async findWithHighDebt(organizationId: string): Promise<Client[]> {
    return this.repository
      .createQueryBuilder('client')
      .where('client.organizationId = :organizationId', { organizationId })
      .andWhere('client.totalCredits > 100000')
      .orderBy('client.totalCredits', 'DESC')
      .getMany();
  }
}
```

### Controller correspondant:

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard, TenantGuard, CurrentOrganization } from '../common';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @Body() createClientDto: CreateClientDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.clientsService.create(createClientDto, orgId);
  }

  @Get()
  findAll(@CurrentOrganization() orgId: string) {
    return this.clientsService.findAll(orgId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() orgId: string,
  ) {
    return this.clientsService.findOne(id, orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.clientsService.update(id, updateClientDto, orgId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentOrganization() orgId: string,
  ) {
    return this.clientsService.remove(id, orgId);
  }

  // Méthode spécifique
  @Get('debt/high')
  findHighDebt(@CurrentOrganization() orgId: string) {
    return this.clientsService.findWithHighDebt(orgId);
  }
}
```

---

## 🔧 Service Avancé (avec méthodes spécifiques)

### Exemple: ArticlesService

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { BaseTenantService } from '../common/services/base-tenant.service';

@Injectable()
export class ArticlesService extends BaseTenantService<Article> {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
  ) {
    super(articlesRepository, 'Article');
  }

  // Surcharger findAll pour ajouter des relations
  override async findAll(organizationId: string): Promise<Article[]> {
    return super.findAll(organizationId, {
      relations: ['categorie'],
      order: { nom: 'ASC' },
    });
  }

  // Surcharger findOne pour ajouter des relations
  override async findOne(id: string, organizationId: string): Promise<Article> {
    return this.findOneWithRelations(id, organizationId, ['categorie']);
  }

  // Méthodes métier spécifiques
  async findAlerts(organizationId: string): Promise<Article[]> {
    return this.repository
      .createQueryBuilder('article')
      .where('article.organizationId = :organizationId', { organizationId })
      .andWhere('article.stock <= article.seuilAlerte')
      .orderBy('article.stock', 'ASC')
      .getMany();
  }

  async decrementStock(
    id: string,
    quantite: number,
    organizationId: string,
  ): Promise<Article> {
    const article = await this.findOne(id, organizationId);

    if (article.stock < quantite) {
      throw new BadRequestException(
        `Stock insuffisant pour ${article.nom}. Disponible: ${article.stock}, Demandé: ${quantite}`,
      );
    }

    article.stock -= quantite;
    return this.repository.save(article);
  }

  async incrementStock(
    id: string,
    quantite: number,
    organizationId: string,
  ): Promise<Article> {
    const article = await this.findOne(id, organizationId);
    article.stock += quantite;
    return this.repository.save(article);
  }

  async getStats(organizationId: string): Promise<any> {
    const totalArticles = await this.count(organizationId);

    const articlesEnRupture = await this.repository
      .createQueryBuilder('article')
      .where('article.organizationId = :organizationId', { organizationId })
      .andWhere('article.stock = 0')
      .getCount();

    const valeurResult = await this.repository
      .createQueryBuilder('article')
      .where('article.organizationId = :organizationId', { organizationId })
      .select('SUM(article.stock * article.prixAchat)', 'valeurTotale')
      .getRawOne();

    return {
      total: totalArticles,
      articlesEnRupture,
      valeurTotaleStock: parseFloat(valeurResult?.valeurTotale || '0'),
    };
  }
}
```

---

## 🎯 Quand utiliser BaseTenantService ?

### ✅ Cas d'usage idéaux:
- **Entités simples**: Client, Fournisseur, Categorie, Zone
- **CRUD standard**: Créer, Lire, Mettre à jour, Supprimer
- **Filtrage par organization**: Toutes les opérations nécessitent organizationId

### ⚠️ Quand NE PAS utiliser (ou étendre partiellement):
- **Logique métier complexe**: Ventes avec calculs, validations multiples
- **Relations complexes**: Cascade, transactions
- **Agrégations lourdes**: Statistiques avancées, rapports

**Solution**: Étendre `BaseTenantService` et surcharger/ajouter des méthodes spécifiques.

---

## 📝 Migration d'un service existant

### Avant (sans BaseTenantService):
```typescript
@Injectable()
export class FournisseursService {
  constructor(
    @InjectRepository(Fournisseur)
    private fournisseursRepository: Repository<Fournisseur>,
  ) {}

  async findAll(organizationId: string): Promise<Fournisseur[]> {
    return this.fournisseursRepository.find({
      where: { organizationId },
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Fournisseur> {
    const fournisseur = await this.fournisseursRepository.findOne({
      where: { id, organizationId },
    });

    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur avec l'ID ${id} introuvable`);
    }

    return fournisseur;
  }

  async create(dto: CreateFournisseurDto, organizationId: string): Promise<Fournisseur> {
    const fournisseur = this.fournisseursRepository.create({
      ...dto,
      organizationId,
    });
    return this.fournisseursRepository.save(fournisseur);
  }

  async update(id: string, dto: UpdateFournisseurDto, organizationId: string): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id, organizationId);
    Object.assign(fournisseur, dto);
    return this.fournisseursRepository.save(fournisseur);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const fournisseur = await this.findOne(id, organizationId);
    await this.fournisseursRepository.remove(fournisseur);
  }
}
```

### Après (avec BaseTenantService):
```typescript
@Injectable()
export class FournisseursService extends BaseTenantService<Fournisseur> {
  constructor(
    @InjectRepository(Fournisseur)
    private fournisseursRepository: Repository<Fournisseur>,
  ) {
    super(fournisseursRepository, 'Fournisseur');
  }

  // findAll, findOne, create, update, remove → HÉRITÉS ✅
  // Moins de code, moins de bugs, plus maintenable !
}
```

**Réduction**: ~50 lignes → ~10 lignes

---

## 🔒 Sécurité

### ✅ Garanties de BaseTenantService:
1. **Isolation multi-tenant**: Filtrage automatique par organizationId
2. **Vérification d'appartenance**: update/remove vérifient que l'entité appartient à l'organization
3. **Erreurs claires**: NotFoundException avec nom d'entité
4. **Pas de fuites**: Impossible d'accéder aux données d'une autre organization

### ⚠️ Responsabilité du développeur:
- **Ajouter TenantGuard au controller**: `@UseGuards(JwtAuthGuard, TenantGuard)`
- **Utiliser @CurrentOrganization()**: Récupère organizationId du user
- **Passer organizationId**: Toujours passer à toutes les méthodes

---

## 💡 Bonnes pratiques

1. **Toujours étendre BaseTenantService** pour les entités multi-tenant
2. **Ne pas dupliquer le code**: Utiliser les méthodes héritées
3. **Surcharger si besoin**: Ajouter relations, order, etc.
4. **Ajouter méthodes spécifiques**: Logique métier propre à l'entité
5. **Documenter les méthodes custom**: Clarifier l'usage

---

## 🚀 Résumé

**BaseTenantService** = CRUD standard + sécurité multi-tenant

**Avantages**:
- ✅ Moins de code répétitif
- ✅ Sécurité garantie
- ✅ Maintenabilité améliorée
- ✅ Tests simplifiés

**Usage**:
```typescript
extends BaseTenantService<Entity> { ... }
```

**Dans le controller**:
```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
method(@CurrentOrganization() orgId: string) { ... }
```
