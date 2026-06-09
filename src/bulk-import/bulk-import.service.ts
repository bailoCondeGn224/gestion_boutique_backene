import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Article } from '../stock/entities/article.entity';
import { Categorie } from '../categories/entities/categorie.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';
import { Approvisionnement } from '../approvisionnements/entities/approvisionnement.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { MouvementStock, TypeMouvement, MotifMouvement } from '../mouvements-stock/entities/mouvement-stock.entity';
import { ImportArticleDto, ImportResultDto, ImportErrorDto } from './dto/import-article.dto';
import * as ExcelJS from 'exceljs';
import AdmZip = require('adm-zip');
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BulkImportService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Categorie)
    private categorieRepository: Repository<Categorie>,
    @InjectRepository(Fournisseur)
    private fournisseurRepository: Repository<Fournisseur>,
    @InjectRepository(Approvisionnement)
    private approvisionnementRepository: Repository<Approvisionnement>,
    @InjectRepository(LigneApprovisionnement)
    private ligneApprovisionnementRepository: Repository<LigneApprovisionnement>,
    @InjectRepository(MouvementStock)
    private mouvementStockRepository: Repository<MouvementStock>,
    private dataSource: DataSource,
  ) {}

  /**
   * Parser le fichier Excel/ZIP et importer les articles
   */
  async importFromExcel(
    file: Express.Multer.File,
    organizationId: string,
    userId: string,
    userNom: string,
  ): Promise<ImportResultDto> {
    let excelBuffer: Buffer;
    let photosMap = new Map<string, string>(); // filename -> path to photo
    let tempDir: string | null = null;

    // Détecter si c'est un ZIP ou un Excel
    const isZip = file.originalname.toLowerCase().endsWith('.zip') ||
                  file.mimetype === 'application/zip' ||
                  file.mimetype === 'application/x-zip-compressed';

    if (isZip) {
      // Traiter le ZIP
      tempDir = path.join('./storage/temp', `import-${uuidv4()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        const zip = new AdmZip(file.buffer);
        const zipEntries = zip.getEntries();

        let excelEntry: AdmZip.IZipEntry | null = null;

        // Parcourir les fichiers du ZIP
        for (const entry of zipEntries) {
          if (entry.isDirectory) continue;

          const fileName = entry.entryName.toLowerCase();
          const baseName = path.basename(fileName);

          // Trouver le fichier Excel
          if ((fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) && !excelEntry) {
            excelEntry = entry;
            excelBuffer = entry.getData();
          }
          // Extraire les photos du dossier "photos/"
          else if (fileName.includes('photos/') || fileName.includes('photos\\')) {
            // Utiliser le nom original (pas lowercase) pour éviter les problèmes de correspondance
            const originalBaseName = path.basename(entry.entryName);
            const photoPath = path.join(tempDir, originalBaseName);
            fs.writeFileSync(photoPath, entry.getData());
            // Stocker avec le nom en minuscules comme clé pour comparaison insensible à la casse
            photosMap.set(originalBaseName.toLowerCase(), photoPath);
            console.log(`📸 Photo extraite: ${originalBaseName} -> ${photoPath}`);
          }
        }

        if (!excelEntry) {
          throw new BadRequestException('Aucun fichier Excel trouvé dans le ZIP');
        }
      } catch (error) {
        // Nettoyer en cas d'erreur
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw new BadRequestException(`Erreur lors de l'extraction du ZIP: ${error.message}`);
      }
    } else {
      // Fichier Excel simple
      excelBuffer = file.buffer;
    }

    // Parser le fichier Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw new BadRequestException('Le fichier Excel est vide');
    }

    // Parser les lignes Excel
    const rows: ImportArticleDto[] = [];
    const errors: ImportErrorDto[] = [];

    worksheet.eachRow((row, rowNumber) => {
      // Ignorer la ligne d'en-tête
      if (rowNumber === 1) return;

      try {
        const data: ImportArticleDto = {
          codeArticle: this.getCellValue(row, 1),
          nom: this.getCellValue(row, 2),
          categorie: this.getCellValue(row, 3),
          zone: this.getCellValue(row, 4),
          prixVente: this.getNumberValue(row, 5),
          prixAchat: this.getNumberValue(row, 6),
          seuilAlerte: this.getNumberValue(row, 7) || 10,
          quantite: this.getNumberValue(row, 8) || 0,
          fournisseur: this.getCellValue(row, 9),
          dateLivraison: this.getCellValue(row, 10),
          numeroFacture: this.getCellValue(row, 11),
          photo: this.getCellValue(row, 12), // Colonne photo
        };

        rows.push(data);
      } catch (error) {
        errors.push({
          row: rowNumber,
          errors: [`Erreur de parsing: ${error.message}`],
        });
      }
    });

    // Importer les données
    try {
      return await this.processImport(rows, errors, organizationId, userId, userNom, photosMap);
    } finally {
      // Nettoyer le dossier temporaire
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Traiter l'import avec logique intelligente
   */
  private async processImport(
    rows: ImportArticleDto[],
    parseErrors: ImportErrorDto[],
    organizationId: string,
    userId: string,
    userNom: string,
    photosMap: Map<string, string> = new Map(),
  ): Promise<ImportResultDto> {
    let articlesCreated = 0;
    let approvisionnementsCreated = 0;
    const errors: ImportErrorDto[] = [...parseErrors];

    // Cache pour éviter les requêtes répétées
    const categoriesCache = new Map<string, Categorie>();
    const fournisseursCache = new Map<string, Fournisseur>();
    const articlesCache = new Map<string, Article>();

    // Grouper par fournisseur pour créer des approvisionnements groupés
    const rowsByFournisseur = this.groupByFournisseur(rows);

    for (const [fournisseurNom, fournisseurRows] of rowsByFournisseur) {
      try {
        if (fournisseurNom) {
          // Cas avec fournisseur : créer un approvisionnement
          const result = await this.createApprovisionnement(
            fournisseurRows,
            fournisseurNom,
            organizationId,
            userId,
            userNom,
            categoriesCache,
            fournisseursCache,
            articlesCache,
            photosMap,
          );

          articlesCreated += result.articlesCreated;
          approvisionnementsCreated += result.approvisionnementsCreated;
          errors.push(...result.errors);
        } else {
          // Cas sans fournisseur : créer articles directs
          const result = await this.createArticlesDirect(
            fournisseurRows,
            organizationId,
            categoriesCache,
            articlesCache,
            photosMap,
          );

          articlesCreated += result.articlesCreated;
          errors.push(...result.errors);
        }
      } catch (error) {
        errors.push({
          row: 0,
          errors: [`Erreur globale: ${error.message}`],
        });
      }
    }

    return {
      articlesCreated,
      approvisionnementsCreated,
      errors,
      summary: {
        totalRows: rows.length,
        success: articlesCreated,
        failed: errors.length,
      },
    };
  }

  /**
   * Créer des articles sans fournisseur (Stock Direct)
   */
  private async createArticlesDirect(
    rows: ImportArticleDto[],
    organizationId: string,
    categoriesCache: Map<string, Categorie>,
    articlesCache: Map<string, Article>,
    photosMap: Map<string, string> = new Map(),
  ) {
    let articlesCreated = 0;
    const errors: ImportErrorDto[] = [];

    for (const row of rows) {
      try {
        // Vérifier si l'article existe déjà
        let article = articlesCache.get(row.codeArticle);

        if (!article) {
          article = await this.articleRepository.findOne({
            where: { reference: row.codeArticle, organizationId },
          });

          if (article) {
            articlesCache.set(row.codeArticle, article);
          }
        }

        if (article) {
          // Article existe déjà, ignorer
          continue;
        }

        // Résoudre la catégorie
        const categorie = await this.resolveCategorie(row.categorie, organizationId, categoriesCache);

        if (!categorie) {
          errors.push({
            row: 0,
            codeArticle: row.codeArticle,
            nom: row.nom,
            errors: [`Catégorie non trouvée: ${row.categorie}`],
          });
          continue;
        }

        // Traiter la photo si présente
        let photoFilename: string | null = null;
        console.log(`🔎 Article ${row.codeArticle}: row.photo =`, row.photo);
        console.log(`🔎 photosMap.has("${row.photo?.toLowerCase()}") =`, row.photo ? photosMap.has(row.photo.toLowerCase()) : false);
        if (row.photo && photosMap.has(row.photo.toLowerCase())) {
          photoFilename = await this.copyPhotoToStorage(row.photo.toLowerCase(), photosMap, organizationId);
          console.log(`✅ photoFilename assigné:`, photoFilename);
        } else {
          console.log(`❌ Pas de photo pour ${row.codeArticle}`);
        }

        // Créer l'article avec stock initial
        const newArticle = this.articleRepository.create({
          nom: row.nom,
          reference: row.codeArticle,
          categorieId: categorie.id,
          zone: row.zone,
          stock: row.quantite,
          seuilAlerte: row.seuilAlerte || 10,
          prixVente: row.prixVente,
          prixAchat: row.prixAchat || 0,
          photo: photoFilename,
          organizationId,
        });

        console.log(`💾 Sauvegarde article ${row.codeArticle} avec photo:`, photoFilename);
        await this.articleRepository.save(newArticle);
        console.log(`✅ Article sauvegardé. Photo dans DB:`, newArticle.photo);
        articlesCache.set(row.codeArticle, newArticle);

        // Créer mouvement de stock si quantité > 0
        if (row.quantite > 0) {
          await this.createMouvementStock(
            newArticle,
            TypeMouvement.ENTREE,
            MotifMouvement.AJUSTEMENT,
            row.quantite,
            0,
            row.quantite,
            row.prixAchat || 0,
            organizationId,
          );
        }

        articlesCreated++;
      } catch (error) {
        errors.push({
          row: 0,
          codeArticle: row.codeArticle,
          nom: row.nom,
          errors: [`Erreur: ${error.message}`],
        });
      }
    }

    return { articlesCreated, errors };
  }

  /**
   * Créer un approvisionnement avec ses lignes
   */
  private async createApprovisionnement(
    rows: ImportArticleDto[],
    fournisseurNom: string,
    organizationId: string,
    userId: string,
    userNom: string,
    categoriesCache: Map<string, Categorie>,
    fournisseursCache: Map<string, Fournisseur>,
    articlesCache: Map<string, Article>,
    photosMap: Map<string, string> = new Map(),
  ) {
    let articlesCreated = 0;
    let approvisionnementsCreated = 0;
    const errors: ImportErrorDto[] = [];

    // Résoudre le fournisseur par email, téléphone ou nom
    let fournisseur = fournisseursCache.get(fournisseurNom);

    if (!fournisseur) {
      const isEmail = fournisseurNom.includes('@');
      const isPhone = /^[\d\s\+\-\(\)]+$/.test(fournisseurNom); // Numéro de téléphone (chiffres, espaces, +, -, ())

      // 1. Chercher par email d'abord (si c'est un email)
      if (isEmail) {
        fournisseur = await this.fournisseurRepository.findOne({
          where: { email: fournisseurNom, organizationId },
        });
      }

      // 2. Si pas trouvé et que c'est un téléphone, chercher par téléphone
      if (!fournisseur && isPhone) {
        fournisseur = await this.fournisseurRepository.findOne({
          where: { telephone: fournisseurNom, organizationId },
        });
      }

      // 3. Si toujours pas trouvé, chercher par nom
      if (!fournisseur) {
        fournisseur = await this.fournisseurRepository.findOne({
          where: { nom: fournisseurNom, organizationId },
        });
      }

      if (fournisseur) {
        fournisseursCache.set(fournisseurNom, fournisseur);
      } else {
        errors.push({
          row: 0,
          errors: [`Fournisseur non trouvé: ${fournisseurNom}`],
        });
        return { articlesCreated, approvisionnementsCreated, errors };
      }
    }

    // Utiliser une transaction pour garantir l'atomicité
    await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      // Générer le numéro d'approvisionnement
      const lastAppro = await manager
        .createQueryBuilder(Approvisionnement, 'a')
        .where('a.organizationId = :organizationId', { organizationId })
        .orderBy('a.createdAt', 'DESC')
        .getOne();

      let numero = 'APP-001';
      if (lastAppro) {
        const lastNum = parseInt(lastAppro.numero.split('-')[1]);
        numero = `APP-${String(lastNum + 1).padStart(3, '0')}`;
      }

      // Préparer les lignes
      const lignes: any[] = [];
      let total = 0;

      for (const row of rows) {
        try {
          // Chercher ou créer l'article
          let article = articlesCache.get(row.codeArticle);

          if (!article) {
            article = await manager.findOne(Article, {
              where: { reference: row.codeArticle, organizationId },
            });

            if (article) {
              articlesCache.set(row.codeArticle, article);
            }
          }

          // Si l'article n'existe pas, le créer avec stock = 0
          if (!article) {
            const categorie = await this.resolveCategorie(row.categorie, organizationId, categoriesCache);

            if (!categorie) {
              errors.push({
                row: 0,
                codeArticle: row.codeArticle,
                nom: row.nom,
                errors: [`Catégorie non trouvée: ${row.categorie}`],
              });
              continue;
            }

            // Traiter la photo si présente
            let photoFilename: string | null = null;
            console.log(`🔎 Article ${row.codeArticle}: row.photo =`, row.photo);
            console.log(`🔎 photosMap.has("${row.photo?.toLowerCase()}") =`, row.photo ? photosMap.has(row.photo.toLowerCase()) : false);
            if (row.photo && photosMap.has(row.photo.toLowerCase())) {
              photoFilename = await this.copyPhotoToStorage(row.photo.toLowerCase(), photosMap, organizationId);
              console.log(`✅ photoFilename assigné:`, photoFilename);
            } else {
              console.log(`❌ Pas de photo pour ${row.codeArticle}`);
            }

            article = manager.create(Article, {
              nom: row.nom,
              reference: row.codeArticle,
              categorieId: categorie.id,
              zone: row.zone,
              stock: 0,
              seuilAlerte: row.seuilAlerte || 10,
              prixVente: row.prixVente,
              prixAchat: row.prixAchat || 0,
              photo: photoFilename,
              organizationId,
            });

            console.log(`💾 Sauvegarde article ${row.codeArticle} (appro) avec photo:`, photoFilename);
            await manager.save(Article, article);
            console.log(`✅ Article sauvegardé (appro). Photo dans DB:`, article.photo);
            articlesCache.set(row.codeArticle, article);
            articlesCreated++;
          }

          // Préparer la ligne d'approvisionnement
          const sousTotal = row.quantite * (row.prixAchat || 0);
          lignes.push({
            articleId: article.id,
            nom: article.nom,
            quantite: row.quantite,
            prixUnitaire: row.prixAchat || 0,
            sousTotal,
          });

          total += sousTotal;

          // Mettre à jour le stock de l'article
          article.stock += row.quantite;
          article.prixAchat = row.prixAchat || article.prixAchat;
          await manager.save(Article, article);

          // Créer mouvement de stock
          const mouvement = manager.create(MouvementStock, {
            articleId: article.id,
            articleNom: article.nom,
            type: TypeMouvement.ENTREE,
            motif: MotifMouvement.APPROVISIONNEMENT,
            quantite: row.quantite,
            stockAvant: article.stock - row.quantite,
            stockApres: article.stock,
            prixUnitaire: row.prixAchat || 0,
            valeurTotal: sousTotal,
            userId,
            userNom,
            date: row.dateLivraison ? new Date(row.dateLivraison) : new Date(),
            organizationId,
          });

          await manager.save(MouvementStock, mouvement);
        } catch (error) {
          errors.push({
            row: 0,
            codeArticle: row.codeArticle,
            nom: row.nom,
            errors: [`Erreur: ${error.message}`],
          });
        }
      }

      // Créer l'approvisionnement
      if (lignes.length > 0) {
        const dateLivraison = rows[0]?.dateLivraison
          ? new Date(rows[0].dateLivraison)
          : new Date();

        const approvisionnement = manager.create(Approvisionnement, {
          numero,
          fournisseurId: fournisseur.id,
          fournisseurNom: fournisseur.nom,
          total,
          montantPaye: 0,
          montantRestant: total,
          dateLivraison,
          numeroFacture: rows[0]?.numeroFacture,
          organizationId,
        });

        const savedAppro = await manager.save(Approvisionnement, approvisionnement);

        // Créer les lignes
        for (const ligneData of lignes) {
          const ligne = manager.create(LigneApprovisionnement, {
            ...ligneData,
            approvisionnementId: savedAppro.id,
            organizationId,
          });
          await manager.save(LigneApprovisionnement, ligne);
        }

        // Mettre à jour le fournisseur
        fournisseur.totalAchats = Number(fournisseur.totalAchats) + total;
        fournisseur.dette = Number(fournisseur.totalAchats) - Number(fournisseur.totalPaye);
        await manager.save(Fournisseur, fournisseur);

        approvisionnementsCreated++;
      }
    });

    return { articlesCreated, approvisionnementsCreated, errors };
  }

  /**
   * Créer un mouvement de stock
   */
  private async createMouvementStock(
    article: Article,
    type: TypeMouvement,
    motif: MotifMouvement,
    quantite: number,
    stockAvant: number,
    stockApres: number,
    prixUnitaire: number,
    organizationId: string,
  ) {
    const mouvement = this.mouvementStockRepository.create({
      articleId: article.id,
      articleNom: article.nom,
      type,
      motif,
      quantite,
      stockAvant,
      stockApres,
      prixUnitaire,
      valeurTotal: quantite * prixUnitaire,
      date: new Date(),
      organizationId,
    });

    await this.mouvementStockRepository.save(mouvement);
  }

  /**
   * Résoudre une catégorie par ID ou nom
   */
  private async resolveCategorie(
    categorieInput: string,
    organizationId: string,
    cache: Map<string, Categorie>,
  ): Promise<Categorie | null> {
    if (cache.has(categorieInput)) {
      return cache.get(categorieInput);
    }

    let categorie: Categorie | null = null;

    // Vérifier si c'est un UUID valide (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(categorieInput);

    // Chercher par ID seulement si c'est un UUID valide
    if (isUuid) {
      categorie = await this.categorieRepository.findOne({
        where: { id: categorieInput, organizationId },
      });
    }

    // Si pas trouvé par ID ou pas un UUID, chercher par nom
    if (!categorie) {
      categorie = await this.categorieRepository.findOne({
        where: { nom: categorieInput, organizationId },
      });
    }

    if (categorie) {
      cache.set(categorieInput, categorie);
    }

    return categorie;
  }

  /**
   * Grouper les lignes par fournisseur
   */
  private groupByFournisseur(rows: ImportArticleDto[]): Map<string, ImportArticleDto[]> {
    const groups = new Map<string, ImportArticleDto[]>();

    for (const row of rows) {
      const fournisseur = row.fournisseur || '';
      if (!groups.has(fournisseur)) {
        groups.set(fournisseur, []);
      }
      groups.get(fournisseur).push(row);
    }

    return groups;
  }

  /**
   * Obtenir la valeur d'une cellule Excel
   */
  private getCellValue(row: ExcelJS.Row, colNumber: number): string {
    const cell = row.getCell(colNumber);
    return cell.value ? String(cell.value).trim() : '';
  }

  /**
   * Obtenir une valeur numérique d'une cellule Excel
   */
  private getNumberValue(row: ExcelJS.Row, colNumber: number): number {
    const cell = row.getCell(colNumber);
    const value = cell.value;

    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Copier une photo du dossier temporaire vers le storage permanent
   */
  private async copyPhotoToStorage(
    photoFilename: string,
    photosMap: Map<string, string>,
    organizationId: string,
  ): Promise<string | null> {
    try {
      console.log(`🔍 Recherche photo: ${photoFilename}`);
      console.log(`📦 Photos disponibles:`, Array.from(photosMap.keys()));

      const sourcePath = photosMap.get(photoFilename);
      if (!sourcePath || !fs.existsSync(sourcePath)) {
        console.log(`❌ Photo non trouvée: ${photoFilename}`);
        return null;
      }

      console.log(`✅ Photo trouvée: ${photoFilename} -> ${sourcePath}`);

      // Créer le dossier de destination
      const uploadPath = `./storage/uploads/articles/${organizationId}`;
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      // Générer un nom unique pour la photo
      const ext = path.extname(photoFilename);
      const uniqueName = `${uuidv4()}-${Date.now()}${ext}`;
      const destPath = path.join(uploadPath, uniqueName);

      // Copier le fichier
      fs.copyFileSync(sourcePath, destPath);

      // Retourner le chemin relatif complet pour l'URL
      const relativePath = `articles/${organizationId}/${uniqueName}`;
      console.log(`💾 Photo copiée: ${relativePath}`);
      return relativePath;
    } catch (error) {
      console.error(`Erreur lors de la copie de la photo ${photoFilename}:`, error);
      return null;
    }
  }
}
