# 📚 Guide d'Utilisation des Guards et Permissions

## 🎯 Importer les Guards et Décorateurs

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '../auth/guards';
import { Permissions, Roles } from '../auth/decorators';
```

---

## 1️⃣ **Protection par Permissions**

### Protéger UNE route

```typescript
@Controller('ventes')
export class VentesController {

  // ✅ Nécessite la permission 'ventes.create'
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.create')
  @Post()
  create(@Body() createDto: CreateVenteDto) {
    return this.ventesService.create(createDto);
  }

  // ✅ Nécessite 'ventes.update' OU 'ventes.delete'
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('ventes.update', 'ventes.delete')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateVenteDto) {
    return this.ventesService.update(id, updateDto);
  }
}
```

### Protéger TOUT le controller

```typescript
@Controller('stock')
@UseGuards(JwtAuthGuard, PermissionsGuard) // ✅ Appliqué à toutes les routes
export class StockController {

  @Permissions('stock.read')
  @Get()
  findAll() {
    return this.stockService.findAll();
  }

  @Permissions('stock.create')
  @Post()
  create(@Body() createDto: CreateArticleDto) {
    return this.stockService.create(createDto);
  }

  @Permissions('stock.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
```

---

## 2️⃣ **Protection par Rôles**

### Route accessible seulement à ADMIN

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Delete('users/:id')
deleteUser(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

### Route accessible à ADMIN OU GESTIONNAIRE

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'GESTIONNAIRE')
@Get('stats')
getStats() {
  return this.analyticsService.getStats();
}
```

---

## 3️⃣ **Combiner Rôles ET Permissions**

```typescript
// ✅ Doit être ADMIN ET avoir 'users.delete'
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
@Permissions('users.delete')
@Delete('users/:id')
deleteUser(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

---

## 4️⃣ **Routes Publiques (sans protection)**

```typescript
// ✅ Pas de @UseGuards = route publique
@Get('health')
healthCheck() {
  return { status: 'OK' };
}

// ✅ Seulement authentification, pas de vérification de permissions
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}
```

---

## 5️⃣ **Exemple Complet : VentesController**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { Permissions } from '../auth/decorators';
import { VentesService } from './ventes.service';
import { CreateVenteDto, UpdateVenteDto } from './dto';

@Controller('ventes')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Protection globale
export class VentesController {
  constructor(private readonly ventesService: VentesService) {}

  // Tout le monde authentifié peut lire
  @Permissions('ventes.read')
  @Get()
  findAll() {
    return this.ventesService.findAll();
  }

  // Seuls VENDEUR, GESTIONNAIRE, ADMIN peuvent créer
  @Permissions('ventes.create')
  @Post()
  create(@Body() createDto: CreateVenteDto) {
    return this.ventesService.create(createDto);
  }

  // Seuls GESTIONNAIRE, ADMIN peuvent modifier
  @Permissions('ventes.update')
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateVenteDto) {
    return this.ventesService.update(id, updateDto);
  }

  // Seul ADMIN peut supprimer
  @Permissions('ventes.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ventesService.remove(id);
  }
}
```

---

## 📋 **Liste des Permissions Disponibles**

### Ventes
- `ventes.create` - VENDEUR, GESTIONNAIRE, ADMIN
- `ventes.read` - VENDEUR, GESTIONNAIRE, COMPTABLE, ADMIN
- `ventes.update` - GESTIONNAIRE, ADMIN
- `ventes.delete` - ADMIN

### Stock
- `stock.create` - GESTIONNAIRE_STOCK, GESTIONNAIRE, ADMIN
- `stock.read` - VENDEUR, GESTIONNAIRE_STOCK, GESTIONNAIRE, ADMIN
- `stock.update` - GESTIONNAIRE_STOCK, GESTIONNAIRE, ADMIN
- `stock.delete` - GESTIONNAIRE_STOCK, GESTIONNAIRE, ADMIN

### Approvisionnements
- `approvisionnements.create` - GESTIONNAIRE_STOCK, GESTIONNAIRE, ADMIN
- `approvisionnements.read` - GESTIONNAIRE_STOCK, GESTIONNAIRE, COMPTABLE, ADMIN
- `approvisionnements.update` - GESTIONNAIRE_STOCK, GESTIONNAIRE, ADMIN
- `approvisionnements.delete` - GESTIONNAIRE_STOCK, GESTIONNAIRE, ADMIN

### Finances
- `finances.read` - COMPTABLE, GESTIONNAIRE, ADMIN
- `finances.manage` - COMPTABLE, GESTIONNAIRE, ADMIN

### Users
- `users.create` - ADMIN
- `users.read` - ADMIN
- `users.update` - ADMIN
- `users.delete` - ADMIN

---

## 🔒 **Bonnes Pratiques**

1. **Toujours utiliser JwtAuthGuard en premier**
   ```typescript
   @UseGuards(JwtAuthGuard, PermissionsGuard) // ✅ JWT d'abord
   ```

2. **Préférer les Permissions aux Rôles**
   ```typescript
   @Permissions('ventes.create') // ✅ Plus flexible
   // vs
   @Roles('VENDEUR') // ❌ Moins flexible
   ```

3. **Protéger au niveau Controller quand possible**
   ```typescript
   @Controller('ventes')
   @UseGuards(JwtAuthGuard, PermissionsGuard) // ✅ Toutes les routes protégées
   ```

4. **Routes publiques explicites**
   ```typescript
   // Pas de décorateur = route publique, mais documenter clairement
   // @Public() // Créer ce décorateur custom si besoin
   ```
