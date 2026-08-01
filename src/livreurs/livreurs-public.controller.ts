import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LivreursService } from './livreurs.service';
import { LoginLivreurDto } from './dto/login-livreur.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { LivreurJwtAuthGuard } from './guards/livreur-jwt-auth.guard';
import { CurrentLivreur } from './decorators/current-livreur.decorator';
import { Livreur } from './entities/livreur.entity';

@ApiTags('public/livreur')
@Controller('public/livreur')
export class LivreursPublicController {
  constructor(private readonly livreursService: LivreursService) {}

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
}
