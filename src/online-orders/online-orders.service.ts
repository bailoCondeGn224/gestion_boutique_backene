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
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
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

        if (itemDto.modeVenteId) {
          const modeVente = await this.modeVenteRepository.findOne({
            where: { id: itemDto.modeVenteId, articleId: article.id },
          });

          if (modeVente) {
            prixUnitaire = modeVente.prixVente;
            modeVenteNom = modeVente.nom;
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
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    return this.toResponseDto(order);
  }

  async getByCustomer(customerId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [orders, total] = await this.onlineOrderRepository.findAndCount({
      where: { customerAccountId: customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Charger les customerAccount séparément pour éviter les problèmes de relation
    const customer = await this.customerAccountRepository.findOne({ where: { id: customerId } });

    return {
      data: orders.map(o => this.toResponseDto(o, customer)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
      relations: ['items', 'customerAccount'],
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
      throw new BadRequestException('Cette commande ne peut pas être confirmée');
    }

    // TODO: Décrémenter le stock et créer la vente
    // Pour l'instant, juste changer le statut

    order.statut = OnlineOrderStatut.CONFIRMEE;
    order.confirmeePar = userId;
    order.confirmeeLe = new Date();

    await this.onlineOrderRepository.save(order);

    // Notifier le client
    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_CONFIRMEE,
      title: 'Commande confirmée',
      message: `Votre commande #${order.numero} a été confirmée`,
      data: { orderId: order.id, numero: order.numero },
    });

    return this.toResponseDto(order);
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

    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_PRETE,
      title: 'Commande prête',
      message: `Votre commande #${order.numero} est prête`,
      data: { orderId: order.id, numero: order.numero },
    });

    return this.toResponseDto(order);
  }

  async markDelivered(orderId: string, organizationId: string): Promise<OnlineOrderResponseDto> {
    const order = await this.onlineOrderRepository.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'customerAccount'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.statut !== OnlineOrderStatut.PRETE && order.statut !== OnlineOrderStatut.CONFIRMEE) {
      throw new BadRequestException('Cette commande ne peut pas être marquée livrée');
    }

    order.statut = OnlineOrderStatut.LIVREE;
    order.livreeLe = new Date();

    await this.onlineOrderRepository.save(order);

    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_LIVREE,
      title: 'Commande livrée',
      message: `Votre commande #${order.numero} a été livrée. Merci !`,
      data: { orderId: order.id, numero: order.numero },
    });

    return this.toResponseDto(order);
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

    // TODO: Si confirmée, remettre le stock

    order.statut = OnlineOrderStatut.ANNULEE;
    order.motifAnnulation = dto.motif;
    order.annuleeLe = new Date();

    await this.onlineOrderRepository.save(order);

    await this.notificationsService.sendToCustomer(order.customerAccountId, {
      type: NotificationType.COMMANDE_ANNULEE,
      title: 'Commande annulée',
      message: `Votre commande #${order.numero} a été annulée${dto.motif ? ': ' + dto.motif : ''}`,
      data: { orderId: order.id, numero: order.numero, motif: dto.motif },
    });

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
      customerNom: customerData?.nom || '',
      customerTelephone: customerData?.telephone || '',
      motifAnnulation: order.motifAnnulation,
      items: order.items?.map(item => ({
        id: item.id,
        articleId: item.articleId,
        articleNom: item.articleNom,
        modeVenteId: item.modeVenteId,
        modeVenteNom: item.modeVenteNom,
        quantite: item.quantite,
        prixUnitaire: Number(item.prixUnitaire),
        sousTotal: Number(item.sousTotal),
      })) || [],
      createdAt: order.createdAt,
      confirmeeLe: order.confirmeeLe,
      preteLe: order.preteLe,
      livreeLe: order.livreeLe,
      annuleeLe: order.annuleeLe,
    };
  }
}
