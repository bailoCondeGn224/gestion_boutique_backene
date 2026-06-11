import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../stock/entities/article.entity';
import { Client } from '../clients/entities/client.entity';
import { Vente } from '../ventes/entities/vente.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Vente)
    private ventesRepository: Repository<Vente>,
    @InjectRepository(Fournisseur)
    private fournisseursRepository: Repository<Fournisseur>,
  ) {}

  async getDashboardStats(organizationId: string) {
    // Exécuter toutes les requêtes en parallèle pour optimiser les performances
    const [stockStats, fournisseursStats, ventesStats, clientsStats] = await Promise.all([
      this.getStockStats(organizationId),
      this.getFournisseursStats(organizationId),
      this.getVentesStats(organizationId),
      this.getClientsStats(organizationId),
    ]);

    return {
      stock: stockStats,
      fournisseurs: fournisseursStats,
      ventes: ventesStats,
      clients: clientsStats,
    };
  }

  private async getStockStats(organizationId: string) {
    const totalArticles = await this.articlesRepository.count({
      where: { organizationId },
    });

    const articlesEnRupture = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('article.stock = 0')
      .getCount();

    // Stock Faible : articles avec stock entre 1 et 5
    const articlesStockFaible = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('article.stock >= 1 AND article.stock <= 5')
      .getCount();

    const articlesEnAlerte = articlesEnRupture + articlesStockFaible;

    // Calcul de la valeur totale du stock
    const valeurResult = await this.articlesRepository
      .createQueryBuilder('article')
      .select('SUM(article.stock * article.prixAchat)', 'valeurTotale')
      .where('article.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .getRawOne();

    const valeurTotale = parseFloat(valeurResult?.valeurTotale || '0');

    return {
      valeurTotale,
      totalArticles,
      articlesEnAlerte,
      articlesEnRupture,
      articlesCritiques: articlesStockFaible, // Renommé mais garde le nom pour compatibilité frontend
    };
  }

  private async getFournisseursStats(organizationId: string) {
    const totalFournisseurs = await this.fournisseursRepository.count({
      where: { organizationId },
    });

    const totalActifs = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
      .where('fournisseur.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('fournisseur.statut = :statut', { statut: 'actif' })
      .getCount();

    const statsResult = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
      .select('SUM(fournisseur.totalAchats)', 'totalAchats')
      .addSelect('SUM(fournisseur.dette)', 'detteTotal')
      .addSelect('COUNT(CASE WHEN fournisseur.dette > 0 THEN 1 END)', 'nombreCreanciers')
      .where('fournisseur.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .getRawOne();

    return {
      totalActifs,
      totalFournisseurs,
      totalAchats: parseFloat(statsResult?.totalAchats || '0'),
      detteTotal: parseFloat(statsResult?.detteTotal || '0'),
      nombreCreanciers: parseInt(statsResult?.nombreCreanciers || '0', 10),
    };
  }

  private async getVentesStats(organizationId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Stats du jour
    const jourStats = await this.ventesRepository
      .createQueryBuilder('vente')
      .select('SUM(vente.total)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('vente.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('DATE(vente.date) = DATE(:today)', { today })
      .getRawOne();

    // Stats de la semaine
    const semaineStats = await this.ventesRepository
      .createQueryBuilder('vente')
      .select('SUM(vente.total)', 'total')
      .where('vente.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('vente.date >= :weekAgo', { weekAgo })
      .getRawOne();

    // Stats du mois
    const moisStats = await this.ventesRepository
      .createQueryBuilder('vente')
      .select('SUM(vente.total)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('vente.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('vente.date >= :monthStart', { monthStart })
      .getRawOne();

    return {
      totalJour: parseFloat(jourStats?.total || '0'),
      totalSemaine: parseFloat(semaineStats?.total || '0'),
      totalMois: parseFloat(moisStats?.total || '0'),
      nombreVentesJour: parseInt(jourStats?.count || '0', 10),
      nombreVentesMois: parseInt(moisStats?.count || '0', 10),
    };
  }

  private async getClientsStats(organizationId: string) {
    const total = await this.clientsRepository.count({
      where: { organizationId },
    });

    const statsResult = await this.clientsRepository
      .createQueryBuilder('client')
      .select('COUNT(CASE WHEN client.totalCredits > 0 THEN 1 END)', 'avecCredits')
      .addSelect('SUM(client.totalCredits)', 'totalCreditsEnCours')
      .where('client.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .getRawOne();

    return {
      total,
      avecCredits: parseInt(statsResult?.avecCredits || '0', 10),
      totalCreditsEnCours: parseFloat(statsResult?.totalCreditsEnCours || '0'),
    };
  }

  /**
   * Récupère les statistiques sur les produits expirés et expirant bientôt
   */
  async getExpirationStats(organizationId: string) {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    // Produits déjà expirés (avec stock > 0)
    const articlesExpires = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('article.dateExpiration IS NOT NULL')
      .andWhere('article.dateExpiration < :aujourdhui', { aujourdhui })
      .andWhere('article.stock > 0')
      .orderBy('article.dateExpiration', 'ASC')
      .getMany();

    // Produits qui expirent bientôt (dans les X jours définis par delaiAlerteExpiration)
    const articlesExpirantBientot = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('article.dateExpiration IS NOT NULL')
      .andWhere('article.dateExpiration >= :aujourdhui', { aujourdhui })
      .andWhere(
        `article.dateExpiration <= :aujourdhui::date + (article."delaiAlerteExpiration" || ' days')::interval`,
        { aujourdhui },
      )
      .andWhere('article.stock > 0')
      .orderBy('article.dateExpiration', 'ASC')
      .getMany();

    return {
      expires: articlesExpires.length,
      expirantBientot: articlesExpirantBientot.length,
      articlesExpires,
      articlesExpirantBientot,
    };
  }
}
