# Guide Multi-Tenant - Gestion Boutique

## 📋 Architecture

### Entités principales:
- **Organization** - L'organisation (entreprise/boutique)
- **Plan** - Plan d'abonnement (FREE, STARTER, PRO, ENTERPRISE)
- **User** - Utilisateur (lié à une organization, sauf SUPER_ADMIN)
- **BaseTenantEntity** - Classe abstraite pour toutes les entités métier

### Hiérarchie:
```
Organization (Walli Industrie)
  ├── Plan (PROFESSIONAL)
  ├── Users (admin@walli.com, vendeur@walli.com)
  ├── Articles (Abaya Rouge, Foulard Noir)
  ├── Clients (Aicha Diallo, Mamadou Barry)
  └── Ventes, Approvisionnements, etc.

SUPER_ADMIN (admin@system.com)
  └── Accès à TOUTES les organizations
```

---

## 🔐 Authentification et Guards

### 1. **JwtAuthGuard** - Authentification de base
```typescript
@Controller('articles')
@UseGuards(JwtAuthGuard)  // ⬅️ Vérifie le token JWT
export class ArticlesController {
  @Get()
  findAll(@CurrentUser() user: User) {
    // user contient: id, email, organizationId, isSuperAdmin, etc.
  }
}
```

### 2. **TenantGuard** - Isolation multi-tenant
```typescript
@Controller('articles')
@UseGuards(JwtAuthGuard, TenantGuard)  // ⬅️ Vérifie organization
export class ArticlesController {
  @Get()
  findAll(@CurrentOrganization() orgId: string) {
    // orgId = organization de l'utilisateur
    // SUPER_ADMIN bypass ce guard
  }
}
```

### 3. **SuperAdminGuard** - Routes super admin
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {

  @Get('all-organizations')
  getAllOrgs() {
    // Accessible à tous les admins
  }

  @Delete('organization/:id')
  @IsSuperAdmin()  // ⬅️ SEULEMENT super admin
  deleteOrg(@Param('id') id: string) {
    // Très sensible - super admin uniquement
  }
}
```

---

## 🎯 Decorators utiles

### @CurrentUser() - Récupère l'utilisateur
```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return {
    id: user.id,
    email: user.email,
    organization: user.organization,
    isSuperAdmin: user.isSuperAdmin,
  };
}
```

### @CurrentOrganization() - Récupère organizationId
```typescript
@Get('articles')
getArticles(@CurrentOrganization() orgId: string) {
  // Filtre automatique par organization
  return this.articlesService.findAll(orgId);
}
```

### @IsSuperAdmin() - Marque une route super admin
```typescript
@Delete(':id')
@IsSuperAdmin()  // ⬅️ Nécessite isSuperAdmin = true
@UseGuards(JwtAuthGuard, SuperAdminGuard)
deleteAnything(@Param('id') id: string) {
  // Action dangereuse - super admin uniquement
}
```

---

## 📊 Service Pattern - BaseTenantService

### Exemple: ArticlesService
```typescript
@Injectable()
export class ArticlesService {

  // ✅ BONNE PRATIQUE: Toujours filtrer par organizationId
  async findAll(organizationId: string): Promise<Article[]> {
    return this.articlesRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ Vérifier l'appartenance avant modification
  async update(id: string, updateDto: UpdateArticleDto, organizationId: string) {
    const article = await this.articlesRepository.findOne({
      where: { id, organizationId },  // ⬅️ Double vérification
    });

    if (!article) {
      throw new NotFoundException('Article introuvable');
    }

    Object.assign(article, updateDto);
    return this.articlesRepository.save(article);
  }
}
```

### Controller correspondant:
```typescript
@Controller('articles')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ArticlesController {

  @Get()
  findAll(@CurrentOrganization() orgId: string) {
    return this.articlesService.findAll(orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateArticleDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.articlesService.update(id, updateDto, orgId);
  }
}
```

---

## 🚀 Cas d'usage

### 1. **User normal (Vendeur chez Walli Industrie)**
```typescript
// JWT payload:
{
  sub: "user-uuid",
  email: "vendeur@walli.com",
  organizationId: "walli-org-uuid",
  isSuperAdmin: false
}

// Accès:
✅ Articles de Walli Industrie
✅ Ventes de Walli Industrie
❌ Articles d'autres boutiques
❌ Routes @IsSuperAdmin()
```

### 2. **SUPER_ADMIN (admin@system.com)**
```typescript
// JWT payload:
{
  sub: "super-admin-uuid",
  email: "admin@system.com",
  organizationId: null,
  isSuperAdmin: true
}

// Accès:
✅ Toutes les organizations
✅ Toutes les données
✅ Routes @IsSuperAdmin()
✅ Bypass TenantGuard
```

---

## ⚠️ Règles de sécurité

### ❌ MAUVAISES PRATIQUES:
```typescript
// NE JAMAIS faire ça - pas de filtre organization
async findAll(): Promise<Article[]> {
  return this.articlesRepository.find();  // ❌ Fuite de données
}

// NE JAMAIS faire ça - pas de vérification
async delete(id: string) {
  return this.articlesRepository.delete(id);  // ❌ Peut supprimer d'autres orgs
}
```

### ✅ BONNES PRATIQUES:
```typescript
// Toujours filtrer par organizationId
async findAll(organizationId: string): Promise<Article[]> {
  return this.articlesRepository.find({
    where: { organizationId },
  });
}

// Toujours vérifier l'appartenance
async delete(id: string, organizationId: string) {
  const article = await this.articlesRepository.findOne({
    where: { id, organizationId },
  });

  if (!article) {
    throw new NotFoundException();
  }

  return this.articlesRepository.remove(article);
}
```

---

## 🔧 Configuration

### 1. Créer une organization:
```bash
POST /organizations
{
  "nom": "Ma Boutique",
  "slug": "ma-boutique",
  "email": "contact@ma-boutique.com",
  "planId": "<uuid-plan-starter>"
}
```

### 2. Créer un utilisateur:
```bash
POST /users
{
  "email": "admin@ma-boutique.com",
  "password": "motdepasse123",
  "nom": "Admin Boutique",
  "organizationId": "<uuid-organization>",
  "roleId": "<uuid-role-admin>"
}
```

### 3. Login:
```bash
POST /auth/login
{
  "email": "admin@ma-boutique.com",
  "password": "motdepasse123"
}

Response:
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "admin@ma-boutique.com",
    "organization": { "nom": "Ma Boutique", ... },
    "isSuperAdmin": false
  }
}
```

---

## 📝 Checklist Migration Service

Quand vous migrez un service existant vers multi-tenant:

- [ ] Ajouter `organizationId: string` à TOUTES les méthodes de lecture
- [ ] Ajouter filtre `where: { organizationId }` dans tous les find()
- [ ] Vérifier organizationId avant update/delete
- [ ] Ajouter `@CurrentOrganization()` dans le controller
- [ ] Ajouter `TenantGuard` au controller
- [ ] Tester l'isolation (user A ne peut pas voir données de org B)
- [ ] Tester SUPER_ADMIN (peut voir toutes les orgs)

---

## 🎓 Résumé

**Multi-tenant = Isolation des données par organization**

1. Chaque entité métier a `organizationId`
2. Chaque user appartient à UNE organization (sauf SUPER_ADMIN)
3. Les services filtrent TOUJOURS par organizationId
4. Les controllers utilisent `@CurrentOrganization()`
5. SUPER_ADMIN bypass les restrictions

**Guards essentiels:**
- `JwtAuthGuard` → Authentification
- `TenantGuard` → Isolation multi-tenant
- `SuperAdminGuard` → Routes sensibles

**Decorators utiles:**
- `@CurrentUser()` → Utilisateur actuel
- `@CurrentOrganization()` → Organization de l'user
- `@IsSuperAdmin()` → Marque route super admin
