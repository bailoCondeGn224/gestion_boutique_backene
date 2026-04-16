import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupérer les permissions requises depuis le decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucune permission requise, autoriser l'accès
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête (injecté par JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // Vérifier si l'utilisateur a un rôle
    if (!user.role) {
      throw new ForbiddenException('Aucun rôle assigné à cet utilisateur');
    }

    // Récupérer les permissions de l'utilisateur via son rôle
    const userPermissions = user.role.permissions || [];
    const userPermissionCodes = userPermissions.map(p => p.code);

    // Vérifier si l'utilisateur a toutes les permissions requises
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissionCodes.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Permissions insuffisantes. Requises: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
