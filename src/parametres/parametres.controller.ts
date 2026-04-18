import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { ParametresService } from './parametres.service';
import { CreateParametreDto } from './dto/create-parametre.dto';
import { UpdateParametreDto } from './dto/update-parametre.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { multerConfig } from './config/multer.config';

@ApiTags('Parametres')
@Controller('parametres')
export class ParametresController {
  constructor(private readonly parametresService: ParametresService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer les paramètres de l\'entreprise' })
  @ApiResponse({ status: 200, description: 'Paramètres récupérés avec succès' })
  async getParametres() {
    return this.parametresService.getParametres();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parametres.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer ou mettre à jour les paramètres (Admin uniquement)' })
  @ApiResponse({ status: 201, description: 'Paramètres créés/mis à jour avec succès' })
  async createOrUpdate(@Body() createParametreDto: CreateParametreDto) {
    return this.parametresService.createOrUpdate(createParametreDto);
  }

  @Put()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parametres.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour les paramètres existants' })
  @ApiResponse({ status: 200, description: 'Paramètres mis à jour avec succès' })
  async update(@Body() updateParametreDto: UpdateParametreDto) {
    return this.parametresService.update(updateParametreDto);
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parametres.update')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('logo', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Fichier image du logo (jpg, jpeg, png, gif, webp, svg) - Max 5MB',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Uploader le logo de l\'entreprise' })
  @ApiResponse({ status: 200, description: 'Logo uploadé avec succès' })
  @ApiResponse({ status: 400, description: 'Format de fichier invalide ou fichier trop volumineux' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    return this.parametresService.updateLogo(file.filename);
  }

  @Get('logo')
  @ApiOperation({ summary: 'Récupérer le logo de l\'entreprise' })
  @ApiResponse({ status: 200, description: 'Logo récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Logo non trouvé' })
  async getLogo(@Res() res: Response) {
    const logoFilename = await this.parametresService.getLogoPath();

    if (!logoFilename) {
      return res.status(404).json({ message: 'Logo non configuré' });
    }

    // Créer le chemin absolu vers le fichier logo
    const absolutePath = join(process.cwd(), 'uploads', 'logos', logoFilename);

    // Vérifier si le fichier existe
    if (!existsSync(absolutePath)) {
      return res.status(404).json({
        message: 'Fichier logo introuvable',
        path: logoFilename
      });
    }

    return res.sendFile(absolutePath);
  }
}
