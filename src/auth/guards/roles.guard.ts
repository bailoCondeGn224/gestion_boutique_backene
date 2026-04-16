import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard pour vérifier si l'utilisateur a un des rôles requis
 *
 * Utilisation:
 * 1. Ajouter @UseGuards(JwtAuthGuard, RolesGuard) au controller ou à la route
 * 2. Ajouter @Roles('ADMIN', 'GESTIONNAIRE') à la route
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupérer les rôles requis depuis les métadonnées
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucun rôle n'est requis, autoriser l'accès
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si pas d'utilisateur (normalement déjà géré par JwtAuthGuard)
    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // Si pas de rôle
    if (!user.role) {
      throw new ForbiddenException('Aucun rôle assigné à cet utilisateur');
    }

    // Vérifier si l'utilisateur a un des rôles requis
    const hasRole = requiredRoles.includes(user.role.nom);

    if (!hasRole) {
      throw new ForbiddenException(
        `Rôle insuffisant. Rôles autorisés: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
