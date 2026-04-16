import { SetMetadata } from '@nestjs/common';

/**
 * Clé pour stocker les rôles requis dans les métadonnées
 */
export const ROLES_KEY = 'roles';

/**
 * Décorateur pour définir les rôles requis pour accéder à une route
 *
 * @example
 * ```typescript
 * @Roles('ADMIN')
 * @Delete(':id')
 * remove() { ... }
 *
 * @Roles('ADMIN', 'GESTIONNAIRE')
 * @Get('stats')
 * getStats() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
