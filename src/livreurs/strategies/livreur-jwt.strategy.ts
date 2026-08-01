import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { LivreursService } from '../livreurs.service';

export interface LivreurJwtPayload {
  sub: string;
  telephone: string;
  organizationId: string;
  type: 'livreur';
}

@Injectable()
export class LivreurJwtStrategy extends PassportStrategy(Strategy, 'livreur-jwt') {
  constructor(
    private configService: ConfigService,
    private livreursService: LivreursService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: LivreurJwtPayload) {
    if (payload.type !== 'livreur') {
      throw new UnauthorizedException('Token invalide');
    }

    const livreur = await this.livreursService.findById(payload.sub);
    if (!livreur) {
      throw new UnauthorizedException('Livreur non trouvé ou désactivé');
    }

    return livreur;
  }
}
