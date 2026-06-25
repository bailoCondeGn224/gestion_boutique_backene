import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { IsSuperAdmin } from '../common/decorators/is-super-admin.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ==================== ENDPOINT PUBLIC ====================

  @Post('register')
  @ApiOperation({ summary: 'Inscription d\'une nouvelle organisation (public)' })
  register(@Body() registerDto: RegisterOrganizationDto) {
    return this.organizationsService.register(registerDto);
  }

  // ==================== ENDPOINTS PROTÉGÉS (SuperAdmin) ====================

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Créer une organisation (SuperAdmin)' })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Lister toutes les organisations (SuperAdmin)' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Lister les organisations en attente d\'approbation (SuperAdmin)' })
  findPending() {
    return this.organizationsService.findPending();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Obtenir une organisation par ID (SuperAdmin)' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Obtenir une organisation par slug (SuperAdmin)' })
  findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Modifier une organisation (SuperAdmin)' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Approuver une organisation (SuperAdmin)' })
  approve(@Param('id') id: string) {
    return this.organizationsService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Rejeter une organisation (SuperAdmin)' })
  reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectOrganizationDto,
  ) {
    return this.organizationsService.reject(id, rejectDto);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Suspendre une organisation (SuperAdmin)' })
  suspend(
    @Param('id') id: string,
    @Body() body: { motif: string },
  ) {
    return this.organizationsService.suspend(id, body.motif);
  }

  @Patch(':id/reactivate')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Réactiver une organisation suspendue (SuperAdmin)' })
  reactivate(@Param('id') id: string) {
    return this.organizationsService.reactivate(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @IsSuperAdmin()
  @ApiOperation({ summary: 'Supprimer une organisation (SuperAdmin)' })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
