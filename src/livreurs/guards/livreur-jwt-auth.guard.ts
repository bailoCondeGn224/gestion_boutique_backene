import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LivreurJwtAuthGuard extends AuthGuard('livreur-jwt') {}
