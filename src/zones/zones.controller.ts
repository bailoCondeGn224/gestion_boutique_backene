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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('zones')
@UseGuards(JwtAuthGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('zones.create')
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @Get()
  findAll(@Query() filterDto: ZoneFilterDto) {
    return this.zonesService.findAll(filterDto);
  }

  @Get('actives')
  findActives() {
    return this.zonesService.findActives();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('zones.update')
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('zones.delete')
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}
