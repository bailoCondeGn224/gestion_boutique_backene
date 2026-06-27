import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ZakatCalculation } from './entities/zakat-calculation.entity';
import { ZakatSettings } from './entities/zakat-settings.entity';
import { CreateZakatDto } from './dto/create-zakat.dto';
import { UpdateZakatDto } from './dto/update-zakat.dto';
import { ZakatStatus, IrrigationType } from './enums/zakat-status.enum';
import { MetalPricesService } from './metal-prices.service';

// Constantes islamiques
const NISAB_AGRICOLE_KG = 653; // 5 wasq ≈ 653 kg
const HAWL_JOURS = 354; // Année lunaire en jours
const NISAB_OVINS = 40; // Minimum ovins/caprins
const NISAB_BOVINS = 30; // Minimum bovins
const NISAB_CHAMEAUX = 5; // Minimum chameaux

@Injectable()
export class ZakatService {
  constructor(
    @InjectRepository(ZakatCalculation)
    private zakatRepository: Repository<ZakatCalculation>,
    private metalPricesService: MetalPricesService,
    private dataSource: DataSource,
  ) {}

  /**
   * Créer et calculer une nouvelle Zakat
   */
  async create(
    createZakatDto: CreateZakatDto,
    organizationId: string,
    userId: string,
  ): Promise<ZakatCalculation> {
    // Récupérer les paramètres (prix or, argent, nisab, prix bétail)
    const settings = await this.metalPricesService.getOrCreateSettings(organizationId);

    // Créer l'entité
    const zakat = this.zakatRepository.create({
      organizationId,
      userId,
      dateCalcul: new Date(),
      annee: new Date().getFullYear(),
      ...createZakatDto,
    });

    // Stocker les prix utilisés au moment du calcul
    zakat.orPrixGramme = settings.prixOrGrammeGnf;
    zakat.argentPrixGramme = settings.prixArgentGrammeGnf;

    // Effectuer tous les calculs
    this.calculateAll(zakat, settings);

    return this.zakatRepository.save(zakat);
  }

  /**
   * Vérifier si le Hawl (année lunaire) est complet
   */
  private checkHawlComplete(dateAtteinteNisab: Date | string | null): boolean {
    if (!dateAtteinteNisab) return false;

    const dateNisab = new Date(dateAtteinteNisab);
    const today = new Date();
    const diffTime = today.getTime() - dateNisab.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= HAWL_JOURS;
  }

  /**
   * Effectuer tous les calculs de Zakat
   */
  private calculateAll(zakat: ZakatCalculation, settings: ZakatSettings): void {
    // 1. Vérifier le Hawl
    zakat.hawlComplete = this.checkHawlComplete(zakat.dateAtteinteNisab);

    // 2. Total Liquidités
    zakat.totalLiquidites = this.toNumber(zakat.cashMaison) +
      this.toNumber(zakat.cashBanque) +
      this.toNumber(zakat.cashMobile);

    // 3. Total Or et Argent (poids × prix/gramme)
    // Si orInclureBijoux est false, on ne compte pas l'or (bijoux personnels non zakatable selon certains avis)
    const orZakatable = zakat.orInclureBijoux !== false ? this.toNumber(zakat.orPoids) : 0;
    zakat.totalOrArgent =
      (orZakatable * this.toNumber(settings.prixOrGrammeGnf)) +
      (this.toNumber(zakat.argentPoids) * this.toNumber(settings.prixArgentGrammeGnf));

    // 4. Total Investissements
    zakat.totalInvestissements = this.toNumber(zakat.investActions) +
      this.toNumber(zakat.investImmobilier) +
      this.toNumber(zakat.investAutres);

    // 5. Total Commerce
    zakat.totalCommerce = this.toNumber(zakat.comStockValeur) +
      this.toNumber(zakat.comCreances) +
      this.toNumber(zakat.comLiquidites);

    // 6. Total Actifs (hors agriculture et bétail qui ont leur propre zakat)
    zakat.totalActifs = zakat.totalLiquidites +
      zakat.totalOrArgent +
      zakat.totalInvestissements +
      zakat.totalCommerce;

    // 7. Total Dettes
    zakat.totalDettes = this.toNumber(zakat.dettesPersonnelles) +
      this.toNumber(zakat.dettesFournisseurs);

    // 8. Montant Zakatable (actifs - dettes)
    zakat.montantZakatable = Math.max(0, zakat.totalActifs - zakat.totalDettes);

    // 9. Nisab et assujettissement
    zakat.nisabUtilise = this.toNumber(settings.nisabGnf);

    // Assujetti si: montant >= nisab ET hawl complet (ou première année)
    const atteintNisab = zakat.montantZakatable >= zakat.nisabUtilise;
    zakat.assujetti = atteintNisab && (zakat.hawlComplete || !zakat.dateAtteinteNisab);

    // 10. Calcul Zakat al-Mal (2.5% si assujetti)
    zakat.zakatMal = zakat.assujetti ? zakat.montantZakatable * 0.025 : 0;

    // 11. Calcul Zakat Agriculture (si checkbox cochée)
    zakat.zakatAgriculture = this.calculateZakatAgriculture(zakat);

    // 12. Calcul Zakat Bétail (si checkbox cochée)
    zakat.zakatBetail = this.calculateZakatBetail(zakat, settings);

    // 13. Total Zakat
    zakat.zakatTotal = zakat.zakatMal + zakat.zakatAgriculture + zakat.zakatBetail;

    // 14. Statut
    zakat.statut = ZakatStatus.CALCULE;
  }

  /**
   * Calcul Zakat sur l'agriculture
   * - Seulement si hasAgriculture = true
   * - Seulement si quantité >= 653 kg (nisab agricole)
   * - 10% si irrigué par pluie naturelle
   * - 5% si irrigué artificiellement
   * - 7.5% si mixte
   */
  private calculateZakatAgriculture(zakat: ZakatCalculation): number {
    // Vérifier si l'utilisateur a coché "J'ai des activités agricoles"
    if (!zakat.hasAgriculture) {
      return 0;
    }

    const quantiteKg = this.toNumber(zakat.agriQuantiteKg);
    const valeur = this.toNumber(zakat.agriValeurRecolte);

    // Vérifier le nisab agricole (653 kg minimum)
    if (quantiteKg < NISAB_AGRICOLE_KG) {
      return 0;
    }

    if (valeur <= 0 || zakat.agriIrrigation === IrrigationType.AUCUN) {
      return 0;
    }

    let taux: number;
    switch (zakat.agriIrrigation) {
      case IrrigationType.PLUIE:
        taux = 0.10; // 10%
        break;
      case IrrigationType.ARTIFICIEL:
        taux = 0.05; // 5%
        break;
      case IrrigationType.MIXTE:
        taux = 0.075; // 7.5%
        break;
      default:
        taux = 0;
    }

    return valeur * taux;
  }

  /**
   * Calcul Zakat sur le bétail selon les règles islamiques
   * - Seulement si hasBetail = true
   * - Utilise les prix configurés dans les settings
   */
  private calculateZakatBetail(zakat: ZakatCalculation, settings: ZakatSettings): number {
    // Vérifier si l'utilisateur a coché "J'ai du bétail"
    if (!zakat.hasBetail) {
      return 0;
    }

    let total = 0;

    // Zakat sur les ovins/caprins (moutons et chèvres)
    const ovinsCaprins = this.toNumber(zakat.betailOvins) + this.toNumber(zakat.betailCaprins);
    total += this.calculateZakatOvinsCaprins(ovinsCaprins, settings);

    // Zakat sur les bovins
    total += this.calculateZakatBovins(this.toNumber(zakat.betailBovins), settings);

    // Zakat sur les chameaux
    total += this.calculateZakatChameaux(this.toNumber(zakat.betailChameaux), settings);

    return total;
  }

  /**
   * Barème Zakat Ovins/Caprins
   * Nisab: 40 têtes minimum
   * 40-120: 1 mouton
   * 121-200: 2 moutons
   * 201-399: 3 moutons
   * 400+: 1 mouton par 100
   */
  private calculateZakatOvinsCaprins(nombre: number, settings: ZakatSettings): number {
    if (nombre < NISAB_OVINS) return 0;

    const prixMouton = this.toNumber(settings.prixMouton);

    if (nombre <= 120) return 1 * prixMouton;
    if (nombre <= 200) return 2 * prixMouton;
    if (nombre <= 399) return 3 * prixMouton;
    return Math.floor(nombre / 100) * prixMouton;
  }

  /**
   * Barème Zakat Bovins
   * Nisab: 30 têtes minimum
   * 30-39: 1 veau d'un an
   * 40-59: 1 veau de 2 ans
   * 60-69: 2 veaux d'un an
   * 70-79: 1 veau d'un an + 1 veau de 2 ans
   * etc.
   */
  private calculateZakatBovins(nombre: number, settings: ZakatSettings): number {
    if (nombre < NISAB_BOVINS) return 0;

    const prixVeau1an = this.toNumber(settings.prixVeau1an);
    const prixVeau2ans = this.toNumber(settings.prixVeau2ans);

    if (nombre <= 39) return 1 * prixVeau1an;
    if (nombre <= 59) return 1 * prixVeau2ans;
    if (nombre <= 69) return 2 * prixVeau1an;
    if (nombre <= 79) return prixVeau1an + prixVeau2ans;

    // Formule simplifiée pour les grands nombres
    const veaux1an = Math.floor(nombre / 30);
    const veaux2ans = Math.floor((nombre % 30) / 40);
    return (veaux1an * prixVeau1an) + (veaux2ans * prixVeau2ans);
  }

  /**
   * Barème Zakat Chameaux
   * Nisab: 5 têtes minimum
   * 5-9: 1 mouton
   * 10-14: 2 moutons
   * 15-19: 3 moutons
   * 20-24: 4 moutons
   * 25-35: 1 chamelle de 1 an
   * 36-45: 1 chamelle de 2 ans
   * 46+: selon barème
   */
  private calculateZakatChameaux(nombre: number, settings: ZakatSettings): number {
    if (nombre < NISAB_CHAMEAUX) return 0;

    const prixMouton = this.toNumber(settings.prixMouton);
    const prixChamelle1an = this.toNumber(settings.prixChamelle1an);
    const prixChamelle2ans = this.toNumber(settings.prixChamelle2ans);
    const prixChameauAdulte = this.toNumber(settings.prixChameauAdulte);

    if (nombre <= 9) return 1 * prixMouton;
    if (nombre <= 14) return 2 * prixMouton;
    if (nombre <= 19) return 3 * prixMouton;
    if (nombre <= 24) return 4 * prixMouton;
    if (nombre <= 35) return 1 * prixChamelle1an;
    if (nombre <= 45) return 1 * prixChamelle2ans;
    if (nombre <= 60) return 2 * prixChamelle2ans;
    if (nombre <= 75) return 3 * prixChamelle2ans;
    if (nombre <= 90) return 4 * prixChamelle2ans;

    // Pour les grands nombres
    return Math.floor(nombre / 25) * prixChameauAdulte;
  }

  /**
   * Convertir une valeur en nombre (gère les strings et nulls)
   */
  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Récupérer toutes les Zakat d'une organisation
   */
  async findAll(organizationId: string): Promise<ZakatCalculation[]> {
    return this.zakatRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }

  /**
   * Récupérer une Zakat par ID
   */
  async findOne(id: string, organizationId: string): Promise<ZakatCalculation> {
    const zakat = await this.zakatRepository.findOne({
      where: { id, organizationId },
      relations: ['user'],
    });

    if (!zakat) {
      throw new NotFoundException(`Calcul Zakat non trouvé`);
    }

    return zakat;
  }

  /**
   * Mettre à jour une Zakat
   */
  async update(
    id: string,
    updateZakatDto: UpdateZakatDto,
    organizationId: string,
  ): Promise<ZakatCalculation> {
    const zakat = await this.findOne(id, organizationId);
    const settings = await this.metalPricesService.getOrCreateSettings(organizationId);

    // Mettre à jour les champs
    Object.assign(zakat, updateZakatDto);

    // Recalculer si les données ont changé (pas juste le statut)
    if (!updateZakatDto.statut || Object.keys(updateZakatDto).length > 1) {
      this.calculateAll(zakat, settings);
    }

    return this.zakatRepository.save(zakat);
  }

  /**
   * Marquer une Zakat comme payée
   */
  async markAsPaid(id: string, organizationId: string): Promise<ZakatCalculation> {
    const zakat = await this.findOne(id, organizationId);

    if (zakat.zakatTotal <= 0) {
      throw new BadRequestException('Aucune Zakat à payer');
    }

    zakat.statut = ZakatStatus.PAYE;
    zakat.datePaiement = new Date();

    return this.zakatRepository.save(zakat);
  }

  /**
   * Supprimer une Zakat
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const zakat = await this.findOne(id, organizationId);
    await this.zakatRepository.remove(zakat);
  }

  /**
   * Récupérer les paramètres actuels (prix or, argent, nisab, prix bétail)
   */
  async getSettings(organizationId: string, forceRefresh = false): Promise<ZakatSettings> {
    return this.metalPricesService.getOrCreateSettings(organizationId, forceRefresh);
  }

  /**
   * Mettre à jour les paramètres (prix bétail configurables par l'admin)
   */
  async updateSettings(
    organizationId: string,
    updateData: Partial<ZakatSettings>,
  ): Promise<ZakatSettings> {
    return this.metalPricesService.updateSettings(organizationId, updateData);
  }

  /**
   * Statistiques Zakat de l'organisation
   */
  async getStatistics(organizationId: string): Promise<any> {
    const calculations = await this.zakatRepository.find({
      where: { organizationId },
    });

    const totalCalculations = calculations.length;
    const paidCalculations = calculations.filter(z => z.statut === ZakatStatus.PAYE);
    const pendingCalculations = calculations.filter(z => z.statut === ZakatStatus.CALCULE);

    const totalZakatPaid = paidCalculations.reduce(
      (sum, z) => sum + this.toNumber(z.zakatTotal),
      0,
    );

    const totalZakatPending = pendingCalculations.reduce(
      (sum, z) => sum + this.toNumber(z.zakatTotal),
      0,
    );

    return {
      totalCalculations,
      paidCount: paidCalculations.length,
      pendingCount: pendingCalculations.length,
      totalZakatPaid,
      totalZakatPending,
      lastCalculation: calculations[0]?.createdAt || null,
    };
  }

  /**
   * Récupérer les données pré-remplies pour le formulaire Zakat
   * - Valeur du stock (stock * prixAchat)
   * - Créances clients (montantRestant des ventes actives)
   * - Dettes fournisseurs (montantRestant des approvisionnements)
   */
  async getPrefilledData(organizationId: string): Promise<{
    valeurStock: number;
    creancesClients: number;
    dettesFournisseurs: number;
  }> {
    // Valeur totale du stock (stock * prixAchat)
    const stockResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(stock * "prixAchat"), 0) as "valeurStock"
       FROM article
       WHERE "organizationId" = $1`,
      [organizationId],
    );

    // Créances clients (montantRestant des ventes actives)
    const creancesResult = await this.dataSource.query(
      `SELECT COALESCE(SUM("montantRestant"), 0) as "creancesClients"
       FROM vente
       WHERE "organizationId" = $1 AND statut = 'active' AND "montantRestant" > 0`,
      [organizationId],
    );

    // Dettes fournisseurs (montantRestant des approvisionnements)
    const dettesResult = await this.dataSource.query(
      `SELECT COALESCE(SUM("montantRestant"), 0) as "dettesFournisseurs"
       FROM approvisionnement
       WHERE "organizationId" = $1 AND "montantRestant" > 0`,
      [organizationId],
    );

    return {
      valeurStock: parseFloat(stockResult[0]?.valeurStock || '0'),
      creancesClients: parseFloat(creancesResult[0]?.creancesClients || '0'),
      dettesFournisseurs: parseFloat(dettesResult[0]?.dettesFournisseurs || '0'),
    };
  }
}
