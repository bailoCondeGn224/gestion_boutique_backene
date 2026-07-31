// src/online-orders/online-orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnlineOrder, OnlineOrderStatut, ModeLivraison } from './entities/online-order.entity';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { StoreFront } from '../storefront/entities/storefront.entity';
import { Article } from '../stock/entities/article.entity';
import { ModeVente } from '../stock/entities/mode-vente.entity';
import { Client } from '../clients/entities/client.entity';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateOnlineOrderDto, OnlineOrderResponseDto, CancelOrderDto } from './dto';
import { StockService } from '../stock/stock.service';
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service';
import { Livreur } from '../livreurs/entities/livreur.entity';
import { LivreursService } from '../livreurs/livreurs.service';
import { TypeMouvement, MotifMouvement } from '../mouvements-stock/entities/mouvement-stock.entity';
import { Vente, ModePaiement, StatutVente } from '../ventes/entities/vente.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';

@Injectable()
export class OnlineOrdersService {
  constructor(
    @InjectRepository(OnlineOrder)
    private onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(OnlineOrderItem)
    private onlineOrderItemRepository: Repository<OnlineOrderItem>,
    @InjectRepository(StoreFront)
    private storefrontRepository: Repository<StoreFront>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(ModeVente)
    private modeVenteRepository: Repository<ModeVente>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(CustomerAccount)
    private customerAccountRepository: Repository<CustomerAccount>,
    @InjectRepository(Vente)
    private venteRepository: Repository<Vente>,
    @InjectRepository(LigneVente)
    private ligneVenteRepository: Repository<LigneVente>,
    @InjectRepository(Livreur)
    private livreurRepository: Repository<Livreur>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private stockService: StockService,
    private mouvementsStockService: MouvementsStockService,
    private livreursService: LivreursService,
  ) {}

  async create(dto: CreateOnlineOrderDto, customerId: string): Promise<OnlineOrderResponseDto> {
    // Récupérer la boutique
    const storefront = await this.storefrontRepository.findOne({
      where: { slug: dto.storeSlug, isActive: true },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée ou inactive');
    }

    // Récupérer le customer
    const customer = await this.customerAccountRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Compte client non trouvé');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Générer le numéro de commande
      const numero = await this.generateNumero(storefront.organizationId);

      // Calculer les totaux et créer les items
      let sousTotal = 0;
      const orderItems: Partial<OnlineOrderItem>[] = [];

      for (const itemDto of dto.items) {
        const article = await this.articleRepository.findOne({
          where: { id: itemDto.articleId, organizationId: storefront.organizationId, disponibleEnLigne: true },
        });

        if (!article) {
          throw new BadRequestException(`Article ${itemDto.articleId} non trouvé ou non disponible en ligne`);
        }

        let prixUnitaire = article.prixEnLigne || article.prixVente;
        let modeVenteNom: string | null = null;
        let quantiteBase = itemDto.quantite;

        if (itemDto.modeVenteId) {
          const modeVente = await this.modeVenteRepository.findOne({
            where: { id: itemDto.modeVenteId, articleId: article.id },
          });

          if (modeVente) {
            prixUnitaire = modeVente.prixVente;
            modeVenteNom = modeVente.nom;
            quantiteBase = itemDto.quantite * Number(modeVente.quantiteStock);
          }
        }

        const itemSousTotal = prixUnitaire * itemDto.quantite;
        sousTotal += itemSousTotal;

        orderItems.push({
          articleId: article.id,
          articleNom: article.nom,
          modeVenteId: itemDto.modeVenteId,
          modeVenteNom,
          quantite: itemDto.quantite,
          quantiteBase,
          prixUnitaire,
          sousTotal: itemSousTotal,
          organizationId: storefront.organizationId,
        });
      }

      // Frais de livraison
      const fraisLivraison = dto.modeLivraison === ModeLivraison.LIVRAISON
        ? Number(storefront.fraisLivraison)
        : 0;

      const total = sousTotal + fraisLivraison;

      // Chercher ou créer le client lié
      let clientId: string | null = null;
      const existingClient = await this.clientRepository.findOne({
        where: { telephone: customer.telephone, organizationId: storefront.organizationId },
      });

      if (existingClient) {
        clientId = existingClient.id;
        // Lier le customerAccount si pas déjà fait
        if (!existingClient.customerAccountId) {
          await queryRunner.manager.update(Client, existingClient.id, {
            customerAccountId: customer.id,
          });
        }
      }

      // Créer la commande
      const order = queryRunner.manager.create(OnlineOrder, {
        numero,
        organizationId: storefront.organizationId,
        customerAccountId: customer.id,
        clientId,
        statut: OnlineOrderStatut.EN_ATTENTE,
        modeLivraison: dto.modeLivraison,
        adresseLivraison: dto.adresseLivraison,
        telephoneLivraison: dto.telephoneLivraison || customer.telephone,
        fraisLivraison,
        sousTotal,
        total,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Créer les items
      for (const item of orderItems) {
        const orderItem = queryRunner.manager.create(OnlineOrderItem, {
          ...item,
          onlineOrderId: savedOrder.id,
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      // Envoyer notification à la boutique
      await this.notificationsService.sendToStore(storefront.organizationId, {
        type: NotificationType.NOUVELLE_COMMANDE,
        title: 'Nouvelle commande',
        message: `Nouvelle commande #${numero} de ${customer.nom} - ${total} GNF`,
        data: { orderId: savedOrder.id, numero, total },
      });

      // Récupérer la commande complète
      return this.getById(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getById(id: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id },
      relations: ['items', 'customerAccount', 'livreur'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    return this.toResponseDto(order);
  }

  async getByCustomer(customerId: string, page: number = 1, limit: number = 20): Promise<any> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await this.onlineOrderRepository.findAndCount({
      where: { customerAccountId: customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip,
      take: limitNum,
    });

    // Charger les customerAccount séparément pour éviter les problèmes de relation
    const customer = await this.customerAccountRepository.findOne({ where: { id: customerId } });

    return {
      data: orders.map(o => this.toResponseDto(o, customer)),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getByOrganization(organizationId: string, page: number = 1, limit: number = 20, statut?: OnlineOrderStatut): Promise<any> {
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (statut) {
      where.statut = statut;
    }

    const [orders, total] = await this.onlineOrderRepository.findAndCount({
      where,
      relations: ['items', 'customerAccount', 'livreur'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: orders.map(o => this.toResponseDto(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingCount(organizationId: string): Promise<{ count: number; lastOrderAt: Date | null }> {
    const count = await this.onlineOrderRepository.count({
      where: { organizationId, statut: OnlineOrderStatut.EN_ATTENTE },
    });

    const lastOrder = await this.onlineOrderRepository.findOne({
      where: { organizationId, statut: OnlineOrderStatut.EN_ATTENTE },
      order: { createdAt: 'DESC' },
    });

    return {
      count,
      lastOrderAt: lastOrder?.createdAt || null,
    };
  }

  async getStats(organizationId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [enAttente, confirmees, pretes, livreesToday, total] = await Promise.all([
      this.onlineOrderRepository.count({ where: { organizationId, statut: OnlineOrderStatut.EN_ATTENTE } }),
      this.onlineOrderRepository.count({ where: { organizationId, statut: OnlineOrderStatut.CONFIRMEE } }),
      this.onlineOrderRepository.count({ where: { organizationId, statut: OnlineOrderStatut.PRETE } }),
      this.onlineOrderRepository
        .createQueryBuilder('o')
        .where('o.organizationId = :organizationId', { organizationId })
        .andWhere('o.statut = :statut', { statut: OnlineOrderStatut.LIVREE })
        .andWhere('o.livreeLe >= :today', { today })
        .getCount(),
      this.onlineOrderRepository.count({ where: { organizationId } }),
    ]);

    return {
      enAttente,
      confirmees,
      pretes,
      livreesToday,
      total,
    };
  }

  async confirm(orderId: string, organizationId: string, userId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount', 'livreur'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.EN_ATTENTE) {
      throw new BadRequestException(`Cette commande ne peut pas être confirmée (statut actuel: ${order.statut})`);
    }

    // Vérifier le stock disponible pour tous les articles (sans décrémenter)
    for (const item of order.items) {
      const article = await this.articleRepository.findOne({
        where: { id: item.articleId, organizationId },
      });

      if (!article) {
        throw new BadRequestException(`Article ${item.articleNom} non trouvé`);
      }

      // Calculer la quantité de base
      let quantiteBase = item.quantite;
      if (item.modeVenteId) {
        const modeVente = await this.modeVenteRepository.findOne({
          where: { id: item.modeVenteId },
        });
        if (modeVente) {
          quantiteBase = item.quantite * Number(modeVente.quantiteStock);
        }
      }

      if (article.stock < quantiteBase) {
        throw new BadRequestException(
          `Stock insuffisant pour ${item.articleNom}. Disponible: ${article.stock}, Demandé: ${quantiteBase}`
        );
      }
    }

    // Mettre à jour la commande (pas de vente créée, juste confirmation)
    order.statut = OnlineOrderStatut.CONFIRMEE;
    order.confirmeePar = userId;
    order.confirmeeLe = new Date();

    await this.onlineOrderRepository.save(order);

    // Notifier le client (seulement si compte client authentifié)
    if (order.customerAccountId) {
      try {
        await this.notificationsService.sendToCustomer(order.customerAccountId, {
          type: NotificationType.COMMANDE_CONFIRMEE,
          title: 'Commande confirmée',
          message: `Votre commande #${order.numero} a été confirmée`,
          data: { orderId: order.id, numero: order.numero },
        });
      } catch (notifError) {
        // Log l'erreur mais ne pas échouer la confirmation
        console.error('Erreur envoi notification client:', notifError);
      }
    }

    return this.toResponseDto(order);
  }

  private async generateVenteNumero(organizationId: string): Promise<string> {
    const result = await this.venteRepository
      .createQueryBuilder('vente')
      .select('MAX(vente.numero)', 'maxNumero')
      .where('vente.organizationId = :organizationId', { organizationId })
      .getRawOne();

    let nextNumber = 1;
    if (result?.maxNumero) {
      const match = result.maxNumero.match(/V-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `V-${String(nextNumber).padStart(3, '0')}`;
  }

  async markReady(orderId: string, organizationId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount', 'livreur'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.CONFIRMEE) {
      throw new BadRequestException('Cette commande ne peut pas être marquée prête');
    }

    order.statut = OnlineOrderStatut.PRETE;
    order.preteLe = new Date();

    await this.onlineOrderRepository.save(order);

    // Notifier le client (seulement si compte client authentifié)
    if (order.customerAccountId) {
      try {
        await this.notificationsService.sendToCustomer(order.customerAccountId, {
          type: NotificationType.COMMANDE_PRETE,
          title: 'Commande prête',
          message: `Votre commande #${order.numero} est prête`,
          data: { orderId: order.id, numero: order.numero },
        });
      } catch (notifError) {
        console.error('Erreur envoi notification client:', notifError);
      }
    }

    return this.toResponseDto(order);
  }

  async markDelivered(orderId: string, organizationId: string, userId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount', 'livreur'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.PRETE && order.statut !== OnlineOrderStatut.CONFIRMEE) {
      throw new BadRequestException('Cette commande ne peut pas être marquée livrée');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Vérifier le stock disponible pour tous les articles
      for (const item of order.items) {
        const article = await this.articleRepository.findOne({
          where: { id: item.articleId, organizationId },
        });

        if (!article) {
          throw new BadRequestException(`Article ${item.articleNom} non trouvé`);
        }

        // Calculer la quantité de base
        let quantiteBase = item.quantite;
        if (item.modeVenteId) {
          const modeVente = await this.modeVenteRepository.findOne({
            where: { id: item.modeVenteId },
          });
          if (modeVente) {
            quantiteBase = item.quantite * Number(modeVente.quantiteStock);
          }
        }

        if (article.stock < quantiteBase) {
          throw new BadRequestException(
            `Stock insuffisant pour ${item.articleNom}. Disponible: ${article.stock}, Demandé: ${quantiteBase}`
          );
        }
      }

      // Générer le numéro de vente
      const venteNumero = await this.generateVenteNumero(organizationId);

      // Créer la vente
      const now = new Date();
      const vente = queryRunner.manager.create(Vente, {
        numero: venteNumero,
        date: now,
        heure: now.toTimeString().slice(0, 8),
        clientId: order.clientId,
        modePaiement: ModePaiement.ESPECES,
        total: order.total,
        montantPaye: order.total,
        montantRestant: 0,
        statut: StatutVente.ACTIVE,
        organizationId,
      });

      const savedVente = await queryRunner.manager.save(vente);

      // Créer les lignes de vente et décrémenter le stock
      for (const item of order.items) {
        const article = await this.articleRepository.findOne({
          where: { id: item.articleId },
        });

        // Calculer la quantité de base pour le stock
        let quantiteBase = item.quantite;
        if (item.modeVenteId) {
          const modeVente = await this.modeVenteRepository.findOne({
            where: { id: item.modeVenteId },
          });
          if (modeVente) {
            quantiteBase = item.quantite * Number(modeVente.quantiteStock);
          }
        }

        const stockAvant = article.stock;
        const stockApres = stockAvant - quantiteBase;

        // Créer la ligne de vente
        const ligneVente = queryRunner.manager.create(LigneVente, {
          venteId: savedVente.id,
          articleId: item.articleId,
          nom: item.articleNom,
          modeVenteId: item.modeVenteId,
          quantiteBase,
          quantite: item.quantite,
          prixUnitaire: Number(item.prixUnitaire),
          sousTotal: Number(item.sousTotal),
          organizationId,
        });
        await queryRunner.manager.save(ligneVente);

        // Décrémenter le stock
        await queryRunner.manager.update(Article, item.articleId, {
          stock: stockApres,
        });

        // Enregistrer le mouvement de stock
        await this.mouvementsStockService.createWithQueryRunner(
          queryRunner,
          {
            articleId: item.articleId,
            articleNom: item.articleNom,
            type: TypeMouvement.SORTIE,
            motif: MotifMouvement.VENTE,
            quantite: quantiteBase,
            stockAvant,
            stockApres,
            prixUnitaire: Number(item.prixUnitaire),
            venteId: savedVente.id,
            reference: venteNumero,
            userId,
            organizationId,
          }
        );

        // Décrémenter le stock du mode de vente si applicable
        if (item.modeVenteId) {
          const modeVente = await this.modeVenteRepository.findOne({
            where: { id: item.modeVenteId },
          });
          if (modeVente) {
            await queryRunner.manager.update(ModeVente, item.modeVenteId, {
              quantiteStock: Math.max(0, Number(modeVente.quantiteStock) - item.quantite),
            });
          }
        }
      }

      // Mettre à jour la commande
      order.statut = OnlineOrderStatut.LIVREE;
      order.livreeLe = new Date();
      order.venteId = savedVente.id;

      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      // Notifier le client (seulement si compte client authentifié)
      if (order.customerAccountId) {
        try {
          await this.notificationsService.sendToCustomer(order.customerAccountId, {
            type: NotificationType.COMMANDE_LIVREE,
            title: 'Commande livrée',
            message: `Votre commande #${order.numero} a été livrée. Merci !`,
            data: { orderId: order.id, numero: order.numero },
          });
        } catch (notifError) {
          console.error('Erreur envoi notification client:', notifError);
        }
      }

      return this.toResponseDto(order);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(orderId: string, organizationId: string, dto: CancelOrderDto): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount', 'livreur'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut === OnlineOrderStatut.LIVREE || order.statut === OnlineOrderStatut.ANNULEE) {
      throw new BadRequestException('Cette commande ne peut pas être annulée');
    }

    // TODO: Si confirmée, remettre le stock

    order.statut = OnlineOrderStatut.ANNULEE;
    order.motifAnnulation = dto.motif;
    order.annuleeLe = new Date();

    await this.onlineOrderRepository.save(order);

    // Notifier le client (seulement si compte client authentifié)
    if (order.customerAccountId) {
      try {
        await this.notificationsService.sendToCustomer(order.customerAccountId, {
          type: NotificationType.COMMANDE_ANNULEE,
          title: 'Commande annulée',
          message: `Votre commande #${order.numero} a été annulée${dto.motif ? ': ' + dto.motif : ''}`,
          data: { orderId: order.id, numero: order.numero, motif: dto.motif },
        });
      } catch (notifError) {
        console.error('Erreur envoi notification client:', notifError);
      }
    }

    return this.toResponseDto(order);
  }

  private async generateNumero(organizationId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const lastOrder = await this.onlineOrderRepository
      .createQueryBuilder('o')
      .where('o.organizationId = :organizationId', { organizationId })
      .andWhere('o.numero LIKE :pattern', { pattern: `CMD-${year}${month}-%` })
      .orderBy('o.numero', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.numero.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `CMD-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  private toResponseDto(order: OnlineOrder, customer?: CustomerAccount): OnlineOrderResponseDto {
    const customerData = order.customerAccount || customer;

    return {
      id: order.id,
      numero: order.numero,
      statut: order.statut,
      modeLivraison: order.modeLivraison,
      adresseLivraison: order.adresseLivraison,
      telephoneLivraison: order.telephoneLivraison,
      fraisLivraison: Number(order.fraisLivraison),
      sousTotal: Number(order.sousTotal),
      total: Number(order.total),
      customerNom: customerData?.nom || order.clientNom || 'Anonyme',
      customerTelephone: customerData?.telephone || order.telephoneLivraison || '',
      motifAnnulation: order.motifAnnulation,
      items: order.items?.map(item => ({
        id: item.id,
        articleId: item.articleId,
        articleNom: item.articleNom,
        modeVenteId: item.modeVenteId,
        modeVenteNom: item.modeVenteNom,
        quantite: item.quantite,
        quantiteBase: item.quantiteBase,
        prixUnitaire: Number(item.prixUnitaire),
        sousTotal: Number(item.sousTotal),
      })) || [],
      createdAt: order.createdAt,
      confirmeeLe: order.confirmeeLe,
      preteLe: order.preteLe,
      livreeLe: order.livreeLe,
      annuleeLe: order.annuleeLe,
      expedieeLe: order.expedieeLe,
      livreurId: order.livreurId,
      livreurNom: order.livreur?.nom,
      livreurTelephone: order.livreur?.telephone,
    };
  }

  /**
   * Créer une commande depuis la vitrine publique (avec ou sans authentification client)
   */
  async createFromStorefront(slug: string, dto: any, customerId: string | null = null) {
    // Récupérer la boutique
    const storefront = await this.storefrontRepository.findOne({
      where: { slug, isActive: true },
      relations: ['organization'],
    });

    if (!storefront) {
      throw new NotFoundException('Boutique non trouvée ou inactive');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Générer le numéro de commande
      const numero = await this.generateNumero(storefront.organizationId);

      // Calculer les totaux et créer les items
      let sousTotal = 0;
      const orderItems: Partial<OnlineOrderItem>[] = [];

      for (const itemDto of dto.articles) {
        const article = await this.articleRepository.findOne({
          where: { id: itemDto.articleId, organizationId: storefront.organizationId, disponibleEnLigne: true },
        });

        if (!article) {
          throw new BadRequestException(`Article ${itemDto.articleId} non trouvé ou non disponible`);
        }

        const prixUnitaire = Number(itemDto.prixUnitaire);
        const quantite = Number(itemDto.quantite);
        const sousItem = prixUnitaire * quantite;
        sousTotal += sousItem;

        let quantiteBase = quantite;
        if (itemDto.modeVenteId) {
          const modeVente = await this.modeVenteRepository.findOne({
            where: { id: itemDto.modeVenteId },
          });
          if (modeVente) {
            quantiteBase = quantite * Number(modeVente.quantiteStock);
          }
        }

        orderItems.push({
          articleId: article.id,
          articleNom: article.nom,
          modeVenteId: itemDto.modeVenteId || null,
          modeVenteNom: null,
          quantite,
          quantiteBase,
          prixUnitaire,
          sousTotal: sousItem,
        });
      }

      const fraisLivraison = Number(storefront.fraisLivraison || 0);
      const total = sousTotal + fraisLivraison;

      // Créer la commande
      const order = queryRunner.manager.create(OnlineOrder, {
        numero,
        organizationId: storefront.organizationId,
        customerAccountId: customerId, // Utiliser le customerId si fourni (client authentifié)
        clientId: null,
        clientNom: dto.nomClient || null,
        statut: OnlineOrderStatut.EN_ATTENTE,
        modeLivraison: ModeLivraison.RETRAIT_BOUTIQUE,
        adresseLivraison: dto.adresseLivraison || null,
        telephoneLivraison: dto.telephone,
        fraisLivraison,
        sousTotal,
        total,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Créer les items
      for (const itemData of orderItems) {
        const item = queryRunner.manager.create(OnlineOrderItem, {
          ...itemData,
          onlineOrderId: order.id,
          organizationId: storefront.organizationId,
        });
        await queryRunner.manager.save(item);
      }

      await queryRunner.commitTransaction();

      // Envoyer notification au backoffice
      await this.notificationsService.sendToStore(storefront.organizationId, {
        type: NotificationType.NOUVELLE_COMMANDE,
        title: 'Nouvelle commande en ligne',
        message: `Commande #${numero} de ${dto.nomClient} (${dto.telephone}) - ${total} GNF`,
        data: { orderId: order.id, numero, total: total.toString() },
      });

      return { success: true, orderId: order.id, numero };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== Dispatch & Tracking ==========

  /**
   * Assigner un livreur à une commande et passer en "EN_LIVRAISON"
   */
  async dispatch(orderId: string, livreurId: string, organizationId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount', 'livreur'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.PRETE && order.statut !== OnlineOrderStatut.CONFIRMEE) {
      throw new BadRequestException('Cette commande ne peut pas être dispatchée');
    }

    // Vérifier que le livreur existe et appartient à l'organisation
    const livreur = await this.livreurRepository.findOne({
      where: { id: livreurId, organizationId, isActive: true },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé ou inactif');
    }

    // Mettre à jour la commande
    order.livreurId = livreurId;
    order.statut = OnlineOrderStatut.EN_LIVRAISON;
    order.expedieeLe = new Date();

    await this.onlineOrderRepository.save(order);

    // Notifier le client
    if (order.customerAccountId) {
      try {
        await this.notificationsService.sendToCustomer(order.customerAccountId, {
          type: NotificationType.COMMANDE_PRETE,
          title: 'Commande en livraison',
          message: `Votre commande #${order.numero} est en cours de livraison par ${livreur.nom}`,
          data: { orderId: order.id, numero: order.numero, livreurNom: livreur.nom },
        });
      } catch (notifError) {
        console.error('Erreur envoi notification client:', notifError);
      }
    }

    return this.toResponseDto(order);
  }

  /**
   * Récupérer la position du livreur pour une commande
   */
  async getTracking(orderId: string): Promise<{
    livreur: { id: string; nom: string; telephone: string };
    position: { latitude: number; longitude: number; lastPositionAt: Date } | null;
    customerPosition: { latitude: number; longitude: number; lastPositionAt: Date } | null;
  } | null> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId },
      relations: ['livreur'],
    });

    if (!order || !order.livreurId || order.statut !== OnlineOrderStatut.EN_LIVRAISON) {
      return null;
    }

    const position = await this.livreursService.getPosition(order.livreurId);

    // Position du client
    const customerPosition = order.customerLatitude && order.customerLongitude
      ? {
          latitude: Number(order.customerLatitude),
          longitude: Number(order.customerLongitude),
          lastPositionAt: order.customerLastPositionAt,
        }
      : null;

    return {
      livreur: {
        id: order.livreur.id,
        nom: order.livreur.nom,
        telephone: order.livreur.telephone,
      },
      position,
      customerPosition,
    };
  }

  /**
   * Mettre à jour la position GPS du client
   */
  async updateCustomerPosition(
    orderId: string,
    customerId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, customerAccountId: customerId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.EN_LIVRAISON) {
      throw new BadRequestException('La commande n\'est pas en cours de livraison');
    }

    await this.onlineOrderRepository.update(orderId, {
      customerLatitude: latitude,
      customerLongitude: longitude,
      customerLastPositionAt: new Date(),
    });
  }

  /**
   * Récupérer les commandes assignées à un livreur
   */
  async getOrdersForLivreur(livreurId: string): Promise<OnlineOrderResponseDto[]> {
    const orders = await this.onlineOrderRepository.find({
      where: { livreurId, statut: OnlineOrderStatut.EN_LIVRAISON },
      relations: ['items', 'customerAccount', 'livreur'],
      order: { expedieeLe: 'DESC' },
    });

    return orders.map(o => this.toResponseDto(o));
  }

  /**
   * Livreur marque la commande comme livrée
   */
  async markDeliveredByLivreur(orderId: string, livreurId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, livreurId },
      relations: ['items', 'customerAccount', 'livreur'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée ou non assignée à ce livreur');
    }

    if (order.statut !== OnlineOrderStatut.EN_LIVRAISON) {
      throw new BadRequestException('Cette commande n\'est pas en livraison');
    }

    // Utiliser la méthode existante markDelivered pour créer la vente
    // On doit d'abord récupérer un userId - on va utiliser confirmeePar
    const userId = order.confirmeePar;
    if (!userId) {
      throw new BadRequestException('Commande sans confirmateur, impossible de créer la vente');
    }

    return this.markDelivered(orderId, order.organizationId, userId);
  }
}
