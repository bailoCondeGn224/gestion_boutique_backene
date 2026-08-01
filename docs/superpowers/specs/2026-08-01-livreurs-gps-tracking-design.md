# Système de Suivi de Livraison en Temps Réel avec GPS

## Résumé

Système permettant aux boutiques d'enregistrer des livreurs, de leur assigner des commandes, et au client de suivre la position du livreur en temps réel sur une carte.

## Contexte Métier

1. Le backoffice enregistre des livreurs liés à leur boutique (organizationId)
2. Le client commande sur la vitrine avec mode de livraison (LIVRAISON ou RETRAIT_BOUTIQUE)
3. Le backoffice assigne une commande à un livreur (quand statut === PRETE && modeLivraison === LIVRAISON)
4. Le livreur se connecte sur la vitrine, voit ses commandes assignées, navigue vers l'adresse
5. Le client voit la position du livreur en temps réel sur une carte avec son nom et téléphone
6. Le backoffice peut aussi suivre les livreurs

## Contraintes Techniques

- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: React + TypeScript + Shadcn UI
- Architecture multi-tenant (organizationId)
- JWT auth séparé (type: 'livreur' dans le token)
- GPS via Geolocation API navigateur
- Polling toutes les 30s pour les positions
- Carte: Leaflet + OpenStreetMap (gratuit, pas d'API key)

## Flux de Commande

```
EN_ATTENTE → CONFIRMEE → PRETE → EN_LIVRAISON → LIVREE
                           ↓
                    [Dispatch livreur]
                    (si modeLivraison === LIVRAISON)
```

---

# BACKEND

## 1. Entité Livreur

**Fichier:** `src/livreurs/entities/livreur.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('livreur')
export class Livreur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  telephone: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPositionAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## 2. Relation OnlineOrder → Livreur

**Fichier:** `src/online-orders/entities/online-order.entity.ts`

Ajouter:

```typescript
@Column({ type: 'uuid', nullable: true })
livreurId: string;

@ManyToOne(() => Livreur, { nullable: true })
@JoinColumn({ name: 'livreurId' })
livreur: Livreur;
```

## 3. DTOs Livreur

**Fichier:** `src/livreurs/dto/create-livreur.dto.ts`

```typescript
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLivreurDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nom: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
```

**Fichier:** `src/livreurs/dto/update-livreur.dto.ts`

```typescript
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLivreurDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

**Fichier:** `src/livreurs/dto/update-position.dto.ts`

```typescript
import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePositionDto {
  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
```

**Fichier:** `src/livreurs/dto/login-livreur.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginLivreurDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
```

## 4. Service Livreur

**Fichier:** `src/livreurs/livreurs.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Livreur } from './entities/livreur.entity';
import { CreateLivreurDto } from './dto/create-livreur.dto';
import { UpdateLivreurDto } from './dto/update-livreur.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { LoginLivreurDto } from './dto/login-livreur.dto';

@Injectable()
export class LivreursService {
  constructor(
    @InjectRepository(Livreur)
    private livreurRepository: Repository<Livreur>,
    private jwtService: JwtService,
  ) {}

  async create(organizationId: string, dto: CreateLivreurDto): Promise<Livreur> {
    const existing = await this.livreurRepository.findOne({
      where: { telephone: dto.telephone },
    });
    if (existing) {
      throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const livreur = this.livreurRepository.create({
      ...dto,
      organizationId,
      passwordHash,
    });
    return this.livreurRepository.save(livreur);
  }

  async findAll(organizationId: string): Promise<Livreur[]> {
    return this.livreurRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(organizationId: string, id: string): Promise<Livreur> {
    const livreur = await this.livreurRepository.findOne({
      where: { id, organizationId },
    });
    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }
    return livreur;
  }

  async update(organizationId: string, id: string, dto: UpdateLivreurDto): Promise<Livreur> {
    const livreur = await this.findOne(organizationId, id);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
      (livreur as any).passwordHash = dto.password;
      delete dto.password;
    }

    Object.assign(livreur, dto);
    return this.livreurRepository.save(livreur);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const livreur = await this.findOne(organizationId, id);
    await this.livreurRepository.remove(livreur);
  }

  async login(dto: LoginLivreurDto): Promise<{ access_token: string; livreur: Partial<Livreur> }> {
    const livreur = await this.livreurRepository.findOne({
      where: { telephone: dto.telephone, isActive: true },
    });

    if (!livreur) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isValid = await bcrypt.compare(dto.password, livreur.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = {
      sub: livreur.id,
      telephone: livreur.telephone,
      organizationId: livreur.organizationId,
      type: 'livreur',
    };

    return {
      access_token: this.jwtService.sign(payload),
      livreur: {
        id: livreur.id,
        nom: livreur.nom,
        telephone: livreur.telephone,
        organizationId: livreur.organizationId,
      },
    };
  }

  async updatePosition(livreurId: string, dto: UpdatePositionDto): Promise<Livreur> {
    const livreur = await this.livreurRepository.findOne({ where: { id: livreurId } });
    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    livreur.latitude = dto.latitude;
    livreur.longitude = dto.longitude;
    livreur.lastPositionAt = new Date();

    return this.livreurRepository.save(livreur);
  }

  async findById(id: string): Promise<Livreur | null> {
    return this.livreurRepository.findOne({ where: { id, isActive: true } });
  }
}
```

## 5. Controller Livreur (Backoffice)

**Fichier:** `src/livreurs/livreurs.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LivreursService } from './livreurs.service';
import { CreateLivreurDto } from './dto/create-livreur.dto';
import { UpdateLivreurDto } from './dto/update-livreur.dto';

@ApiTags('livreurs')
@Controller('livreurs')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class LivreursController {
  constructor(private readonly livreursService: LivreursService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un livreur' })
  create(@CurrentUser() user: any, @Body() dto: CreateLivreurDto) {
    return this.livreursService.create(user.organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des livreurs' })
  findAll(@CurrentUser() user: any) {
    return this.livreursService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un livreur' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.livreursService.findOne(user.organizationId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un livreur' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLivreurDto,
  ) {
    return this.livreursService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un livreur' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.livreursService.remove(user.organizationId, id);
  }
}
```

## 6. JWT Strategy Livreur

**Fichier:** `src/livreurs/strategies/livreur-jwt.strategy.ts`

```typescript
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
```

## 7. Guard Livreur

**Fichier:** `src/livreurs/guards/livreur-jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LivreurJwtAuthGuard extends AuthGuard('livreur-jwt') {}
```

## 8. Decorator CurrentLivreur

**Fichier:** `src/livreurs/decorators/current-livreur.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Livreur } from '../entities/livreur.entity';

export const CurrentLivreur = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Livreur => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

## 9. Controller Livreur Public (Auth + Commandes)

**Fichier:** `src/livreurs/livreurs-public.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LivreursService } from './livreurs.service';
import { LoginLivreurDto } from './dto/login-livreur.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { LivreurJwtAuthGuard } from './guards/livreur-jwt-auth.guard';
import { CurrentLivreur } from './decorators/current-livreur.decorator';
import { Livreur } from './entities/livreur.entity';
import { OnlineOrdersService } from '../online-orders/online-orders.service';

@ApiTags('public/livreur')
@Controller('public/livreur')
export class LivreursPublicController {
  constructor(
    private readonly livreursService: LivreursService,
    private readonly onlineOrdersService: OnlineOrdersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Connexion livreur' })
  login(@Body() dto: LoginLivreurDto) {
    return this.livreursService.login(dto);
  }

  @UseGuards(LivreurJwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil livreur' })
  getMe(@CurrentLivreur() livreur: Livreur) {
    return {
      id: livreur.id,
      nom: livreur.nom,
      telephone: livreur.telephone,
      organizationId: livreur.organizationId,
    };
  }

  @UseGuards(LivreurJwtAuthGuard)
  @Put('position')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour la position GPS' })
  updatePosition(
    @CurrentLivreur() livreur: Livreur,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.livreursService.updatePosition(livreur.id, dto);
  }

  @UseGuards(LivreurJwtAuthGuard)
  @Get('orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Commandes assignées au livreur' })
  getMyOrders(@CurrentLivreur() livreur: Livreur) {
    return this.onlineOrdersService.getByLivreur(livreur.id);
  }

  @UseGuards(LivreurJwtAuthGuard)
  @Put('orders/:id/deliver')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer une commande comme livrée' })
  markDelivered(
    @CurrentLivreur() livreur: Livreur,
    @Param('id') orderId: string,
  ) {
    return this.onlineOrdersService.markDeliveredByLivreur(livreur.id, orderId);
  }
}
```

## 10. Module Livreur

**Fichier:** `src/livreurs/livreurs.module.ts`

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Livreur } from './entities/livreur.entity';
import { LivreursService } from './livreurs.service';
import { LivreursController } from './livreurs.controller';
import { LivreursPublicController } from './livreurs-public.controller';
import { LivreurJwtStrategy } from './strategies/livreur-jwt.strategy';
import { OnlineOrdersModule } from '../online-orders/online-orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Livreur]),
    PassportModule.register({ defaultStrategy: 'livreur-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => OnlineOrdersModule),
  ],
  controllers: [LivreursController, LivreursPublicController],
  providers: [LivreursService, LivreurJwtStrategy],
  exports: [LivreursService, TypeOrmModule],
})
export class LivreursModule {}
```

## 11. Mise à jour OnlineOrdersService

**Fichier:** `src/online-orders/online-orders.service.ts`

Ajouter les méthodes:

```typescript
async dispatch(organizationId: string, orderId: string, livreurId: string): Promise<OnlineOrder> {
  const order = await this.onlineOrderRepository.findOne({
    where: { id: orderId, organizationId },
  });

  if (!order) {
    throw new NotFoundException('Commande non trouvée');
  }

  if (order.statut !== OnlineOrderStatut.PRETE) {
    throw new BadRequestException('La commande doit être prête pour être dispatchée');
  }

  if (order.modeLivraison !== ModeLivraison.LIVRAISON) {
    throw new BadRequestException('Seules les commandes en livraison peuvent être dispatchées');
  }

  order.livreurId = livreurId;
  order.statut = OnlineOrderStatut.EN_LIVRAISON;
  order.expedieeLe = new Date();

  return this.onlineOrderRepository.save(order);
}

async getByLivreur(livreurId: string): Promise<OnlineOrder[]> {
  return this.onlineOrderRepository.find({
    where: {
      livreurId,
      statut: OnlineOrderStatut.EN_LIVRAISON
    },
    relations: ['items'],
    order: { createdAt: 'DESC' },
  });
}

async markDeliveredByLivreur(livreurId: string, orderId: string): Promise<OnlineOrder> {
  const order = await this.onlineOrderRepository.findOne({
    where: { id: orderId, livreurId },
  });

  if (!order) {
    throw new NotFoundException('Commande non trouvée ou non assignée à ce livreur');
  }

  if (order.statut !== OnlineOrderStatut.EN_LIVRAISON) {
    throw new BadRequestException('La commande doit être en livraison');
  }

  order.statut = OnlineOrderStatut.LIVREE;
  order.livreeLe = new Date();

  return this.onlineOrderRepository.save(order);
}

async getTrackingInfo(orderId: string): Promise<{ latitude: number; longitude: number; livreurNom: string; livreurTelephone: string } | null> {
  const order = await this.onlineOrderRepository.findOne({
    where: { id: orderId, statut: OnlineOrderStatut.EN_LIVRAISON },
    relations: ['livreur'],
  });

  if (!order || !order.livreur || !order.livreur.latitude) {
    return null;
  }

  return {
    latitude: Number(order.livreur.latitude),
    longitude: Number(order.livreur.longitude),
    livreurNom: order.livreur.nom,
    livreurTelephone: order.livreur.telephone,
  };
}
```

## 12. Endpoint Dispatch (Controller Backoffice)

**Fichier:** `src/online-orders/online-orders.controller.ts`

Ajouter:

```typescript
@Put(':id/dispatch/:livreurId')
@ApiOperation({ summary: 'Assigner un livreur à une commande' })
dispatch(
  @CurrentUser() user: any,
  @Param('id') id: string,
  @Param('livreurId') livreurId: string,
) {
  return this.onlineOrdersService.dispatch(user.organizationId, id, livreurId);
}
```

## 13. Endpoint Tracking (Controller Public)

**Fichier:** `src/online-orders/online-orders-public.controller.ts`

Ajouter:

```typescript
@UseGuards(CustomerJwtAuthGuard)
@Get(':id/tracking')
@ApiBearerAuth()
@ApiOperation({ summary: 'Position du livreur pour une commande' })
getTracking(@Param('id') id: string) {
  return this.onlineOrdersService.getTrackingInfo(id);
}
```

## 14. Migration

**Fichier:** `src/migrations/1752400000000-AddLivreurTable.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from 'typeorm';

export class AddLivreurTable1752400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'livreur',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'organizationId', type: 'uuid', isNullable: false },
          { name: 'nom', type: 'varchar', length: '255', isNullable: false },
          { name: 'telephone', type: 'varchar', length: '20', isUnique: true, isNullable: false },
          { name: 'passwordHash', type: 'varchar', length: '255', isNullable: false },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'latitude', type: 'decimal', precision: 10, scale: 7, isNullable: true },
          { name: 'longitude', type: 'decimal', precision: 10, scale: 7, isNullable: true },
          { name: 'lastPositionAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [{ columnNames: ['organizationId'] }],
      }),
      true,
    );

    await queryRunner.addColumn(
      'online_order',
      new TableColumn({ name: 'livreurId', type: 'uuid', isNullable: true }),
    );

    await queryRunner.createForeignKey(
      'online_order',
      new TableForeignKey({
        columnNames: ['livreurId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'livreur',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('online_order');
    const fk = table?.foreignKeys.find(fk => fk.columnNames.indexOf('livreurId') !== -1);
    if (fk) await queryRunner.dropForeignKey('online_order', fk);
    await queryRunner.dropColumn('online_order', 'livreurId');
    await queryRunner.dropTable('livreur');
  }
}
```

---

# FRONTEND

## 15. Types Livreur

**Fichier:** `src/types/livreur.ts`

```typescript
export interface Livreur {
  id: string;
  organizationId: string;
  nom: string;
  telephone: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  lastPositionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLivreurDto {
  nom: string;
  telephone: string;
  password: string;
}

export interface UpdateLivreurDto {
  nom?: string;
  telephone?: string;
  password?: string;
  isActive?: boolean;
}

export interface LivreurLoginDto {
  telephone: string;
  password: string;
}

export interface LivreurAuthResponse {
  access_token: string;
  livreur: {
    id: string;
    nom: string;
    telephone: string;
    organizationId: string;
  };
}

export interface TrackingInfo {
  latitude: number;
  longitude: number;
  livreurNom: string;
  livreurTelephone: string;
}
```

## 16. Hooks Livreur (Backoffice)

**Fichier:** `src/hooks/useLivreurs.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Livreur, CreateLivreurDto, UpdateLivreurDto } from '@/types/livreur';
import { toast } from 'sonner';

export const useLivreurs = () => {
  return useQuery<Livreur[]>({
    queryKey: ['livreurs'],
    queryFn: () => apiClient.get('/livreurs').then(res => res.data),
  });
};

export const useCreateLivreur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLivreurDto) => apiClient.post('/livreurs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livreurs'] });
      toast.success('Livreur créé');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });
};

export const useUpdateLivreur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLivreurDto }) =>
      apiClient.put(`/livreurs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livreurs'] });
      toast.success('Livreur modifié');
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });
};

export const useDeleteLivreur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/livreurs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livreurs'] });
      toast.success('Livreur supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });
};

export const useDispatchOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, livreurId }: { orderId: string; livreurId: string }) =>
      apiClient.put(`/online-orders/${orderId}/dispatch/${livreurId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] });
      toast.success('Commande assignée au livreur');
    },
    onError: () => toast.error('Erreur lors de l\'assignation'),
  });
};
```

## 17. LivreurMobileCard (Backoffice)

**Fichier:** `src/components/LivreurMobileCard.tsx`

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Livreur } from "@/types/livreur";
import { User, Phone, MapPin, MoreVertical, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";

interface LivreurMobileCardProps {
  livreur: Livreur;
  onEdit: (livreur: Livreur) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const LivreurMobileCard = ({
  livreur,
  onEdit,
  onDelete,
  isDeleting = false,
}: LivreurMobileCardProps) => {
  const hasPosition = livreur.latitude && livreur.longitude;

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{livreur.nom}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{livreur.telephone}</p>
              </div>
            </div>
          </div>
          <div className={`px-2.5 py-1.5 rounded-full border ${livreur.isActive ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'}`}>
            <div className="flex items-center gap-1.5">
              {livreur.isActive ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-700" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-700" />
              )}
              <p className={`text-xs font-bold ${livreur.isActive ? 'text-green-700' : 'text-red-700'}`}>
                {livreur.isActive ? 'Actif' : 'Inactif'}
              </p>
            </div>
          </div>
        </div>

        {hasPosition && (
          <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>Position mise à jour</span>
          </div>
        )}

        <div className="p-3 border-t border-border/50 bg-muted/20">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="default"
                size="lg"
                className="w-full h-11 text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <MoreVertical className="w-4 h-4 mr-2" />
                Actions
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[85vh]">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left text-lg">{livreur.nom}</SheetTitle>
                <p className="text-sm text-muted-foreground text-left">{livreur.telephone}</p>
              </SheetHeader>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 justify-start text-left text-base"
                  onClick={() => onEdit(livreur)}
                >
                  <Pencil className="w-5 h-5 mr-3" />
                  Modifier
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 justify-start text-left text-base text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => onDelete(livreur.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-5 h-5 mr-3" />
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
};

export default LivreurMobileCard;
```

## 18. Page Livreurs (Backoffice)

**Fichier:** `src/pages/Livreurs.tsx`

```typescript
import { useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useLivreurs, useCreateLivreur, useUpdateLivreur, useDeleteLivreur } from '@/hooks/useLivreurs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Livreur, CreateLivreurDto, UpdateLivreurDto } from '@/types/livreur';
import LivreurMobileCard from '@/components/LivreurMobileCard';

const Livreurs = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data: livreurs = [], isLoading } = useLivreurs();
  const createLivreur = useCreateLivreur();
  const updateLivreur = useUpdateLivreur();
  const deleteLivreur = useDeleteLivreur();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLivreur, setEditingLivreur] = useState<Livreur | null>(null);
  const [formData, setFormData] = useState<CreateLivreurDto>({
    nom: '',
    telephone: '',
    password: '',
  });
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setFormData({ nom: '', telephone: '', password: '' });
    setIsActive(true);
    setEditingLivreur(null);
  };

  const handleOpenDialog = (livreur?: Livreur) => {
    if (livreur) {
      setEditingLivreur(livreur);
      setFormData({ nom: livreur.nom, telephone: livreur.telephone, password: '' });
      setIsActive(livreur.isActive);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingLivreur) {
      const updateData: UpdateLivreurDto = {
        nom: formData.nom,
        telephone: formData.telephone,
        isActive,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      await updateLivreur.mutateAsync({ id: editingLivreur.id, data: updateData });
    } else {
      await createLivreur.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce livreur ?')) {
      await deleteLivreur.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Livreurs</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {livreurs.map((livreur) => (
            <LivreurMobileCard
              key={livreur.id}
              livreur={livreur}
              onEdit={handleOpenDialog}
              onDelete={handleDelete}
              isDeleting={deleteLivreur.isPending}
            />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {livreurs.map((livreur) => (
              <TableRow key={livreur.id}>
                <TableCell className="font-medium">{livreur.nom}</TableCell>
                <TableCell>{livreur.telephone}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${livreur.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {livreur.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(livreur)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(livreur.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLivreur ? 'Modifier le livreur' : 'Nouveau livreur'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">
                Mot de passe {editingLivreur && '(laisser vide pour ne pas changer)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            {editingLivreur && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Actif</Label>
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={createLivreur.isPending || updateLivreur.isPending}
            >
              {(createLivreur.isPending || updateLivreur.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingLivreur ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Livreurs;
```

## 19. DispatchDialog (Backoffice)

**Fichier:** `src/components/DispatchDialog.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLivreurs, useDispatchOrder } from '@/hooks/useLivreurs';
import { Loader2, User, Phone, CheckCircle } from 'lucide-react';
import { OnlineOrder } from '@/types';

interface DispatchDialogProps {
  order: OnlineOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DispatchDialog = ({ order, open, onOpenChange }: DispatchDialogProps) => {
  const { data: livreurs = [], isLoading } = useLivreurs();
  const dispatch = useDispatchOrder();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeLivreurs = livreurs.filter(l => l.isActive);

  const handleDispatch = async () => {
    if (!order || !selectedId) return;
    await dispatch.mutateAsync({ orderId: order.id, livreurId: selectedId });
    onOpenChange(false);
    setSelectedId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assigner un livreur</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : activeLivreurs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun livreur actif disponible
          </p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {activeLivreurs.map((livreur) => (
              <button
                key={livreur.id}
                onClick={() => setSelectedId(livreur.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  selectedId === livreur.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{livreur.nom}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {livreur.telephone}
                  </div>
                </div>
                {selectedId === livreur.id && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          disabled={!selectedId || dispatch.isPending}
          onClick={handleDispatch}
        >
          {dispatch.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Assigner
        </Button>
      </DialogContent>
    </Dialog>
  );
};
```

## 20. Mise à jour OnlineOrderMobileCard (Bouton Dispatcher)

**Fichier:** `src/components/OnlineOrderMobileCard.tsx`

Ajouter dans les actions (après "Marquer prête", quand statut === PRETE && modeLivraison === LIVRAISON):

```typescript
{order.statut === OnlineOrderStatut.PRETE && order.modeLivraison === ModeLivraison.LIVRAISON && (
  <Button
    variant="default"
    size="lg"
    className="w-full h-14 justify-start text-left text-base"
    onClick={() => onDispatch(order.id)}
  >
    <Truck className="w-5 h-5 mr-3" />
    Dispatcher à un livreur
  </Button>
)}
```

Props à ajouter: `onDispatch: (id: string) => void;`

---

# VITRINE LIVREUR

## 21. Context LivreurAuth

**Fichier:** `src/contexts/LivreurAuthContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { LivreurLoginDto, LivreurAuthResponse } from '@/types/livreur';

interface LivreurAuthContextType {
  livreur: LivreurAuthResponse['livreur'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LivreurLoginDto) => Promise<void>;
  logout: () => void;
}

const LivreurAuthContext = createContext<LivreurAuthContextType | null>(null);

const STORAGE_KEY = 'livreur_token';
const LIVREUR_KEY = 'livreur_data';

export const LivreurAuthProvider = ({ children }: { children: ReactNode }) => {
  const [livreur, setLivreur] = useState<LivreurAuthResponse['livreur'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    const savedLivreur = localStorage.getItem(LIVREUR_KEY);
    if (token && savedLivreur) {
      setLivreur(JSON.parse(savedLivreur));
    }
    setIsLoading(false);
  }, []);

  const login = async (dto: LivreurLoginDto) => {
    const res = await apiClient.post<LivreurAuthResponse>('/public/livreur/login', dto);
    localStorage.setItem(STORAGE_KEY, res.data.access_token);
    localStorage.setItem(LIVREUR_KEY, JSON.stringify(res.data.livreur));
    setLivreur(res.data.livreur);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LIVREUR_KEY);
    setLivreur(null);
  };

  return (
    <LivreurAuthContext.Provider
      value={{
        livreur,
        isAuthenticated: !!livreur,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </LivreurAuthContext.Provider>
  );
};

export const useLivreurAuth = () => {
  const ctx = useContext(LivreurAuthContext);
  if (!ctx) throw new Error('useLivreurAuth must be used within LivreurAuthProvider');
  return ctx;
};
```

## 22. API Client Livreur

**Fichier:** `src/lib/livreur-api-client.ts`

```typescript
import axios from 'axios';

const STORAGE_KEY = 'livreur_token';

export const livreurApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

livreurApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 23. Hooks Livreur (Vitrine)

**Fichier:** `src/hooks/useLivreurOrders.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { livreurApiClient } from '@/lib/livreur-api-client';
import { OnlineOrder } from '@/types';
import { toast } from 'sonner';

export const useLivreurOrders = () => {
  return useQuery<OnlineOrder[]>({
    queryKey: ['livreur-orders'],
    queryFn: () => livreurApiClient.get('/public/livreur/orders').then(res => res.data),
    refetchInterval: 30000,
  });
};

export const useMarkDelivered = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      livreurApiClient.put(`/public/livreur/orders/${orderId}/deliver`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livreur-orders'] });
      toast.success('Commande livrée');
    },
    onError: () => toast.error('Erreur'),
  });
};

export const useUpdateLivreurPosition = () => {
  return useMutation({
    mutationFn: (position: { latitude: number; longitude: number }) =>
      livreurApiClient.put('/public/livreur/position', position),
  });
};
```

## 24. Page Login Livreur

**Fichier:** `src/pages/storefront/LivreurLogin.tsx`

```typescript
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLivreurAuth } from '@/contexts/LivreurAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Truck } from 'lucide-react';
import { toast } from 'sonner';

const LivreurLogin = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { login } = useLivreurAuth();
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ telephone, password });
      navigate(`/b/${slug}/livreur/dashboard`);
    } catch {
      toast.error('Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Espace Livreur</h1>
          <p className="text-muted-foreground mt-2">Connectez-vous pour voir vos livraisons</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="telephone">Téléphone</Label>
            <Input
              id="telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <Button type="submit" className="w-full h-12" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LivreurLogin;
```

## 25. Page Dashboard Livreur

**Fichier:** `src/pages/storefront/LivreurDashboard.tsx`

```typescript
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLivreurAuth } from '@/contexts/LivreurAuthContext';
import { useLivreurOrders, useMarkDelivered, useUpdateLivreurPosition } from '@/hooks/useLivreurOrders';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, Phone, Package, Navigation, CheckCircle, LogOut } from 'lucide-react';

const formatPrix = (prix: number) => {
  return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(prix) + ' GNF';
};

const LivreurDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { livreur, isAuthenticated, logout } = useLivreurAuth();
  const { data: orders = [], isLoading } = useLivreurOrders();
  const markDelivered = useMarkDelivered();
  const updatePosition = useUpdateLivreurPosition();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/b/${slug}/livreur`);
    }
  }, [isAuthenticated, navigate, slug]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        updatePosition.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleNavigate = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const handleLogout = () => {
    logout();
    navigate(`/b/${slug}/livreur`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="font-bold">{livreur?.nom}</p>
          <p className="text-xs text-muted-foreground">{orders.length} livraison(s) en cours</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune livraison en cours</p>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{order.numero}</p>
                  <p className="text-lg font-bold text-primary">{formatPrix(order.total)}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{order.clientNom || 'Client'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${order.telephoneLivraison}`} className="text-primary">
                      {order.telephoneLivraison}
                    </a>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{order.adresseLivraison}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => handleNavigate(order.adresseLivraison || '')}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Naviguer
                  </Button>
                  <Button
                    className="h-12"
                    onClick={() => markDelivered.mutate(order.id)}
                    disabled={markDelivered.isPending}
                  >
                    {markDelivered.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Livrée
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LivreurDashboard;
```

---

# SUIVI CLIENT

## 26. Hook Tracking

**Fichier:** `src/hooks/useOrderTracking.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TrackingInfo } from '@/types/livreur';

export const useOrderTracking = (orderId: string) => {
  return useQuery<TrackingInfo | null>({
    queryKey: ['order-tracking', orderId],
    queryFn: () => apiClient.get(`/public/orders/${orderId}/tracking`).then(res => res.data),
    refetchInterval: 30000,
    enabled: !!orderId,
  });
};
```

## 27. Composant TrackingMap

**Fichier:** `src/components/storefront/TrackingMap.tsx`

```typescript
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrackingInfo } from '@/types/livreur';
import { Phone, User } from 'lucide-react';

interface TrackingMapProps {
  tracking: TrackingInfo;
}

export const TrackingMap = ({ tracking }: TrackingMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView(
      [tracking.latitude, tracking.longitude],
      15
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(mapInstanceRef.current);

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    markerRef.current = L.marker([tracking.latitude, tracking.longitude], { icon })
      .addTo(mapInstanceRef.current);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([tracking.latitude, tracking.longitude]);
      mapInstanceRef.current.panTo([tracking.latitude, tracking.longitude]);
    }
  }, [tracking.latitude, tracking.longitude]);

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900">{tracking.livreurNom}</p>
            <a
              href={`tel:${tracking.livreurTelephone}`}
              className="flex items-center gap-1 text-sm text-blue-700"
            >
              <Phone className="w-3 h-3" />
              {tracking.livreurTelephone}
            </a>
          </div>
        </div>
      </div>
      <div ref={mapRef} className="h-64 rounded-lg overflow-hidden border" />
    </div>
  );
};
```

## 28. Mise à jour StorefrontOrderDetail

**Fichier:** `src/pages/storefront/StorefrontOrderDetail.tsx`

Ajouter après le bloc "Info livraison en cours":

```typescript
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { TrackingMap } from '@/components/storefront/TrackingMap';

const { data: tracking } = useOrderTracking(id || '');

{isEnLivraison && tracking && (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <h2 className="font-semibold text-base mb-3">Position du livreur</h2>
    <TrackingMap tracking={tracking} />
  </div>
)}
```

---

# ROUTES

## 29. Routes Livreur

**Fichier:** `src/App.tsx`

Ajouter:

```typescript
import LivreurLogin from '@/pages/storefront/LivreurLogin';
import LivreurDashboard from '@/pages/storefront/LivreurDashboard';
import { LivreurAuthProvider } from '@/contexts/LivreurAuthContext';

<Route path="/b/:slug/livreur" element={<LivreurAuthProvider><LivreurLogin /></LivreurAuthProvider>} />
<Route path="/b/:slug/livreur/dashboard" element={<LivreurAuthProvider><LivreurDashboard /></LivreurAuthProvider>} />
```

**Fichier:** `src/routes/backoffice.tsx`

Ajouter:

```typescript
import Livreurs from '@/pages/Livreurs';

{ path: 'livreurs', element: <Livreurs /> }
```

## 30. Menu Sidebar

**Fichier:** `src/components/AppSidebar.tsx`

Ajouter dans les items de menu:

```typescript
{
  title: 'Livreurs',
  url: '/livreurs',
  icon: Truck,
}
```

---

# DÉPENDANCES

## 31. Installation Leaflet

```bash
npm install leaflet
npm install -D @types/leaflet
```

---

# RÉSUMÉ DES FICHIERS

## Backend (14 fichiers)

1. `src/livreurs/entities/livreur.entity.ts`
2. `src/livreurs/dto/create-livreur.dto.ts`
3. `src/livreurs/dto/update-livreur.dto.ts`
4. `src/livreurs/dto/update-position.dto.ts`
5. `src/livreurs/dto/login-livreur.dto.ts`
6. `src/livreurs/livreurs.service.ts`
7. `src/livreurs/livreurs.controller.ts`
8. `src/livreurs/livreurs-public.controller.ts`
9. `src/livreurs/livreurs.module.ts`
10. `src/livreurs/strategies/livreur-jwt.strategy.ts`
11. `src/livreurs/guards/livreur-jwt-auth.guard.ts`
12. `src/livreurs/decorators/current-livreur.decorator.ts`
13. `src/migrations/1752400000000-AddLivreurTable.ts`
14. Modifications: `online-order.entity.ts`, `online-orders.service.ts`, `online-orders.controller.ts`, `online-orders-public.controller.ts`, `app.module.ts`

## Frontend (16 fichiers)

1. `src/types/livreur.ts`
2. `src/hooks/useLivreurs.ts`
3. `src/hooks/useLivreurOrders.ts`
4. `src/hooks/useOrderTracking.ts`
5. `src/lib/livreur-api-client.ts`
6. `src/contexts/LivreurAuthContext.tsx`
7. `src/components/LivreurMobileCard.tsx`
8. `src/components/DispatchDialog.tsx`
9. `src/components/storefront/TrackingMap.tsx`
10. `src/pages/Livreurs.tsx`
11. `src/pages/storefront/LivreurLogin.tsx`
12. `src/pages/storefront/LivreurDashboard.tsx`
13. Modifications: `OnlineOrderMobileCard.tsx`, `StorefrontOrderDetail.tsx`, `AppSidebar.tsx`, `App.tsx`, routes
