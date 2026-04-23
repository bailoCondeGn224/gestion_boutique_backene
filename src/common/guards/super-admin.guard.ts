import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_SUPER_ADMIN_KEY } from '../decorators/is-super-admin.decorator';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lire la metadata @IsSuperAdmin() sur la route
    const requiresSuperAdmin = this.reflector.getAllAndOverride<boolean>(IS_SUPER_ADMIN_KEY, [
      context.getHandler(),  // Méthode du controller
      context.getClass(),    // Classe du controller
    ]);

    // Si la route ne nécessite pas super admin, laisser passer
    if (!requiresSuperAdmin) {
      return true;
    }

    // Vérifier que l'utilisateur est authentifié et est super admin
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Accès réservé aux super administrateurs');
    }

    return true;
  }
}
