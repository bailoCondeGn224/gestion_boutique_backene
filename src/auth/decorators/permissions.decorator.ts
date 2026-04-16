import { SetMetadata } from '@nestjs/common';

/**
 * Clé pour stocker les permissions requises dans les métadonnées
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Décorateur pour définir les permissions requises pour accéder à une route
 *
 * @example
 * ```typescript
 * @Permissions('ventes.create')
 * @Post()
 * createVente() { ... }
 *
 * @Permissions('ventes.create', 'ventes.update')
 * @Put(':id')
 * updateVente() { ... }
 * ```
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
