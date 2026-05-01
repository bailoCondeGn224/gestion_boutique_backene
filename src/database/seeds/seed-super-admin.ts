import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';

export async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
  console.log('Seed du SUPER_ADMIN...');

  const userRepository = dataSource.getRepository(User);

  // Vérifier si un SUPER_ADMIN existe déjà
  const existingSuperAdmin = await userRepository.findOne({
    where: { isSuperAdmin: true },
  });

  if (existingSuperAdmin) {
    console.log('SUPER_ADMIN existe déjà:', existingSuperAdmin.email);
    return;
  }

  // Créer le premier SUPER_ADMIN
  const hashedPassword = await bcrypt.hash('conde623', 10);

  const superAdmin = userRepository.create({
    email: 'bailoconde623@gmail.com',
    password: hashedPassword,
    nom: 'Bailo Conde',
    isSuperAdmin: true,
    organization: null,
    role: null, 
  });

  await userRepository.save(superAdmin);

  console.log('SUPER_ADMIN créé avec succès!');
}

