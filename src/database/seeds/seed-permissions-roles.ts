import { DataSource } from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { Role } from '../../roles/entities/role.entity';

/**
 * Liste des permissions de base pour tous les modules
 */
const basePermissions = [
  // Ventes
  { code: 'ventes.create', nom: 'Créer une vente', description: 'Permet de créer de nouvelles ventes' },
  { code: 'ventes.read', nom: 'Voir les ventes', description: 'Permet de consulter les ventes' },
  { code: 'ventes.update', nom: 'Modifier une vente', description: 'Permet de modifier les ventes existantes' },
  { code: 'ventes.delete', nom: 'Supprimer une vente', description: 'Permet de supprimer des ventes' },

  // Stock
  { code: 'stock.create', nom: 'Ajouter un article', description: 'Permet d\'ajouter de nouveaux articles au stock' },
  { code: 'stock.read', nom: 'Voir le stock', description: 'Permet de consulter le stock' },
  { code: 'stock.update', nom: 'Modifier un article', description: 'Permet de modifier les articles du stock' },
  { code: 'stock.delete', nom: 'Supprimer un article', description: 'Permet de supprimer des articles du stock' },

  // Approvisionnements
  { code: 'approvisionnements.create', nom: 'Créer un approvisionnement', description: 'Permet d\'enregistrer de nouveaux approvisionnements' },
  { code: 'approvisionnements.read', nom: 'Voir les approvisionnements', description: 'Permet de consulter les approvisionnements' },
  { code: 'approvisionnements.update', nom: 'Modifier un approvisionnement', description: 'Permet de modifier les approvisionnements' },
  { code: 'approvisionnements.delete', nom: 'Supprimer un approvisionnement', description: 'Permet de supprimer des approvisionnements' },

  // Clients
  { code: 'clients.create', nom: 'Ajouter un client', description: 'Permet d\'ajouter de nouveaux clients' },
  { code: 'clients.read', nom: 'Voir les clients', description: 'Permet de consulter les clients' },
  { code: 'clients.update', nom: 'Modifier un client', description: 'Permet de modifier les informations des clients' },
  { code: 'clients.delete', nom: 'Supprimer un client', description: 'Permet de supprimer des clients' },

  // Fournisseurs
  { code: 'fournisseurs.create', nom: 'Ajouter un fournisseur', description: 'Permet d\'ajouter de nouveaux fournisseurs' },
  { code: 'fournisseurs.read', nom: 'Voir les fournisseurs', description: 'Permet de consulter les fournisseurs' },
  { code: 'fournisseurs.update', nom: 'Modifier un fournisseur', description: 'Permet de modifier les informations des fournisseurs' },
  { code: 'fournisseurs.delete', nom: 'Supprimer un fournisseur', description: 'Permet de supprimer des fournisseurs' },

  // Finances
  { code: 'finances.read', nom: 'Voir les finances', description: 'Permet de consulter les données financières' },
  { code: 'finances.manage', nom: 'Gérer les finances', description: 'Permet de gérer les transactions financières' },

  // Versements
  { code: 'versements.create', nom: 'Créer un versement', description: 'Permet d\'enregistrer des paiements fournisseurs' },
  { code: 'versements.read', nom: 'Voir les versements', description: 'Permet de consulter les versements' },
  { code: 'versements.update', nom: 'Modifier un versement', description: 'Permet de modifier les versements' },
  { code: 'versements.delete', nom: 'Supprimer un versement', description: 'Permet de supprimer des versements' },

  // Versements clients
  { code: 'versements-client.create', nom: 'Créer un versement client', description: 'Permet d\'enregistrer des paiements de dettes clients' },
  { code: 'versements-client.read', nom: 'Voir les versements clients', description: 'Permet de consulter les paiements clients' },
  { code: 'versements-client.update', nom: 'Modifier un versement client', description: 'Permet de modifier les paiements clients' },
  { code: 'versements-client.delete', nom: 'Supprimer un versement client', description: 'Permet d\'annuler des paiements clients' },

  // Analytics
  { code: 'analytics.read', nom: 'Voir les statistiques', description: 'Permet de consulter les statistiques et rapports' },

  // Catégories
  { code: 'categories.create', nom: 'Créer une catégorie', description: 'Permet de créer de nouvelles catégories' },
  { code: 'categories.read', nom: 'Voir les catégories', description: 'Permet de consulter les catégories' },
  { code: 'categories.update', nom: 'Modifier une catégorie', description: 'Permet de modifier les catégories' },
  { code: 'categories.delete', nom: 'Supprimer une catégorie', description: 'Permet de supprimer des catégories' },

  // Zones de stockage
  { code: 'zones.create', nom: 'Créer une zone', description: 'Permet de créer de nouvelles zones de stockage' },
  { code: 'zones.read', nom: 'Voir les zones', description: 'Permet de consulter les zones de stockage' },
  { code: 'zones.update', nom: 'Modifier une zone', description: 'Permet de modifier les zones de stockage' },
  { code: 'zones.delete', nom: 'Supprimer une zone', description: 'Permet de supprimer des zones de stockage' },

  // Mouvements de stock
  { code: 'mouvements.read', nom: 'Voir l\'historique des mouvements', description: 'Permet de consulter l\'historique des mouvements de stock' },

  // Utilisateurs
  { code: 'users.create', nom: 'Créer un utilisateur', description: 'Permet de créer de nouveaux utilisateurs' },
  { code: 'users.read', nom: 'Voir les utilisateurs', description: 'Permet de consulter les utilisateurs' },
  { code: 'users.update', nom: 'Modifier un utilisateur', description: 'Permet de modifier les utilisateurs' },
  { code: 'users.delete', nom: 'Supprimer un utilisateur', description: 'Permet de supprimer des utilisateurs' },

  // Rôles et permissions
  { code: 'roles.create', nom: 'Créer un rôle', description: 'Permet de créer de nouveaux rôles' },
  { code: 'roles.read', nom: 'Voir les rôles', description: 'Permet de consulter les rôles' },
  { code: 'roles.update', nom: 'Modifier un rôle', description: 'Permet de modifier les rôles' },
  { code: 'roles.delete', nom: 'Supprimer un rôle', description: 'Permet de supprimer des rôles' },
  { code: 'permissions.manage', nom: 'Gérer les permissions', description: 'Permet de gérer les permissions du système' },

  // Paramètres
  { code: 'parametres.read', nom: 'Voir les paramètres', description: 'Permet de consulter les paramètres de l\'entreprise' },
  { code: 'parametres.update', nom: 'Modifier les paramètres', description: 'Permet de modifier les paramètres de l\'entreprise' },
];

/**
 * Configuration des rôles avec leurs permissions
 */
const rolesConfig = [
  {
    nom: 'ADMIN',
    description: 'Administrateur avec accès complet au système',
    permissions: 'ALL', // Toutes les permissions
  },
  {
    nom: 'GESTIONNAIRE',
    description: 'Gestionnaire de la boutique - accès complet sauf gestion users/roles',
    permissions: [
      // Ventes
      'ventes.create', 'ventes.read', 'ventes.update', 'ventes.delete',
      // Stock
      'stock.create', 'stock.read', 'stock.update', 'stock.delete',
      // Approvisionnements
      'approvisionnements.create', 'approvisionnements.read', 'approvisionnements.update', 'approvisionnements.delete',
      // Clients
      'clients.create', 'clients.read', 'clients.update', 'clients.delete',
      // Fournisseurs
      'fournisseurs.create', 'fournisseurs.read', 'fournisseurs.update', 'fournisseurs.delete',
      // Finances
      'finances.read', 'finances.manage',
      // Versements
      'versements.create', 'versements.read', 'versements.update', 'versements.delete',
      // Versements clients
      'versements-client.create', 'versements-client.read', 'versements-client.update', 'versements-client.delete',
      // Analytics
      'analytics.read',
      // Catégories
      'categories.create', 'categories.read', 'categories.update', 'categories.delete',
      // Zones
      'zones.create', 'zones.read', 'zones.update', 'zones.delete',
      // Mouvements
      'mouvements.read',
      // Paramètres
      'parametres.read', 'parametres.update',
    ],
  },
  {
    nom: 'VENDEUR',
    description: 'Personnel de vente - gestion des ventes et clients',
    permissions: [
      // Ventes
      'ventes.create', 'ventes.read',
      // Clients
      'clients.create', 'clients.read',
      // Stock (lecture seule)
      'stock.read',
      // Catégories (lecture seule)
      'categories.read',
      // Versements clients (peut enregistrer paiements)
      'versements-client.create', 'versements-client.read',
    ],
  },
  {
    nom: 'GESTIONNAIRE_STOCK',
    description: 'Responsable du stock et des approvisionnements',
    permissions: [
      // Stock
      'stock.create', 'stock.read', 'stock.update', 'stock.delete',
      // Approvisionnements
      'approvisionnements.create', 'approvisionnements.read', 'approvisionnements.update', 'approvisionnements.delete',
      // Fournisseurs
      'fournisseurs.create', 'fournisseurs.read', 'fournisseurs.update', 'fournisseurs.delete',
      // Catégories
      'categories.create', 'categories.read', 'categories.update', 'categories.delete',
      // Zones
      'zones.create', 'zones.read', 'zones.update', 'zones.delete',
      // Mouvements
      'mouvements.read',
      // Versements (lecture seule)
      'versements.read',
    ],
  },
  {
    nom: 'COMPTABLE',
    description: 'Responsable financier - gestion des finances et rapports',
    permissions: [
      // Finances
      'finances.read', 'finances.manage',
      // Analytics
      'analytics.read',
      // Ventes (lecture seule)
      'ventes.read',
      // Approvisionnements (lecture seule)
      'approvisionnements.read',
      // Versements
      'versements.create', 'versements.read', 'versements.update', 'versements.delete',
      // Versements clients
      'versements-client.create', 'versements-client.read', 'versements-client.update', 'versements-client.delete',
      // Clients (lecture seule)
      'clients.read',
      // Fournisseurs (lecture seule)
      'fournisseurs.read',
    ],
  },
];

export async function seedPermissionsAndRoles(dataSource: DataSource) {
  const permissionRepository = dataSource.getRepository(Permission);
  const roleRepository = dataSource.getRepository(Role);

  console.log('🌱 Seed des permissions et rôles...');

  // 1. Créer toutes les permissions
  const permissionsMap = new Map<string, Permission>();

  for (const permData of basePermissions) {
    // Vérifier si la permission existe déjà
    let permission = await permissionRepository.findOne({
      where: { code: permData.code },
    });

    if (!permission) {
      permission = permissionRepository.create(permData);
      permission = await permissionRepository.save(permission);
      console.log(`  ✅ Permission créée: ${permission.code}`);
    } else {
      console.log(`  ⏭️  Permission existe déjà: ${permission.code}`);
    }

    permissionsMap.set(permission.code, permission);
  }

  const allPermissions = Array.from(permissionsMap.values());

  // 2. Créer tous les rôles
  for (const roleConfig of rolesConfig) {
    let role = await roleRepository.findOne({
      where: { nom: roleConfig.nom },
      relations: ['permissions'],
    });

    // Déterminer les permissions du rôle
    let rolePermissions: Permission[];
    if (roleConfig.permissions === 'ALL') {
      rolePermissions = allPermissions;
    } else {
      rolePermissions = (roleConfig.permissions as string[])
        .map(code => permissionsMap.get(code))
        .filter(p => p !== undefined) as Permission[];
    }

    if (!role) {
      role = roleRepository.create({
        nom: roleConfig.nom,
        description: roleConfig.description,
        actif: true,
        permissions: rolePermissions,
      });

      role = await roleRepository.save(role);
      console.log(`  ✅ Rôle ${role.nom} créé avec ${rolePermissions.length} permissions`);
    } else {
      // Mettre à jour les permissions du rôle
      role.description = roleConfig.description;
      role.permissions = rolePermissions;
      await roleRepository.save(role);
      console.log(`  ✅ Rôle ${role.nom} mis à jour avec ${rolePermissions.length} permissions`);
    }
  }

  console.log('✅ Seed terminé !');
  console.log(`📊 Total: ${allPermissions.length} permissions, ${rolesConfig.length} rôles`);
}
