import { ApiProperty } from '@nestjs/swagger';

export class ClientHistoriqueDto {
  @ApiProperty({ description: 'Statistiques globales du client' })
  stats: {
    totalAchats: number;
    totalPaye: number;
    detteActuelle: number;
    nombreVentes: number;
    nombrePaiements: number;
    beneficeTotal: number;
    dernierAchat?: string;
    dernierPaiement?: string;
  };

  @ApiProperty({ description: 'Liste des achats du client' })
  ventes: Array<{
    id: string;
    numero: string;
    date: string;
    total: number;
    montantPaye: number;
    montantRestant: number;
    modePaiement: string;
    benefice: number;
    lignes: Array<{
      articleNom: string;
      quantite: number;
      prixUnitaire: number;
      prixAchat: number;
      sousTotal: number;
      benefice: number;
    }>;
  }>;

  @ApiProperty({ description: 'Liste des paiements du client' })
  paiements: Array<{
    id: string;
    date: string;
    montant: number;
    modePaiement: string;
    reference?: string;
    venteNumero?: string;
    note?: string;
  }>;

  @ApiProperty({ description: 'Timeline combinée (achats + paiements triés par date)' })
  timeline: Array<{
    id: string;
    type: 'achat' | 'paiement';
    date: string;
    montant: number;
    description: string;
    reference?: string;
    benefice?: number;
  }>;
}
