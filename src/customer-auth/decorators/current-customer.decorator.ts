// src/customer-auth/decorators/current-customer.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerAccount } from '../entities/customer-account.entity';

export const CurrentCustomer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CustomerAccount => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
