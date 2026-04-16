import { DataSource } from 'typeorm';
import { Parametre } from '../../parametres/entities/parametre.entity';

export async function seedParametres(dataSource: DataSource): Promise<void> {
  console.log('🌱 Seed des paramètres de l\'entreprise...');

  const parametreRepository = dataSource.getRepository(Parametre);

  // Vérifier si des paramètres existent déjà
  const existingParametres = await parametreRepository.find();

  if (existingParametres.length > 0) {
    console.log('  ⏭️  Paramètres déjà configurés');
    return;
  }

  // Créer les paramètres par défaut
  const defaultParametres = parametreRepository.create({
    nomComplet: 'Walli Industrie SARL',
    nomCourt: 'Walli',
    slogan: 'Mode & Tradition',
    email: 'contact@walli-industrie.com',
    telephone: '+224 XXX XX XX XX',
    adresse: 'Conakry, Guinée',
    siteWeb: 'www.walli-industrie.com',
    devise: 'GNF',
    rccm: '',
    nif: '',
    registreCommerce: '',
    mentionsLegales: 'Merci pour votre confiance',
  });

  await parametreRepository.save(defaultParametres);
  console.log('  ✅ Paramètres par défaut créés');
}
