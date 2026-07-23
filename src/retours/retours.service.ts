import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateRetourClientDto } from './dto/create-retour-client.dto';
import { CreateRetourFournisseurDto } from './dto/create-retour-fournisseur.dto';
import { Vente, StatutVente } from '../ventes/entities/vente.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { Client } from '../clients/entities/client.entity';
import { Article } from '../stock/entities/article.entity';
import { RetourClient } from './entities/retour-client.entity';
import { LigneRetourClient } from './entities/ligne-retour-client.entity';
import { RetourFournisseur } from './entities/retour-fournisseur.entity';
import { LigneRetourFournisseur } from './entities/ligne-retour-fournisseur.entity';
import { Approvisionnement } from '../approvisionnements/entities/approvisionnement.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';
import { ModeRemboursement } from './enums/mode-remboursement.enum';
import { TypeMouvement, MotifMouvement } from '../mouvements-stock/entities/mouvement-stock.entity';
import { RetoursValidator } from '../validation/retours.validator';
import { createPaginatedResponse } from '../common/utils/pagination.util';

// Imports des nouveaux repositories
import { ArticleRepository } from '../stock/repositories/article.repository';
import { MouvementStockRepository } from '../mouvements-stock/repositories/mouvement-stock.repository';
import { ClientRepository } from '../clients/repositories/client.repository';
import { VenteRepository } from '../ventes/repositories/vente.repository';
import { TransactionRepository } from '../finances/repositories/transaction.repository';

/**
 * ============================================================================
 * SERVICE DE RETOURS CLIENTS - VERSION PROPRE
 * ============================================================================
 *
 * LOGIQUE MÉTIER DÉFINIE:
 *
 * Q1: RÉDUCTION DE LA VENTE (Option A)
 *    - La vente originale est modifiée (total réduit)
 *    - Les articles retournés sont retirés de la vente
 *    - Le stock augmente
 *
 * Q2: GESTION DES PAIEMENTS (Option C)
 *    - Si montant_retour ≤ dette: Réduire la dette uniquement, pas de remboursement cash
 *    - Si montant_retour > dette: Annuler toute la dette + rembourser le surplus
 *
 * Q3: RETOUR PARTIEL VS TOTAL
 *    - Cas 1 (partiel): Modifier la vente
 *    - Cas 2 (total): Marquer la vente comme ANNULEE
 *
 * Q4: MODE DE REMBOURSEMENT
 *    - Au choix: Mobile Money, Espèces, Crédit compte
 *
 * Q5: RÈGLES DE VALIDATION
 *    ✓ Prix retour = Prix vente (pas de modification)
 *    ✓ Quantité retournée ≤ Quantité vendue
 *    ✓ Montant total retour ≤ Montant total vente
 *    ✓ Les retours réduisent le totalAchats du client
 * ============================================================================
 */

interface CalculRetour {
  remboursementCash: number;
  creditAnnule: number;
  nouveauMontantPaye: number;
  nouveauMontantRestant: number;
  nouveauTotal: number;
  estRetourTotal: boolean;
}

@Injectable()
export class RetoursService {
  constructor(
    @InjectRepository(Vente)
    private venteRepo: Repository<Vente>,
    @InjectRepository(LigneVente)
    private ligneVenteRepo: Repository<LigneVente>,
    @InjectRepository(RetourClient)
    private retourClientRepo: Repository<RetourClient>,
    @InjectRepository(LigneRetourClient)
    private ligneRetourClientRepo: Repository<LigneRetourClient>,
    @InjectRepository(RetourFournisseur)
    private retourFournisseurRepo: Repository<RetourFournisseur>,
    @InjectRepository(LigneRetourFournisseur)
    private ligneRetourFournisseurRepo: Repository<LigneRetourFournisseur>,
    @InjectRepository(Approvisionnement)
    private approvisionnementRepo: Repository<Approvisionnement>,
    @InjectRepository(LigneApprovisionnement)
    private ligneApprovisionnementRepo: Repository<LigneApprovisionnement>,
    @InjectRepository(Fournisseur)
    private fournisseurRepo: Repository<Fournisseur>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(Article)
    private articleRepo: Repository<Article>,
    private dataSource: DataSource,
    private retoursValidator: RetoursValidator,
    // Nouveaux repositories custom
    private articleRepository: ArticleRepository,
    private mouvementStockRepository: MouvementStockRepository,
    private clientRepository: ClientRepository,
    private venteRepository: VenteRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  /**
   * ============================================================================
   * CRÉER UN RETOUR CLIENT
   * ============================================================================
   */
  async createRetourClient(
    dto: CreateRetourClientDto,
    organizationId: string,
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 DÉBUT DU RETOUR CLIENT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // ========================================================================
      // ÉTAPE 1: CHARGER ET VALIDER LA VENTE
      // ========================================================================
      const vente = await queryRunner.manager.findOne(Vente, {
        where: { id: dto.venteId, organizationId },
        relations: ['lignes'],
      });

      if (!vente) {
        throw new NotFoundException(`Vente ${dto.venteId} introuvable`);
      }

      if (vente.statut === StatutVente.ANNULEE) {
        throw new BadRequestException('Cette vente est déjà annulée');
      }

      console.log(`📋 Vente: ${vente.numero}`);
      console.log(`   Total: ${Number(vente.total).toLocaleString()} FG`);
      console.log(`   Montant payé: ${Number(vente.montantPaye).toLocaleString()} FG`);
      console.log(`   Dette restante: ${Number(vente.montantRestant).toLocaleString()} FG`);
      console.log(`   Nombre d'articles: ${vente.lignes.length}`);

      // ========================================================================
      // ÉTAPE 2: VALIDER LES QUANTITÉS ET PRIX
      // ========================================================================
      await this.retoursValidator.validateRetourClientQuantities(
        dto.venteId,
        dto.lignes,
        organizationId,
        queryRunner,
      );

      console.log(`\n🔍 Validation OK - Montant retour: ${dto.total.toLocaleString()} FG`);

      // ========================================================================
      // ÉTAPE 3: CALCULER LES NOUVEAUX MONTANTS (LOGIQUE Q2: Option C)
      // ========================================================================
      // Vérifier si c'est un retour TOTAL (toutes les quantités de tous les articles)
      // Un retour est total seulement si:
      // 1. Tous les articles de la vente sont retournés
      // 2. ET chaque article est retourné en totalité (quantite retournée >= quantite vendue)
      const estRetourTotal = vente.lignes.length === dto.lignes.length &&
        dto.lignes.every(ligneRetour => {
          const ligneVente = vente.lignes.find(lv => lv.articleId === ligneRetour.articleId);
          return ligneVente && ligneRetour.quantite >= ligneVente.quantite;
        });

      console.log(`\n📊 Type de retour: ${estRetourTotal ? 'TOTAL' : 'PARTIEL'}`);
      if (!estRetourTotal) {
        dto.lignes.forEach(ligneRetour => {
          const ligneVente = vente.lignes.find(lv => lv.articleId === ligneRetour.articleId);
          if (ligneVente) {
            console.log(`   - ${ligneRetour.nom}: retour ${ligneRetour.quantite}/${ligneVente.quantite}`);
          }
        });
      }

      const calcul = this.calculerMontantsRetour(
        Number(vente.total),
        Number(vente.montantPaye),
        Number(vente.montantRestant),
        dto.total,
        estRetourTotal,
      );

      this.afficherCalcul(calcul);

      // ========================================================================
      // ÉTAPE 4: METTRE À JOUR LE STOCK
      // ========================================================================
      console.log('\n📦 Mise à jour du stock:');

      for (const ligne of dto.lignes) {
        // Trouver la ligne de vente originale pour obtenir quantiteBase
        const ligneVente = vente.lignes.find(lv => lv.articleId === ligne.articleId);

        // Utiliser quantiteBase si disponible, sinon quantite
        // quantiteBase = quantité réelle en unités de stock (ex: 30 bouteilles)
        // quantite = nombre de modes vendus (ex: 3 casiers)
        const quantiteStock = ligneVente?.quantiteBase
          ? Math.round((ligne.quantite / ligneVente.quantite) * ligneVente.quantiteBase)
          : ligne.quantite;

        const stockAvant = await this.articleRepository.getStockActuel(
          ligne.articleId,
          organizationId,
          queryRunner,
        );

        await this.articleRepository.augmenterStock(
          ligne.articleId,
          quantiteStock,
          organizationId,
          queryRunner,
        );

        const stockApres = stockAvant + quantiteStock;

        await this.mouvementStockRepository.creerMouvementRetourClient(
          {
            articleId: ligne.articleId,
            articleNom: ligne.nom,
            type: TypeMouvement.ENTREE,
            motif: MotifMouvement.RETOUR_CLIENT,
            quantite: quantiteStock,
            stockAvant,
            stockApres,
            prixUnitaire: ligne.prixUnitaire,
            valeurTotal: ligne.sousTotal,
            userId: dto.userId,
            userNom: dto.userNom,
            venteId: dto.venteId,
            reference: '', // Sera mis à jour après
            note: ligne.noteArticle || dto.note,
          },
          organizationId,
          queryRunner,
        );

        console.log(`   ✓ ${ligne.nom}: ${stockAvant} → ${stockApres} (+${quantiteStock} unités)`);
      }

      // ========================================================================
      // ÉTAPE 5: MODIFIER LA VENTE (LOGIQUE Q3)
      // ========================================================================
      if (calcul.estRetourTotal) {
        // CAS 2: RETOUR TOTAL → Marquer comme ANNULEE
        await this.venteRepository.marquerCommeAnnulee(
          dto.venteId,
          organizationId,
          queryRunner,
        );

        // Supprimer toutes les lignes
        await queryRunner.manager.delete(LigneVente, { venteId: dto.venteId });

        console.log('\n🚫 Vente marquée comme ANNULÉE (retour total)');
      } else {
        // CAS 1: RETOUR PARTIEL → Modifier la vente
        for (const ligne of dto.lignes) {
          const ligneVente = vente.lignes.find(lv => lv.articleId === ligne.articleId);

          if (ligneVente) {
            const nouvelleQte = ligneVente.quantite - ligne.quantite;

            if (nouvelleQte <= 0) {
              await queryRunner.manager.delete(LigneVente, ligneVente.id);
              console.log(`   ✓ Ligne supprimée: ${ligne.nom}`);
            } else {
              // Calculer la nouvelle quantiteBase proportionnellement
              let nouvelleQteBase = nouvelleQte;
              if (ligneVente.quantiteBase && ligneVente.quantite > 0) {
                const ratio = ligneVente.quantiteBase / ligneVente.quantite;
                nouvelleQteBase = Math.round(nouvelleQte * ratio);
              }

              await queryRunner.manager.update(LigneVente, ligneVente.id, {
                quantite: nouvelleQte,
                quantiteBase: nouvelleQteBase,
                sousTotal: nouvelleQte * Number(ligneVente.prixUnitaire),
              });
              console.log(`   ✓ Ligne mise à jour: ${ligne.nom} → ${nouvelleQte} (${nouvelleQteBase} unités)`);
            }
          }
        }

        await this.venteRepository.updateMontantsApresRetour(
          dto.venteId,
          calcul.nouveauTotal,
          calcul.nouveauMontantPaye,
          calcul.nouveauMontantRestant,
          organizationId,
          queryRunner,
        );

        console.log('\n✏️ Vente mise à jour (retour partiel)');
      }

      // ========================================================================
      // ÉTAPE 6: CRÉER LE RETOUR CLIENT
      // ========================================================================
      const numeroRetour = await this.genererNumeroRetour(organizationId, queryRunner);

      const retourClient = queryRunner.manager.create(RetourClient, {
        numero: numeroRetour,
        venteId: dto.venteId,
        venteNumero: vente.numero,
        clientId: vente.clientId,
        clientNom: vente.nom || null,
        total: dto.total,
        modeRemboursement: dto.modeRemboursement,
        montantRembourse: calcul.remboursementCash,
        date: new Date(),
        note: dto.note,
        userId: dto.userId,
        userNom: dto.userNom,
        organizationId,
      });

      const savedRetour = await queryRunner.manager.save(RetourClient, retourClient);

      // Créer les lignes avec les infos du mode de vente original
      for (const ligneData of dto.lignes) {
        // Trouver la ligne de vente originale pour obtenir modeVenteId et quantiteBase
        const ligneVente = vente.lignes.find(lv => lv.articleId === ligneData.articleId);

        // Calculer quantiteBase pour cette ligne de retour
        const quantiteBase = ligneVente?.quantiteBase
          ? Math.round((ligneData.quantite / ligneVente.quantite) * ligneVente.quantiteBase)
          : ligneData.quantite;

        const ligne = queryRunner.manager.create(LigneRetourClient, {
          retourClientId: savedRetour.id,
          articleId: ligneData.articleId,
          nom: ligneData.nom,
          quantite: ligneData.quantite,
          quantiteBase: quantiteBase,
          modeVenteId: ligneVente?.modeVenteId || null,
          prixUnitaire: ligneData.prixUnitaire,
          sousTotal: ligneData.sousTotal,
          raison: ligneData.raison,
          noteArticle: ligneData.noteArticle,
          organizationId,
        });
        await queryRunner.manager.save(LigneRetourClient, ligne);
      }

      // Mettre à jour les références dans les mouvements
      await this.mouvementStockRepository.updateReference(
        dto.venteId,
        numeroRetour,
        organizationId,
        queryRunner,
      );

      console.log(`\n📄 Retour ${numeroRetour} créé avec succès`);

      // ========================================================================
      // ÉTAPE 7: METTRE À JOUR LES FINANCES DU CLIENT (RÈGLE Q5)
      // ========================================================================
      if (vente.clientId) {
        await this.clientRepository.updateFinancesApresRetour(
          vente.clientId,
          dto.total, // Réduction totalAchats
          calcul.creditAnnule, // Réduction totalCredits
          organizationId,
          queryRunner,
        );

        console.log(`\n👤 Finances client mises à jour:`);
        console.log(`   Réduction totalAchats: -${dto.total.toLocaleString()} FG`);
        console.log(`   Réduction totalCredits: -${calcul.creditAnnule.toLocaleString()} FG`);
      }

      // ========================================================================
      // ÉTAPE 8: CRÉER LA TRANSACTION DE REMBOURSEMENT (SI CASH)
      // ========================================================================
      if (
        calcul.remboursementCash > 0 &&
        dto.modeRemboursement !== ModeRemboursement.CREDIT_COMPTE
      ) {
        await this.transactionRepository.creerRemboursementRetourClient(
          {
            description: `Remboursement retour ${numeroRetour} - Vente ${vente.numero}`,
            montant: calcul.remboursementCash,
            venteId: dto.venteId,
          },
          organizationId,
          queryRunner,
        );

        console.log(`\n💰 Transaction créée: ${calcul.remboursementCash.toLocaleString()} FG (${dto.modeRemboursement})`);
      }

      await queryRunner.commitTransaction();

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ RETOUR CLIENT TERMINÉ AVEC SUCCÈS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return {
        retourId: savedRetour.id,
        numeroRetour,
        venteAnnulee: calcul.estRetourTotal,
        montantRembourseCash: calcul.remboursementCash,
        montantCreditAnnule: calcul.creditAnnule,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('\n❌ ERREUR:', error.message, '\n');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ============================================================================
   * CALCULER LES MONTANTS DU RETOUR (LOGIQUE Q2: OPTION C)
   * ============================================================================
   *
   * RÈGLE C:
   * - Si montant_retour ≤ dette: Réduire la dette uniquement, pas de cash
   * - Si montant_retour > dette: Annuler la dette + rembourser le surplus en cash
   */
  private calculerMontantsRetour(
    ancienTotal: number,
    ancienMontantPaye: number,
    ancienneDette: number,
    montantRetour: number,
    estRetourTotal: boolean,
  ): CalculRetour {
    // Validation de base
    if (montantRetour > ancienTotal) {
      throw new BadRequestException(
        `Le montant du retour (${montantRetour} FG) ne peut pas dépasser ` +
        `le total de la vente (${ancienTotal} FG)`,
      );
    }

    if (estRetourTotal) {
      // RETOUR TOTAL: tout est remboursé/annulé
      return {
        remboursementCash: ancienMontantPaye,
        creditAnnule: ancienneDette,
        nouveauMontantPaye: 0,
        nouveauMontantRestant: 0,
        nouveauTotal: 0,
        estRetourTotal: true,
      };
    }

    // RETOUR PARTIEL
    const nouveauTotal = ancienTotal - montantRetour;
    let remboursementCash: number;
    let creditAnnule: number;
    let nouveauMontantPaye: number;
    let nouveauMontantRestant: number;

    if (montantRetour <= ancienneDette) {
      // CAS 1: Le retour est ≤ à la dette
      // → Réduire seulement la dette, pas de remboursement cash
      remboursementCash = 0;
      creditAnnule = montantRetour;
      nouveauMontantPaye = ancienMontantPaye; // Inchangé
      nouveauMontantRestant = ancienneDette - creditAnnule;
    } else {
      // CAS 2: Le retour dépasse la dette
      // → Annuler toute la dette + rembourser le surplus en cash
      creditAnnule = ancienneDette;
      remboursementCash = montantRetour - creditAnnule;
      nouveauMontantPaye = ancienMontantPaye - remboursementCash;
      nouveauMontantRestant = 0;
    }

    // Validation arithmétique
    const somme = nouveauMontantPaye + nouveauMontantRestant;
    if (Math.abs(somme - nouveauTotal) > 0.01) {
      throw new BadRequestException(
        `Incohérence: total (${nouveauTotal}) ≠ payé (${nouveauMontantPaye}) + restant (${nouveauMontantRestant})`
      );
    }

    if (nouveauMontantPaye < -0.01 || nouveauMontantRestant < -0.01) {
      throw new BadRequestException(
        `Données de vente incohérentes:\n` +
        `- Total vente: ${ancienTotal} FG\n` +
        `- Montant payé: ${ancienMontantPaye} FG\n` +
        `- Dette: ${ancienneDette} FG\n` +
        `- Montant retour: ${montantRetour} FG\n\n` +
        `Le calcul donnerait un montant payé négatif (${nouveauMontantPaye} FG).\n` +
        `Vérifiez les données de la vente originale.`
      );
    }

    return {
      remboursementCash: Math.max(0, remboursementCash),
      creditAnnule,
      nouveauMontantPaye: Math.max(0, nouveauMontantPaye),
      nouveauMontantRestant: Math.max(0, nouveauMontantRestant),
      nouveauTotal,
      estRetourTotal: false,
    };
  }

  /**
   * Afficher le calcul pour debug
   */
  private afficherCalcul(calcul: CalculRetour): void {
    console.log('\n💡 CALCUL DES MONTANTS:');
    console.log(`   Type: ${calcul.estRetourTotal ? 'RETOUR TOTAL' : 'RETOUR PARTIEL'}`);

    if (calcul.estRetourTotal) {
      console.log(`   → Remboursement cash: ${calcul.remboursementCash.toLocaleString()} FG`);
      console.log(`   → Crédit annulé: ${calcul.creditAnnule.toLocaleString()} FG`);
    } else {
      console.log(`   → Remboursement cash: ${calcul.remboursementCash.toLocaleString()} FG`);
      console.log(`   → Crédit annulé: ${calcul.creditAnnule.toLocaleString()} FG`);
      console.log(`   → Nouveau total vente: ${calcul.nouveauTotal.toLocaleString()} FG`);
      console.log(`   → Nouveau montant payé: ${calcul.nouveauMontantPaye.toLocaleString()} FG`);
      console.log(`   → Nouvelle dette: ${calcul.nouveauMontantRestant.toLocaleString()} FG`);
    }
  }

  /**
   * Générer un numéro de retour (RC-001, RC-002...)
   */
  private async genererNumeroRetour(
    organizationId: string,
    queryRunner: any,
  ): Promise<string> {
    const lastRetour = await queryRunner.manager.findOne(RetourClient, {
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    let nextNumber = 1;
    if (lastRetour?.numero) {
      const match = lastRetour.numero.match(/RC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `RC-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Récupérer l'historique des retours clients
   */
  async getRetoursClients(
    organizationId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.retourClientRepo.findAndCount({
      where: { organizationId },
      relations: ['lignes', 'lignes.modeVente'],
      order: { date: 'DESC', createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Détails d'un retour client
   */
  async getRetourClient(id: string, organizationId: string) {
    const retour = await this.retourClientRepo.findOne({
      where: { id, organizationId },
      relations: ['lignes', 'lignes.modeVente'],
    });

    if (!retour) {
      throw new NotFoundException('Retour client non trouvé');
    }

    return retour;
  }

  /**
   * Récupérer les retours d'une vente spécifique
   */
  async getRetoursByVente(venteId: string, organizationId: string) {
    const retours = await this.retourClientRepo.find({
      where: { venteId, organizationId },
      relations: ['lignes', 'lignes.modeVente'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    return retours;
  }

  /**
   * Statistiques des retours clients
   */
  async getStatsRetoursClients(organizationId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'totalRetours')
      .addSelect('SUM(rc.total)', 'montantTotal')
      .from('retour_client', 'rc')
      .where('rc."organizationId" = :organizationId', { organizationId })
      .getRawOne();

    const currentMonth = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .addSelect('SUM(rc.total)', 'montant')
      .from('retour_client', 'rc')
      .where('rc."organizationId" = :organizationId', { organizationId })
      .andWhere('EXTRACT(MONTH FROM rc.date) = EXTRACT(MONTH FROM CURRENT_DATE)')
      .andWhere('EXTRACT(YEAR FROM rc.date) = EXTRACT(YEAR FROM CURRENT_DATE)')
      .getRawOne();

    return {
      totalRetours: parseInt(result.totalRetours) || 0,
      montantTotal: parseFloat(result.montantTotal) || 0,
      retoursCeMois: parseInt(currentMonth.count) || 0,
      montantCeMois: parseFloat(currentMonth.montant) || 0,
    };
  }

  async getRetoursFournisseurs(organizationId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.retourFournisseurRepo.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async getStatsRetoursFournisseurs(organizationId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'totalRetours')
      .addSelect('SUM(rf.total)', 'montantTotal')
      .addSelect('SUM(rf."montantRembourse")', 'montantRembourse')
      .from('retour_fournisseur', 'rf')
      .where('rf."organizationId" = :organizationId', { organizationId })
      .getRawOne();

    const currentMonth = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('retour_fournisseur', 'rf')
      .where('rf."organizationId" = :organizationId', { organizationId })
      .andWhere('EXTRACT(MONTH FROM rf.date) = EXTRACT(MONTH FROM CURRENT_DATE)')
      .andWhere('EXTRACT(YEAR FROM rf.date) = EXTRACT(YEAR FROM CURRENT_DATE)')
      .getRawOne();

    return {
      totalRetours: parseInt(result.totalRetours) || 0,
      montantTotal: parseFloat(result.montantTotal) || 0,
      retoursCeMois: parseInt(currentMonth.count) || 0,
      montantRembourse: parseFloat(result.montantRembourse) || 0,
    };
  }

  /**
   * ============================================================================
   * CRÉER UN RETOUR FOURNISSEUR
   * ============================================================================
   *
   * Logique:
   * 1. Valider que l'approvisionnement existe
   * 2. Valider les quantités retournées (≤ quantités approvisionnées)
   * 3. Diminuer le stock des articles retournés
   * 4. Créer le retour fournisseur avec ses lignes
   * 5. Enregistrer les mouvements de stock (sortie)
   */
  async createRetourFournisseur(
    dto: CreateRetourFournisseurDto,
    organizationId: string,
  ): Promise<RetourFournisseur> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ÉTAPE 1: RÉCUPÉRER ET VALIDER L'APPROVISIONNEMENT
      const approvisionnement = await this.approvisionnementRepo.findOne({
        where: { id: dto.approvisionnementId, organizationId },
        relations: ['lignes'],
      });

      if (!approvisionnement) {
        throw new NotFoundException('Approvisionnement introuvable');
      }

      // ÉTAPE 2: VALIDER LES LIGNES DU RETOUR

      for (const ligneRetour of dto.lignes) {
        const ligneAppro = approvisionnement.lignes.find(
          l => l.articleId === ligneRetour.articleId
        );

        if (!ligneAppro) {
          throw new BadRequestException(
            `L'article ${ligneRetour.nom} n'existe pas dans cet approvisionnement`
          );
        }

        // Calculer la quantité disponible pour retour (total - déjà retourné)
        const quantiteAppro = ligneAppro.quantiteUnites || ligneAppro.quantite;
        const quantiteDejaRetournee = ligneAppro.quantiteRetournee || 0;
        const quantiteDisponible = quantiteAppro - quantiteDejaRetournee;

        if (ligneRetour.quantite > quantiteDisponible) {
          throw new BadRequestException(
            `La quantité retournée (${ligneRetour.quantite}) pour ${ligneRetour.nom} ` +
            `dépasse la quantité disponible (${quantiteDisponible}). ` +
            `Déjà retourné: ${quantiteDejaRetournee}/${quantiteAppro}`
          );
        }

        // Vérifier le stock disponible
        const article = await this.articleRepo.findOne({
          where: { id: ligneRetour.articleId, organizationId },
        });

        if (!article || article.stock < ligneRetour.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${ligneRetour.nom}. ` +
            `Stock actuel: ${article?.stock || 0}, Retour demandé: ${ligneRetour.quantite}`
          );
        }

      }

      // ÉTAPE 3: GÉNÉRER LE NUMÉRO DE RETOUR
      const lastRetour = await this.retourFournisseurRepo
        .createQueryBuilder('rf')
        .where('rf.organizationId = :organizationId', { organizationId })
        .orderBy('rf.createdAt', 'DESC')
        .getOne();

      let nextNumber = 1;
      if (lastRetour?.numero) {
        const match = lastRetour.numero.match(/RF-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const numero = `RF-${String(nextNumber).padStart(3, '0')}`;

      // ÉTAPE 4: DIMINUER LE STOCK ET CRÉER LES MOUVEMENTS

      for (const ligne of dto.lignes) {
        const stockAvant = await this.articleRepository.getStockActuel(
          ligne.articleId,
          organizationId,
          queryRunner,
        );

        // Diminuer le stock
        await this.articleRepository.diminuerStock(
          ligne.articleId,
          ligne.quantite,
          organizationId,
          queryRunner,
        );

        const stockApres = stockAvant - ligne.quantite;

        // Créer le mouvement de stock (sortie) via le repository
        await this.mouvementStockRepository.creerMouvementRetourFournisseur(
          {
            articleId: ligne.articleId,
            articleNom: ligne.nom,
            type: TypeMouvement.SORTIE,
            motif: MotifMouvement.RETOUR_FOURNISSEUR,
            quantite: ligne.quantite,
            stockAvant,
            stockApres,
            prixUnitaire: ligne.prixUnitaire,
            valeurTotal: ligne.sousTotal,
            userId: dto.userId,
            userNom: dto.userNom,
            approvisionnementId: dto.approvisionnementId,
            reference: numero,
            note: dto.note || `Retour fournisseur - ${ligne.raison || 'Non spécifié'}`,
          },
          organizationId,
          queryRunner,
        );

      }

      // ÉTAPE 5: CRÉER LE RETOUR FOURNISSEUR
      const retourFournisseur = this.retourFournisseurRepo.create({
        numero,
        approvisionnementId: dto.approvisionnementId,
        approvisionnementNumero: approvisionnement.numero,
        fournisseurId: approvisionnement.fournisseurId,
        fournisseurNom: approvisionnement.fournisseurNom,
        total: dto.total,
        remboursementRecu: dto.remboursementRecu || false,
        montantRembourse: dto.montantRembourse || 0,
        date: new Date(),
        note: dto.note,
        userId: dto.userId,
        userNom: dto.userNom,
        organizationId,
      });

      const savedRetour = await queryRunner.manager.save(retourFournisseur);

      // ÉTAPE 6: CRÉER LES LIGNES DU RETOUR
      for (const ligne of dto.lignes) {
        const ligneRetour = this.ligneRetourFournisseurRepo.create({
          retourFournisseurId: savedRetour.id,
          articleId: ligne.articleId,
          nom: ligne.nom,
          quantite: ligne.quantite,
          quantiteBase: ligne.quantite, // Pour l'instant, même valeur
          prixUnitaire: ligne.prixUnitaire,
          sousTotal: ligne.sousTotal,
          raison: ligne.raison,
          noteArticle: ligne.noteArticle,
          organizationId,
        });

        await queryRunner.manager.save(ligneRetour);

        // Mettre à jour la ligne d'approvisionnement (comme retour client modifie ligne vente)
        const ligneAppro = approvisionnement.lignes.find(l => l.articleId === ligne.articleId);
        if (ligneAppro) {
          const nouvelleQte = ligneAppro.quantite - ligne.quantite;
          const nouveauSousTotal = nouvelleQte * Number(ligneAppro.prixUnitaire);
          const nouvelleQteRetournee = (ligneAppro.quantiteRetournee || 0) + ligne.quantite;

          await queryRunner.manager.query(
            `UPDATE ligne_approvisionnement
             SET quantite = $1, "sousTotal" = $2, "quantiteRetournee" = $3
             WHERE id = $4`,
            [nouvelleQte, nouveauSousTotal, nouvelleQteRetournee, ligneAppro.id]
          );
        }
      }

      // ÉTAPE 7: METTRE À JOUR L'APPROVISIONNEMENT
      const ancienMontantRestant = Number(approvisionnement.montantRestant || 0);
      const nouveauMontantRestant = Math.max(0, ancienMontantRestant - dto.total);

      await queryRunner.manager.query(
        `UPDATE approvisionnement SET "montantRestant" = $1, total = total - $2 WHERE id = $3`,
        [nouveauMontantRestant, dto.total, dto.approvisionnementId]
      );

      // ÉTAPE 8: METTRE À JOUR LES FINANCES DU FOURNISSEUR
      if (approvisionnement.fournisseurId) {
        const fournisseur = await queryRunner.manager.findOne(Fournisseur, {
          where: { id: approvisionnement.fournisseurId, organizationId },
        });

        if (fournisseur) {
          const ancienTotalAchats = Number(fournisseur.totalAchats || 0);
          const ancienneDette = Number(fournisseur.dette || 0);
          const nouveauTotalAchats = Math.max(0, ancienTotalAchats - dto.total);
          const nouvelleDette = ancienneDette - dto.total;

          await queryRunner.manager.query(
            `UPDATE fournisseur SET "totalAchats" = $1, dette = $2 WHERE id = $3`,
            [nouveauTotalAchats, nouvelleDette, fournisseur.id]
          );
        }
      }

      await queryRunner.commitTransaction();

      console.log(`✅ Retour fournisseur ${numero} créé - Montant: ${dto.total.toLocaleString()} FG`);

      // Récupérer le retour complet avec les lignes
      return this.retourFournisseurRepo.findOne({
        where: { id: savedRetour.id, organizationId },
        relations: ['lignes'],
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Erreur lors du retour fournisseur:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Récupérer un retour fournisseur par ID
   */
  async getRetourFournisseur(id: string, organizationId: string): Promise<RetourFournisseur> {
    const retour = await this.retourFournisseurRepo.findOne({
      where: { id, organizationId },
      relations: ['lignes'],
    });

    if (!retour) {
      throw new NotFoundException('Retour fournisseur introuvable');
    }

    return retour;
  }

  /**
   * Récupérer les retours fournisseurs par approvisionnement
   */
  async getRetoursByApprovisionnement(
    approvisionnementId: string,
    organizationId: string,
  ): Promise<RetourFournisseur[]> {
    return this.retourFournisseurRepo.find({
      where: { approvisionnementId, organizationId },
      relations: ['lignes'],
      order: { createdAt: 'DESC' },
    });
  }
}
