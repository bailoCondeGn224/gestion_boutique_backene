import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkImportService } from './bulk-import.service';
import { ImportResultDto } from './dto/import-article.dto';
import * as ExcelJS from 'exceljs';

@ApiTags('Imports Massifs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bulk-import')
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Post('articles')
  @ApiOperation({ summary: 'Importer des articles en masse depuis Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB pour les ZIP avec photos
    },
  }))
  async importArticles(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Vérifier l'extension (Excel ou ZIP)
    const validExtensions = ['.xlsx', '.xls', '.zip'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      throw new BadRequestException('Format de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou ZIP');
    }

    // Vérifier la taille (max 50MB pour ZIP, 10MB pour Excel)
    const maxSize = fileExtension === '.zip' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`Fichier trop volumineux. Taille maximale: ${maxSize / (1024 * 1024)}MB`);
    }

    return this.bulkImportService.importFromExcel(
      file,
      req.user.organizationId,
      req.user.userId,
      req.user.nom || 'Utilisateur',
    );
  }

  @Get('template/articles')
  @ApiOperation({ summary: 'Télécharger le template Excel pour import d\'articles' })
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Articles');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'Code Article', key: 'codeArticle', width: 15 },
      { header: 'Nom', key: 'nom', width: 30 },
      { header: 'Catégorie', key: 'categorie', width: 20 },
      { header: 'Zone', key: 'zone', width: 10 },
      { header: 'Prix Vente (GNF)', key: 'prixVente', width: 15 },
      { header: 'Prix Achat (GNF)', key: 'prixAchat', width: 15 },
      { header: 'Seuil Alerte', key: 'seuilAlerte', width: 12 },
      { header: 'Quantité', key: 'quantite', width: 12 },
      { header: 'Fournisseur', key: 'fournisseur', width: 20 },
      { header: 'Date Livraison', key: 'dateLivraison', width: 15 },
      { header: 'N° Facture', key: 'numeroFacture', width: 15 },
      { header: 'Photo', key: 'photo', width: 20 },
    ];

    // Styliser les en-têtes
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Ajouter des lignes d'exemple
    worksheet.addRow({
      codeArticle: 'ART001',
      nom: 'Article Exemple 1',
      categorie: 'Catégorie 1',
      zone: 'A',
      prixVente: 50000,
      prixAchat: 30000,
      seuilAlerte: 10,
      quantite: 100,
      fournisseur: '',
      dateLivraison: '',
      numeroFacture: '',
      photo: '',
    });

    worksheet.addRow({
      codeArticle: 'ART002',
      nom: 'Article Exemple 2',
      categorie: 'Catégorie 1',
      zone: 'B',
      prixVente: 75000,
      prixAchat: 50000,
      seuilAlerte: 5,
      quantite: 50,
      fournisseur: 'Fournisseur ABC',
      dateLivraison: '2026-06-15',
      numeroFacture: 'FACT-001',
      photo: 'article002.jpg',
    });

    // Ajouter une feuille d'instructions
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { header: 'Instructions', key: 'instructions', width: 80 },
    ];

    instructionsSheet.addRow({ instructions: 'INSTRUCTIONS D\'UTILISATION DU TEMPLATE' });
    instructionsSheet.addRow({ instructions: '' });
    instructionsSheet.addRow({ instructions: '1. COLONNES OBLIGATOIRES:' });
    instructionsSheet.addRow({ instructions: '   - Code Article: Référence unique (ex: ART001)' });
    instructionsSheet.addRow({ instructions: '   - Nom: Nom de l\'article' });
    instructionsSheet.addRow({ instructions: '   - Catégorie: Nom exact de la catégorie existante' });
    instructionsSheet.addRow({ instructions: '   - Zone: A, B, C, D ou E' });
    instructionsSheet.addRow({ instructions: '   - Prix Vente: En GNF (nombre)' });
    instructionsSheet.addRow({ instructions: '   - Quantité: Nombre d\'unités' });
    instructionsSheet.addRow({ instructions: '' });
    instructionsSheet.addRow({ instructions: '2. COLONNES OPTIONNELLES:' });
    instructionsSheet.addRow({ instructions: '   - Prix Achat: Si vide, sera 0' });
    instructionsSheet.addRow({ instructions: '   - Seuil Alerte: Si vide, sera 10' });
    instructionsSheet.addRow({ instructions: '   - Fournisseur: Email, Téléphone OU Nom (si rempli, crée un approvisionnement)' });
    instructionsSheet.addRow({ instructions: '   - Date Livraison: Format AAAA-MM-JJ (ex: 2026-06-15)' });
    instructionsSheet.addRow({ instructions: '   - N° Facture: Référence facture' });
    instructionsSheet.addRow({ instructions: '   - Photo: Nom du fichier (ex: article001.jpg)' });
    instructionsSheet.addRow({ instructions: '' });
    instructionsSheet.addRow({ instructions: '3. IDENTIFICATION FOURNISSEUR (par ordre de priorité):' });
    instructionsSheet.addRow({ instructions: '   - Email (si contient @): contact@fournisseur.com' });
    instructionsSheet.addRow({ instructions: '   - Téléphone (si que des chiffres): 224 622 00 00 00' });
    instructionsSheet.addRow({ instructions: '   - Nom (sinon): Pharmacie Centrale' });
    instructionsSheet.addRow({ instructions: '   Recommandation: Utilisez le téléphone (tous en ont un!)' });
    instructionsSheet.addRow({ instructions: '' });
    instructionsSheet.addRow({ instructions: '4. LOGIQUE D\'IMPORT:' });
    instructionsSheet.addRow({ instructions: '   - Si SANS fournisseur: Article créé avec stock initial' });
    instructionsSheet.addRow({ instructions: '   - Si AVEC fournisseur: Approvisionnement créé (augmente stock)' });
    instructionsSheet.addRow({ instructions: '   - Si article existe: Seul l\'approvisionnement est créé' });
    instructionsSheet.addRow({ instructions: '   - Si article n\'existe pas: Article créé puis approvisionné' });
    instructionsSheet.addRow({ instructions: '' });
    instructionsSheet.addRow({ instructions: '5. IMPORT AVEC PHOTOS:' });
    instructionsSheet.addRow({ instructions: '   - Créez un dossier "photos" contenant vos images' });
    instructionsSheet.addRow({ instructions: '   - Dans la colonne "Photo", indiquez le nom du fichier (ex: article001.jpg)' });
    instructionsSheet.addRow({ instructions: '   - Compressez le fichier Excel + dossier photos en ZIP' });
    instructionsSheet.addRow({ instructions: '   - Uploadez le fichier ZIP' });
    instructionsSheet.addRow({ instructions: '   - Formats acceptés: JPG, PNG, WEBP (max 5MB par photo)' });
    instructionsSheet.addRow({ instructions: '' });
    instructionsSheet.addRow({ instructions: 'Exemple de structure ZIP:' });
    instructionsSheet.addRow({ instructions: '   import-articles.zip' });
    instructionsSheet.addRow({ instructions: '   ├── articles.xlsx' });
    instructionsSheet.addRow({ instructions: '   └── photos/' });
    instructionsSheet.addRow({ instructions: '       ├── article001.jpg' });
    instructionsSheet.addRow({ instructions: '       ├── article002.png' });
    instructionsSheet.addRow({ instructions: '       └── article003.jpg' });
    instructionsSheet.addRow({ instructions: '' });
    instructionsSheet.addRow({ instructions: '6. CONSEILS:' });
    instructionsSheet.addRow({ instructions: '   - Vérifiez que les catégories existent dans le système' });
    instructionsSheet.addRow({ instructions: '   - Utilisez des codes article uniques' });
    instructionsSheet.addRow({ instructions: '   - Les articles du même fournisseur seront groupés' });
    instructionsSheet.addRow({ instructions: '   - Maximum 10000 lignes par fichier recommandé' });
    instructionsSheet.addRow({ instructions: '   - Si pas de photos, uploadez simplement le fichier Excel' });

    // Envoyer le fichier
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-import-articles.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
