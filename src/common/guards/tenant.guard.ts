import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * TenantGuard - Vérifie que l'utilisateur appartient à une organisation
 *
 * - Bloque les utilisateurs sans organization (sauf SUPER_ADMIN)
 * - Permet aux SUPER_ADMIN d'accéder à toutes les ressources
 * - Garantit l'isolation des données par organisation
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantGuard)
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // SUPER_ADMIN peut accéder à tout
    if (user.isSuperAdmin) {
      return true;
    }

    // Les utilisateurs normaux doivent avoir une organization
    if (!user.organizationId) {
      throw new ForbiddenException('Utilisateur sans organisation');
    }

    // Ajouter organizationId dans la requête pour les services
    request.organizationId = user.organizationId;

    return true;
  }
}
