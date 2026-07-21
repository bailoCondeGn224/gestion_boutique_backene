// src/customer-auth/strategies/customer-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAccount } from '../entities/customer-account.entity';

export interface CustomerJwtPayload {
  sub: string;
  telephone: string;
  type: 'customer';
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(CustomerAccount)
    private customerAccountRepository: Repository<CustomerAccount>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<CustomerAccount> {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Token invalide');
    }

    const customer = await this.customerAccountRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Compte client non trouvé ou désactivé');
    }

    return customer;
  }
}
