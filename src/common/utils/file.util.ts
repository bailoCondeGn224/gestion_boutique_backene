import { unlink, access } from 'fs/promises';
import { join } from 'path';

/**
 * Supprime un fichier du système de fichiers
 * @param relativePath Chemin relatif depuis le dossier uploads (ex: articles/org-id/photo.jpg)
 */
export async function deleteFile(relativePath: string): Promise<void> {
  if (!relativePath) return;

  try {
    const fullPath = join(process.cwd(), 'storage', 'uploads', relativePath);

    // Vérifier si le fichier existe avant de le supprimer
    try {
      await access(fullPath);
      await unlink(fullPath);
    } catch (error) {
      // Fichier n'existe pas ou n'est pas accessible, ignorer silencieusement
      if (error.code !== 'ENOENT') {
        console.error(`Erreur suppression fichier ${relativePath}:`, error);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la suppression de ${relativePath}:`, error);
  }
}
