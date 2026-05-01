import { MouvementStock } from '../../mouvements-stock/entities/mouvement-stock.entity';

export interface StockUpdate {
  articleId: string;
  articleNom: string;
  stockAvant: number;
  stockApres: number;
}

export interface RetourClientResponse {
  mouvements: MouvementStock[];
  updatedStock: StockUpdate[];
  financialSummary: {
    totalRembourse: number;
    modeRemboursement: string;
    clientId?: string;
    clientUpdated: boolean;
    nouveauTotalAchats?: number;
    nouveauTotalCredits?: number;
  };
}

export interface RetourFournisseurResponse {
  mouvements: MouvementStock[];
  updatedStock: StockUpdate[];
  financialSummary: {
    totalRetourne: number;
    fournisseurId: string;
    fournisseurUpdated: boolean;
    nouveauTotalAchats: number;
    nouvelleDette: number;
    remboursementRecu: boolean;
    montantRembourse?: number;
  };
}
