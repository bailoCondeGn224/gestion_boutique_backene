import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Livreur } from '../entities/livreur.entity';

export const CurrentLivreur = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Livreur => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
