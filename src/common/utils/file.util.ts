import { unlink } from 'fs/promises';
import { join } from 'path';

/**
 * Supprime un fichier du système de fichiers
 * @param relativePath Chemin relatif depuis le dossier uploads (ex: articles/org-id/photo.jpg)
 */
export async function deleteFile(relativePath: string): Promise<void> {
  if (!relativePath) return;

  try {
    const fullPath = join(process.cwd(), 'storage', 'uploads', relativePath);
    await unlink(fullPath);
  } catch (error) {
    console.error(`Erreur suppression fichier ${relativePath}:`, error);
  }
}
