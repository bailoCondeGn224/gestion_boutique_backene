/**
 * Statuts possibles d'une commande client
 */
export enum StatutCommande {
  EN_ATTENTE = 'en_attente', // Commande passée, en attente de livraison
  LIVREE = 'livree',         // Transformée en vente et livrée
  ANNULEE = 'annulee',       // Annulée
}
