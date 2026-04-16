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

  async getDashboardStats() {
    // Exécuter toutes les requêtes en parallèle pour optimiser les performances
    const [stockStats, fournisseursStats, ventesStats, clientsStats] = await Promise.all([
      this.getStockStats(),
      this.getFournisseursStats(),
      this.getVentesStats(),
      this.getClientsStats(),
    ]);

    return {
      stock: stockStats,
      fournisseurs: fournisseursStats,
      ventes: ventesStats,
      clients: clientsStats,
    };
  }

  private async getStockStats() {
    const totalArticles = await this.articlesRepository.count();

    const articlesEnRupture = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.stock = 0')
      .getCount();

    // Stock Faible : articles avec stock entre 1 et 5
    const articlesStockFaible = await this.articlesRepository
      .createQueryBuilder('article')
      .where('article.stock >= 1 AND article.stock <= 5')
      .getCount();

    const articlesEnAlerte = articlesEnRupture + articlesStockFaible;

    // Calcul de la valeur totale du stock
    const valeurResult = await this.articlesRepository
      .createQueryBuilder('article')
      .select('SUM(article.stock * article.prixAchat)', 'valeurTotale')
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

  private async getFournisseursStats() {
    const totalFournisseurs = await this.fournisseursRepository.count();

    const totalActifs = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
      .where('fournisseur.statut = :statut', { statut: 'actif' })
      .getCount();

    const statsResult = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
      .select('SUM(fournisseur.totalAchats)', 'totalAchats')
      .addSelect('SUM(fournisseur.dette)', 'detteTotal')
      .addSelect('COUNT(CASE WHEN fournisseur.dette > 0 THEN 1 END)', 'nombreCreanciers')
      .getRawOne();

    return {
      totalActifs,
      totalFournisseurs,
      totalAchats: parseFloat(statsResult?.totalAchats || '0'),
      detteTotal: parseFloat(statsResult?.detteTotal || '0'),
      nombreCreanciers: parseInt(statsResult?.nombreCreanciers || '0', 10),
    };
  }

  private async getVentesStats() {
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
      .where('DATE(vente.date) = DATE(:today)', { today })
      .getRawOne();

    // Stats de la semaine
    const semaineStats = await this.ventesRepository
      .createQueryBuilder('vente')
      .select('SUM(vente.total)', 'total')
      .where('vente.date >= :weekAgo', { weekAgo })
      .getRawOne();

    // Stats du mois
    const moisStats = await this.ventesRepository
      .createQueryBuilder('vente')
      .select('SUM(vente.total)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('vente.date >= :monthStart', { monthStart })
      .getRawOne();

    return {
      totalJour: parseFloat(jourStats?.total || '0'),
      totalSemaine: parseFloat(semaineStats?.total || '0'),
      totalMois: parseFloat(moisStats?.total || '0'),
      nombreVentesJour: parseInt(jourStats?.count || '0', 10),
      nombreVentesMois: parseInt(moisStats?.count || '0', 10),
    };
  }

  private async getClientsStats() {
    const total = await this.clientsRepository.count();

    const statsResult = await this.clientsRepository
      .createQueryBuilder('client')
      .select('COUNT(CASE WHEN client.totalCredits > 0 THEN 1 END)', 'avecCredits')
      .addSelect('SUM(client.totalCredits)', 'totalCreditsEnCours')
      .getRawOne();

    return {
      total,
      avecCredits: parseInt(statsResult?.avecCredits || '0', 10),
      totalCreditsEnCours: parseFloat(statsResult?.totalCreditsEnCours || '0'),
    };
  }
}
