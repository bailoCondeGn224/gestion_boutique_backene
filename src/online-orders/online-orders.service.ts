// src/online-orders/online-orders.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { distanceEnMetres } from '../common/utils/geo.util';
import { OnlineOrder, OnlineOrderStatut, ModeLivraison } from './entities/online-order.entity';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { StoreFront } from '../storefront/entities/storefront.entity';
import { Article } from '../stock/entities/article.entity';
import { ModeVente } from '../stock/entities/mode-vente.entity';
import { Client } from '../clients/entities/client.entity';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { Livreur } from '../livreurs/entities/livreur.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateOnlineOrderDto, OnlineOrderResponseDto, CancelOrderDto } from './dto';
import { StockService } from '../stock/stock.service';
import { MouvementsStockService } from '../mouvements-stock/mouvements-stock.service';
import { TypeMouvement, MotifMouvement } from '../mouvements-stock/entities/mouvement-stock.entity';
import { Vente, ModePaiement, StatutVente } from '../ventes/entities/vente.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';

@Injectable()
export class OnlineOrdersService {
  private readonly logger = new Logger(OnlineOrdersService.name);

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
      const numero = this.generateNumero(storefront.organizationId);

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
        latitudeLivraison: dto.latitudeLivraison ?? null,
        longitudeLivraison: dto.longitudeLivraison ?? null,
        precisionLivraison: dto.precisionLivraison ?? null,
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

  /**
   * Portée de lecture d'une commande.
   *
   * Toujours fournie par les contrôleurs: sans elle, n'importe quel client
   * connecté peut lire la commande d'un autre (adresse, téléphone, contenu du
   * panier), et n'importe quelle boutique celle d'une autre organisation.
   */
  private buildOrderScope(scope?: { customerId?: string; organizationId?: string }) {
    return {
      ...(scope?.customerId ? { customerAccountId: scope.customerId } : {}),
      ...(scope?.organizationId ? { organizationId: scope.organizationId } : {}),
    };
  }

  async getById(
    id: string,
    scope?: { customerId?: string; organizationId?: string },
  ): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id, ...this.buildOrderScope(scope) },
      relations: ['items', 'customerAccount'],
    });

    // 404 et non 403: on ne confirme pas l'existence d'une commande qui ne
    // regarde pas l'appelant.
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
      relations: ['items', 'customerAccount'],
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
      relations: ['items', 'customerAccount'],
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
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    // Pour mode LIVRAISON: doit passer par dispatch() puis markDeliveredByLivreur()
    // Pour mode RETRAIT_BOUTIQUE: backoffice peut marquer directement depuis PRETE
    if (order.modeLivraison === ModeLivraison.LIVRAISON) {
      // Mode LIVRAISON: seul EN_LIVRAISON peut être marqué livré (par backoffice en cas d'urgence)
      if (order.statut !== OnlineOrderStatut.EN_LIVRAISON) {
        throw new BadRequestException(
          'Pour une livraison à domicile, la commande doit d\'abord être dispatchée à un livreur'
        );
      }
    } else {
      // Mode RETRAIT_BOUTIQUE: peut être marqué livré depuis PRETE
      if (order.statut !== OnlineOrderStatut.PRETE && order.statut !== OnlineOrderStatut.CONFIRMEE) {
        throw new BadRequestException('Cette commande ne peut pas être marquée livrée');
      }
    }

    // Idempotence: si déjà une vente associée, retourner sans rien faire
    if (order.venteId) {
      return this.toResponseDto(order);
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
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut === OnlineOrderStatut.LIVREE || order.statut === OnlineOrderStatut.ANNULEE) {
      throw new BadRequestException('Cette commande ne peut pas être annulée');
    }

    // Note: Le stock n'est décrémenté qu'à la livraison (markDelivered),
    // donc pas besoin de le remettre lors de l'annulation

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

  private generateNumero(organizationId: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    // 3 derniers caractères de l'organizationId (pour unicité multi-tenant)
    const orgSuffix = organizationId.slice(-3).toUpperCase();

    // Format: CMD-YYYYMMDDHHMMSSMMM-XXX
    return `CMD-${year}${month}${day}${hours}${minutes}${seconds}${ms}-${orgSuffix}`;
  }

  async dispatch(
    organizationId: string,
    orderId: string,
    livreurId: string,
  ): Promise<OnlineOrder> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.PRETE) {
      throw new BadRequestException(
        'La commande doit être prête pour être dispatchée',
      );
    }

    if (order.modeLivraison !== ModeLivraison.LIVRAISON) {
      throw new BadRequestException(
        'Seules les commandes en livraison peuvent être dispatchées',
      );
    }

    // Le livreur doit appartenir à la même organisation: sans ce contrôle, une
    // boutique peut assigner ses commandes au livreur d'une autre boutique, qui
    // verrait alors l'adresse et le téléphone de ses clients.
    const livreur = await this.livreurRepository.findOne({
      where: { id: livreurId, organizationId },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé');
    }

    if (!livreur.isActive) {
      throw new BadRequestException('Ce livreur est désactivé');
    }

    order.livreurId = livreurId;
    order.statut = OnlineOrderStatut.EN_LIVRAISON;
    order.expedieeLe = new Date();

    return this.onlineOrderRepository.save(order);
  }

  // organizationId en plus du livreurId: défense en profondeur contre les
  // commandes dispatchées avant l'ajout du contrôle d'organisation dans dispatch().
  /**
   * Distance en dessous de laquelle on considère le livreur arrivé.
   *
   * 120 m: assez large pour absorber l'imprécision d'un relevé GPS urbain,
   * assez serré pour ne pas se déclencher à la rue d'à côté.
   */
  private static readonly ARRIVAL_RADIUS_M = 120;

  /**
   * Détecte l'arrivée du livreur à destination et prévient client et boutique.
   *
   * Appelée à chaque relevé de position. `arriveeLe` sert de garde: sans elle,
   * chaque relevé pendant que le livreur attend devant la porte renverrait une
   * notification.
   */
  async detecterArrivees(
    livreurId: string,
    latitude: number,
    longitude: number,
  ): Promise<OnlineOrder[]> {
    const enCours = await this.onlineOrderRepository.find({
      where: {
        livreurId,
        statut: OnlineOrderStatut.EN_LIVRAISON,
        arriveeLe: IsNull(),
      },
    });

    const arrivees: OnlineOrder[] = [];

    for (const order of enCours) {
      if (order.latitudeLivraison == null || order.longitudeLivraison == null) {
        continue;
      }

      const distance = distanceEnMetres(
        latitude,
        longitude,
        Number(order.latitudeLivraison),
        Number(order.longitudeLivraison),
      );

      if (distance > OnlineOrdersService.ARRIVAL_RADIUS_M) continue;

      order.arriveeLe = new Date();
      await this.onlineOrderRepository.save(order);
      arrivees.push(order);

      // Les notifications ne doivent pas faire échouer la mise à jour de
      // position: le livreur continue de rouler même si l'envoi casse.
      try {
        if (order.customerAccountId) {
          await this.notificationsService.sendToCustomer(order.customerAccountId, {
            type: NotificationType.LIVREUR_ARRIVE,
            title: 'Votre livreur est arrivé',
            message: `Le livreur est à votre adresse pour la commande ${order.numero}.`,
            data: { orderId: order.id, numero: order.numero },
          });
        }

        await this.notificationsService.sendToStore(order.organizationId, {
          type: NotificationType.LIVREUR_ARRIVE,
          title: 'Livreur arrivé chez le client',
          message: `Le livreur est arrivé à destination pour la commande ${order.numero}.`,
          data: { orderId: order.id, numero: order.numero },
        });
      } catch (error) {
        this.logger.error(
          `Notification d'arrivée échouée pour ${order.numero}: ${error.message}`,
        );
      }
    }

    return arrivees;
  }

  async getByLivreur(
    livreurId: string,
    organizationId: string,
  ): Promise<OnlineOrder[]> {
    return this.onlineOrderRepository.find({
      where: {
        livreurId,
        organizationId,
        statut: OnlineOrderStatut.EN_LIVRAISON,
      },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async markDeliveredByLivreur(
    livreurId: string,
    orderId: string,
    organizationId: string,
  ): Promise<OnlineOrder> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, livreurId, organizationId },
    });

    if (!order) {
      throw new NotFoundException(
        'Commande non trouvée ou non assignée à ce livreur',
      );
    }

    if (order.statut !== OnlineOrderStatut.EN_LIVRAISON) {
      throw new BadRequestException('La commande doit être en livraison');
    }

    order.statut = OnlineOrderStatut.LIVREE;
    order.livreeLe = new Date();

    return this.onlineOrderRepository.save(order);
  }

  async getTrackingInfo(
    orderId: string,
    scope?: { customerId?: string; organizationId?: string },
  ): Promise<{
    latitude: number | null;
    longitude: number | null;
    lastPositionAt: Date | null;
    livreurNom: string;
    livreurTelephone: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
    destinationPrecision?: number;
    destinationAdresse?: string;
    boutiqueLatitude?: number;
    boutiqueLongitude?: number;
    arriveeLe: Date | null;
  } | null> {
    const order = await this.onlineOrderRepository.findOne({
      where: {
        id: orderId,
        statut: OnlineOrderStatut.EN_LIVRAISON,
        ...this.buildOrderScope(scope),
      },
      relations: ['livreur'],
    });

    if (!order || !order.livreur) {
      return null;
    }

    // Point de départ de la course, porté par l'organisation (lieu physique du
    // commerce) et non par la vitrine en ligne.
    const organisation = await this.dataSource
      .getRepository(Organization)
      .findOne({ where: { id: order.organizationId } });

    // On renvoie le livreur même sans position: le client doit pouvoir l'appeler
    // quand son GPS est coupé, plutôt que de ne rien voir du tout.
    const hasPosition =
      order.livreur.latitude !== null && order.livreur.longitude !== null;

    return {
      latitude: hasPosition ? Number(order.livreur.latitude) : null,
      longitude: hasPosition ? Number(order.livreur.longitude) : null,
      // Permet au client de distinguer une position en direct d'une position figée
      lastPositionAt: order.livreur.lastPositionAt ?? null,
      livreurNom: order.livreur.nom,
      livreurTelephone: order.livreur.telephone,
      // Include destination coordinates if available
      destinationLatitude: order.latitudeLivraison ? Number(order.latitudeLivraison) : undefined,
      destinationLongitude: order.longitudeLivraison ? Number(order.longitudeLivraison) : undefined,
      // Rayon d'incertitude: permet d'afficher un cercle plutôt qu'un point net
      destinationPrecision:
        order.precisionLivraison != null ? Number(order.precisionLivraison) : undefined,
      destinationAdresse: order.adresseLivraison || undefined,
      boutiqueLatitude:
        organisation?.latitude != null ? Number(organisation.latitude) : undefined,
      boutiqueLongitude:
        organisation?.longitude != null ? Number(organisation.longitude) : undefined,
      // Permet d'annoncer « votre livreur est arrivé » côté client
      arriveeLe: order.arriveeLe ?? null,
    };
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
      arriveeLe: order.arriveeLe,
      annuleeLe: order.annuleeLe,
      expedieeLe: order.expedieeLe,
      livreurId: order.livreurId || undefined,
      livreur: order.livreur ? {
        id: order.livreur.id,
        nom: order.livreur.nom,
        telephone: order.livreur.telephone,
      } : undefined,
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
      const numero = this.generateNumero(storefront.organizationId);

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

      // Frais de livraison seulement si mode LIVRAISON
      const fraisLivraison = dto.modeLivraison === ModeLivraison.LIVRAISON
        ? Number(storefront.fraisLivraison || 0)
        : 0;
      const total = sousTotal + fraisLivraison;

      // Créer la commande
      const order = queryRunner.manager.create(OnlineOrder, {
        numero,
        organizationId: storefront.organizationId,
        customerAccountId: customerId, // Utiliser le customerId si fourni (client authentifié)
        clientId: null,
        clientNom: dto.nomClient || null,
        statut: OnlineOrderStatut.EN_ATTENTE,
        modeLivraison: dto.modeLivraison || ModeLivraison.RETRAIT_BOUTIQUE,
        adresseLivraison: dto.adresseLivraison || null,
        latitudeLivraison: dto.latitudeLivraison || null,
        longitudeLivraison: dto.longitudeLivraison || null,
        // ?? et non ||: une précision de 0 m est une valeur légitime
        precisionLivraison: dto.precisionLivraison ?? null,
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
}
