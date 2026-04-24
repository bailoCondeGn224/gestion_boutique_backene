import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneFilterDto } from './dto/zone-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard, CurrentOrganization } from '../common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('zones')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('zones.create')
  create(
    @Body() createZoneDto: CreateZoneDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.zonesService.create(createZoneDto, organizationId);
  }

  @Get()
  findAll(
    @Query() filterDto: ZoneFilterDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.zonesService.findAll(organizationId, filterDto);
  }

  @Get('actives')
  findActives(@CurrentOrganization() organizationId: string) {
    return this.zonesService.findActives(organizationId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.zonesService.findOne(id, organizationId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('zones.update')
  update(
    @Param('id') id: string,
    @Body() updateZoneDto: UpdateZoneDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.zonesService.update(id, updateZoneDto, organizationId);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('zones.delete')
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.zonesService.remove(id, organizationId);
  }
}
