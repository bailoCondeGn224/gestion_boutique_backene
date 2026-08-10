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
    return this.onlineOrdersService.getByLivreur(
      livreur.id,
      livreur.organizationId,
    );
  }

  @UseGuards(LivreurJwtAuthGuard)
  @Put('orders/:id/deliver')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer une commande comme livrée' })
  markDelivered(
    @CurrentLivreur() livreur: Livreur,
    @Param('id') orderId: string,
  ) {
    return this.onlineOrdersService.markDeliveredByLivreur(
      livreur.id,
      orderId,
      livreur.organizationId,
    );
  }
}
