import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZakatSettings } from './entities/zakat-settings.entity';

export interface MetalPrices {
  goldPricePerGram: number; // USD
  silverPricePerGram: number; // USD
  usdToGnf: number;
  goldPriceGnf: number;
  silverPriceGnf: number;
  nisabGnf: number; // 85g d'or en GNF
}

@Injectable()
export class MetalPricesService {
  private readonly logger = new Logger(MetalPricesService.name);

  private readonly goldApiKey: string;
  private readonly goldApiUrl: string;
  private readonly exchangeApiKey: string;
  private readonly exchangeApiUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(ZakatSettings)
    private settingsRepository: Repository<ZakatSettings>,
  ) {
    this.goldApiKey = this.configService.get<string>('GOLD_API_KEY', '');
    this.goldApiUrl = this.configService.get<string>('GOLD_API_URL', 'https://www.goldapi.io/api');
    this.exchangeApiKey = this.configService.get<string>('EXCHANGE_API_KEY', '');
    this.exchangeApiUrl = this.configService.get<string>('EXCHANGE_API_URL', 'https://v6.exchangerate-api.com/v6');
  }

  /**
   * Récupérer le prix de l'or depuis GoldAPI
   */
  async fetchGoldPrice(): Promise<number | null> {
    if (!this.goldApiKey) {
      this.logger.warn('GOLD_API_KEY non configuré');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.goldApiUrl}/XAU/USD`, {
          headers: {
            'x-access-token': this.goldApiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      const pricePerGram = response.data.price_gram_24k;
      this.logger.log(`✅ Prix Or: ${pricePerGram} USD/gramme`);
      return pricePerGram;
    } catch (error) {
      this.logger.error(`❌ Erreur fetch prix or: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupérer le prix de l'argent depuis GoldAPI
   */
  async fetchSilverPrice(): Promise<number | null> {
    if (!this.goldApiKey) {
      this.logger.warn('GOLD_API_KEY non configuré');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.goldApiUrl}/XAG/USD`, {
          headers: {
            'x-access-token': this.goldApiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      const pricePerGram = response.data.price_gram_24k;
      this.logger.log(`✅ Prix Argent: ${pricePerGram} USD/gramme`);
      return pricePerGram;
    } catch (error) {
      this.logger.error(`❌ Erreur fetch prix argent: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupérer le taux de change USD -> GNF
   */
  async fetchUsdToGnfRate(): Promise<number | null> {
    if (!this.exchangeApiKey) {
      this.logger.warn('EXCHANGE_API_KEY non configuré');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.exchangeApiUrl}/${this.exchangeApiKey}/pair/USD/GNF`),
      );

      const rate = response.data.conversion_rate;
      this.logger.log(`✅ Taux USD/GNF: ${rate}`);
      return rate;
    } catch (error) {
      this.logger.error(`❌ Erreur fetch taux change: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupérer tous les prix et calculer le Nisab
   */
  async fetchAllPrices(): Promise<MetalPrices | null> {
    try {
      // Appels en parallèle
      const [goldPrice, silverPrice, usdToGnf] = await Promise.all([
        this.fetchGoldPrice(),
        this.fetchSilverPrice(),
        this.fetchUsdToGnfRate(),
      ]);

      if (!goldPrice || !usdToGnf) {
        this.logger.error('Impossible de récupérer les prix essentiels');
        return null;
      }

      const goldPriceGnf = goldPrice * usdToGnf;
      const silverPriceGnf = (silverPrice || 0) * usdToGnf;
      const nisabGnf = 85 * goldPriceGnf; // 85 grammes d'or

      return {
        goldPricePerGram: goldPrice,
        silverPricePerGram: silverPrice || 0,
        usdToGnf,
        goldPriceGnf,
        silverPriceGnf,
        nisabGnf,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur fetchAllPrices: ${error.message}`);
      return null;
    }
  }

  /**
   * Mettre à jour les prix métaux d'une organisation (depuis API)
   */
  async updateMetalPrices(organizationId: string): Promise<ZakatSettings | null> {
    const prices = await this.fetchAllPrices();
    if (!prices) return null;

    let settings = await this.settingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({ organizationId });
    }

    settings.prixOrGrammeUsd = prices.goldPricePerGram;
    settings.prixArgentGrammeUsd = prices.silverPricePerGram;
    settings.tauxUsdGnf = prices.usdToGnf;
    settings.prixOrGrammeGnf = prices.goldPriceGnf;
    settings.prixArgentGrammeGnf = prices.silverPriceGnf;
    settings.nisabGnf = prices.nisabGnf;
    settings.lastPriceUpdate = new Date();

    return this.settingsRepository.save(settings);
  }

  /**
   * Mettre à jour les paramètres (prix bétail, etc.) par l'admin
   */
  async updateSettings(
    organizationId: string,
    updateData: Partial<ZakatSettings>,
  ): Promise<ZakatSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({ organizationId });
    }

    // Mettre à jour seulement les champs fournis
    Object.assign(settings, updateData);

    return this.settingsRepository.save(settings);
  }

  /**
   * Récupérer les paramètres actuels d'une organisation
   */
  async getOrganizationSettings(organizationId: string): Promise<ZakatSettings | null> {
    return this.settingsRepository.findOne({
      where: { organizationId },
    });
  }

  /**
   * Récupérer ou créer les paramètres avec mise à jour des prix si nécessaire
   */
  async getOrCreateSettings(organizationId: string, forceUpdate = false): Promise<ZakatSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { organizationId },
    });

    // Si pas de settings ou dernière mise à jour > 24h ou forceUpdate
    const needsUpdate = !settings ||
      forceUpdate ||
      !settings.lastPriceUpdate ||
      (new Date().getTime() - new Date(settings.lastPriceUpdate).getTime()) > 24 * 60 * 60 * 1000;

    if (needsUpdate) {
      const updated = await this.updateMetalPrices(organizationId);
      if (updated) return updated;
    }

    // Si on a des settings existants, les retourner
    if (settings) return settings;

    // Sinon créer avec des valeurs par défaut
    settings = this.settingsRepository.create({
      organizationId,
      prixOrGrammeUsd: 0,
      prixArgentGrammeUsd: 0,
      tauxUsdGnf: 8600,
      prixOrGrammeGnf: 0,
      prixArgentGrammeGnf: 0,
      nisabGnf: 0,
      // Prix bétail par défaut
      prixMouton: 500000,
      prixVeau1an: 1500000,
      prixVeau2ans: 2500000,
      prixVache: 3500000,
      prixChamelle1an: 5000000,
      prixChamelle2ans: 8000000,
      prixChameauAdulte: 12000000,
    });

    return this.settingsRepository.save(settings);
  }

  /**
   * Cron job: Mettre à jour les prix tous les jours à 6h du matin
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async updateAllOrganizationsPrices() {
    this.logger.log('🔄 Mise à jour quotidienne des prix métaux...');

    const allSettings = await this.settingsRepository.find();

    for (const settings of allSettings) {
      await this.updateMetalPrices(settings.organizationId);
    }

    this.logger.log(`✅ Mise à jour terminée pour ${allSettings.length} organisations`);
  }
}
