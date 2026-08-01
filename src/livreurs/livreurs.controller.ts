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
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @ApiOperation({ summary: "Détail d'un livreur" })
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
