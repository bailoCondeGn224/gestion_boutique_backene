// src/storefront/storefront.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { StorefrontService } from './storefront.service';
import { UpdateStorefrontDto } from './dto';

@ApiTags('storefront')
@Controller('storefront')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la configuration de ma vitrine' })
  getMyStorefront(@CurrentOrganization() organizationId: string) {
    return this.storefrontService.getOrCreateByOrganization(organizationId);
  }

  @Put()
  @ApiOperation({ summary: 'Modifier la configuration de ma vitrine' })
  updateStorefront(
    @CurrentOrganization() organizationId: string,
    @Body() dto: UpdateStorefrontDto,
  ) {
    return this.storefrontService.update(organizationId, dto);
  }

  @Post('logo')
  @ApiOperation({ summary: 'Uploader le logo de la vitrine' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @CurrentOrganization() organizationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: Implémenter l'upload vers le stockage (utiliser le service existant)
    const logoUrl = `/uploads/storefronts/${organizationId}/${file.originalname}`;
    return this.storefrontService.updateLogo(organizationId, logoUrl);
  }

  @Get('qrcode')
  @ApiOperation({ summary: 'Générer le QR code de ma vitrine' })
  async getQrCode(
    @CurrentOrganization() organizationId: string,
    @Res() res: Response,
  ) {
    const qrCodeBuffer = await this.storefrontService.generateQrCode(organizationId);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename=qrcode-boutique.png');
    res.send(qrCodeBuffer);
  }
}
