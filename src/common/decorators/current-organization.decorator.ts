import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Decorator pour récupérer l'organizationId de l'utilisateur authentifié
 * Usage: @CurrentOrganization() organizationId: string
 *
 * Note: Lance une exception si l'utilisateur n'a pas d'organization (SUPER_ADMIN)
 */
export const CurrentOrganization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    if (!user.organizationId) {
      throw new BadRequestException('Utilisateur sans organisation (SUPER_ADMIN)');
    }

    return user.organizationId;
  },
);
