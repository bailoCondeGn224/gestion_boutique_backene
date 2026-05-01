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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { IsSuperAdmin } from '../common/decorators/is-super-admin.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @IsSuperAdmin()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @IsSuperAdmin()
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @IsSuperAdmin()
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Get('slug/:slug')
  @IsSuperAdmin()
  findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  @Patch(':id')
  @IsSuperAdmin()
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @IsSuperAdmin()
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
