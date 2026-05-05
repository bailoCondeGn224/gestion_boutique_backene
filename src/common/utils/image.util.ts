import sharp from 'sharp';
import { join } from 'path';

/**
 * Configuration de compression d'image
 */
const IMAGE_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: {
    jpeg: 85,
    webp: 85,
    png: 8, // Niveau de compression PNG (0-9)
  },
};

/**
 * Compresse une image uploadée
 * - Redimensionne si trop grande (max 1200x1200 en conservant les proportions)
 * - Compresse selon le format (JPEG 85%, PNG compression 8, WebP 85%)
 * - Remplace le fichier original
 *
 * @param filePath Chemin absolu du fichier à compresser
 * @returns Promise<void>
 */
export async function compressImage(filePath: string): Promise<void> {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Déterminer si un redimensionnement est nécessaire
    const needsResize =
      metadata.width > IMAGE_CONFIG.maxWidth ||
      metadata.height > IMAGE_CONFIG.maxHeight;

    let processedImage = image;

    // Redimensionner si nécessaire (conserve les proportions)
    if (needsResize) {
      processedImage = processedImage.resize(
        IMAGE_CONFIG.maxWidth,
        IMAGE_CONFIG.maxHeight,
        {
          fit: 'inside', // Conserve les proportions
          withoutEnlargement: true, // Ne pas agrandir les petites images
        },
      );
    }

    // Compresser selon le format
    switch (metadata.format) {
      case 'jpeg':
      case 'jpg':
        await processedImage
          .jpeg({ quality: IMAGE_CONFIG.quality.jpeg, progressive: true })
          .toFile(filePath + '.tmp');
        break;

      case 'png':
        await processedImage
          .png({ compressionLevel: IMAGE_CONFIG.quality.png })
          .toFile(filePath + '.tmp');
        break;

      case 'webp':
        await processedImage
          .webp({ quality: IMAGE_CONFIG.quality.webp })
          .toFile(filePath + '.tmp');
        break;

      default:
        // Format non supporté, on ne compresse pas
        console.warn(`Format ${metadata.format} non supporté pour compression`);
        return;
    }

    // Remplacer le fichier original par la version compressée
    const fs = require('fs/promises');
    await fs.rename(filePath + '.tmp', filePath);

    console.log(`✅ Image compressée: ${filePath}`);
  } catch (error) {
    console.error(`❌ Erreur compression image ${filePath}:`, error);
    // Ne pas bloquer en cas d'erreur, l'image originale reste
  }
}

/**
 * Génère un thumbnail (miniature) d'une image
 * @param sourcePath Chemin du fichier source
 * @param thumbnailPath Chemin où sauvegarder le thumbnail
 * @param size Taille du thumbnail (défaut: 200x200)
 */
export async function generateThumbnail(
  sourcePath: string,
  thumbnailPath: string,
  size: number = 200,
): Promise<void> {
  try {
    await sharp(sourcePath)
      .resize(size, size, {
        fit: 'cover', // Recadre pour remplir le carré
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    console.log(`✅ Thumbnail généré: ${thumbnailPath}`);
  } catch (error) {
    console.error(`❌ Erreur génération thumbnail:`, error);
  }
}
