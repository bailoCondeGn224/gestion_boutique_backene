import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { ClientHistoriqueDto } from './dto/client-historique.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { Vente } from '../ventes/entities/vente.entity';
import { VersementClient } from '../versements-client/entities/versement-client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Vente)
    private venteRepository: Repository<Vente>,
    @InjectRepository(VersementClient)
    private versementClientRepository: Repository<VersementClient>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientsRepository.create(createClientDto);
    return this.clientsRepository.save(client);
  }

  async findAll(filterDto?: ClientFilterDto): Promise<PaginatedResponse<Client>> {
    const { page = 1, limit = 10, search, hasCredits } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.clientsRepository.createQueryBuilder('client');

    // Filtre par recherche (nom, téléphone, email)
    if (search) {
      queryBuilder.andWhere(
        '(client.nom LIKE :search OR client.telephone LIKE :search OR client.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filtre par crédits en cours
    if (hasCredits) {
      queryBuilder.andWhere('client.totalCredits > 0');
    }

    const [data, total] = await queryBuilder
      .orderBy('client.nom', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${id} introuvable`);
    }

    return client;
  }

  async findByTelephone(telephone: string): Promise<Client | null> {
    return this.clientsRepository.findOne({
      where: { telephone },
    });
  }

  async findByEmail(email: string): Promise<Client | null> {
    return this.clientsRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, updateClientDto);
    return this.clientsRepository.save(client);
  }

  async updateTotalAchats(
    id: string,
    montantAchat: number,
  ): Promise<Client> {
    const client = await this.findOne(id);
    client.totalAchats = Number(client.totalAchats) + montantAchat;
    return this.clientsRepository.save(client);
  }

  async updateTotalCredits(
    id: string,
    montantCredit: number,
  ): Promise<Client> {
    const client = await this.findOne(id);
    client.totalCredits = Number(client.totalCredits) + montantCredit;
    return this.clientsRepository.save(client);
  }

  async getClientsAvecCredits(): Promise<Client[]> {
    return this.clientsRepository
      .createQueryBuilder('client')
      .where('client.totalCredits > 0')
      .orderBy('client.totalCredits', 'DESC')
      .getMany();
  }

  async getTopClients(limit: number = 10): Promise<Client[]> {
    return this.clientsRepository
      .createQueryBuilder('client')
      .orderBy('client.totalAchats', 'DESC')
      .limit(limit)
      .getMany();
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);

    // Vérifier s'il existe des ventes pour ce client
    const ventesCount = await this.venteRepository.count({
      where: { clientId: id },
    });

    if (ventesCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce client : ${ventesCount} vente(s) associée(s). Supprimez d'abord les ventes.`,
      );
    }

    // Vérifier s'il existe des versements pour ce client
    const versementsCount = await this.versementClientRepository.count({
      where: { clientId: id },
    });

    if (versementsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce client : ${versementsCount} versement(s) associé(s). Supprimez d'abord les versements.`,
      );
    }

    await this.clientsRepository.remove(client);
  }

  async getStats(): Promise<any> {
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

  async getHistorique(
    clientId: string,
    params?: { page?: number; limit?: number; type?: 'tous' | 'achats' | 'paiements' },
  ): Promise<any> {
    const { page = 1, limit = 10, type = 'tous' } = params || {};

    // Vérifier que le client existe
    const client = await this.findOne(clientId);

    // Récupérer toutes les ventes du client avec les lignes (pour les stats)
    const ventes = await this.venteRepository.find({
      where: { clientId },
      relations: ['lignes'],
      order: { date: 'DESC' },
    });

    // Récupérer tous les paiements du client (pour les stats)
    const paiements = await this.versementClientRepository.find({
      where: { clientId },
      order: { date: 'DESC' },
    });

    // Calculer le bénéfice total et transformer les ventes
    let beneficeTotal = 0;
    const ventesAvecBenefice = ventes.map((vente) => {
      let beneficeVente = 0;

      const lignes = vente.lignes.map((ligne) => {
        const prixAchat = ligne.prixAchat || 0;
        const beneficeLigne = (ligne.prixUnitaire - prixAchat) * ligne.quantite;
        beneficeVente += beneficeLigne;

        return {
          articleNom: ligne.nom,
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          prixAchat,
          sousTotal: ligne.sousTotal,
          benefice: beneficeLigne,
        };
      });

      beneficeTotal += beneficeVente;

      return {
        id: vente.id,
        numero: vente.numero,
        date: typeof vente.date === 'string' ? vente.date : new Date(vente.date).toISOString(),
        total: Number(vente.total),
        montantPaye: Number(vente.montantPaye),
        montantRestant: Number(vente.montantRestant),
        modePaiement: vente.modePaiement,
        benefice: beneficeVente,
        lignes,
      };
    });

    // Transformer les paiements
    const paymentsTransformed = paiements.map((p) => ({
      id: p.id,
      date: typeof p.date === 'string' ? p.date : new Date(p.date).toISOString(),
      montant: Number(p.montant),
      modePaiement: p.modePaiement,
      reference: p.reference,
      venteNumero: p.venteNumero,
      note: p.note,
    }));

    // Créer la timeline combinée selon le type demandé
    let timelineItems = [];

    if (type === 'tous' || type === 'achats') {
      timelineItems.push(...ventesAvecBenefice.map((v) => ({
        id: v.id,
        type: 'achat' as const,
        date: v.date,
        montant: v.total,
        description: `Achat ${v.numero} • ${v.modePaiement}`,
        reference: v.numero,
        benefice: v.benefice,
      })));
    }

    if (type === 'tous' || type === 'paiements') {
      timelineItems.push(...paymentsTransformed.map((p) => ({
        id: p.id,
        type: 'paiement' as const,
        date: p.date,
        montant: p.montant,
        description: `Paiement ${p.modePaiement}${p.venteNumero ? ` • ${p.venteNumero}` : ''}`,
        reference: p.reference,
      })));
    }

    // Trier par date
    const timelineSorted = timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Appliquer la pagination selon le type
    const skip = (page - 1) * limit;
    let totalItems: number;
    let paginatedData: any;

    if (type === 'achats') {
      // Paginer uniquement les ventes
      totalItems = ventesAvecBenefice.length;
      paginatedData = ventesAvecBenefice.slice(skip, skip + limit);
    } else if (type === 'paiements') {
      // Paginer uniquement les paiements
      totalItems = paymentsTransformed.length;
      paginatedData = paymentsTransformed.slice(skip, skip + limit);
    } else {
      // Paginer la timeline combinée
      totalItems = timelineSorted.length;
      paginatedData = timelineSorted.slice(skip, skip + limit);
    }

    const totalPages = Math.ceil(totalItems / limit);

    // Calculer les statistiques
    const stats = {
      totalAchats: Number(client.totalAchats),
      totalPaye: Number(client.totalAchats) - Number(client.totalCredits),
      detteActuelle: Number(client.totalCredits),
      nombreVentes: ventes.length,
      nombrePaiements: paiements.length,
      beneficeTotal,
      dernierAchat: ventes.length > 0
        ? (typeof ventes[0].date === 'string' ? ventes[0].date : new Date(ventes[0].date).toISOString())
        : undefined,
      dernierPaiement: paiements.length > 0
        ? (typeof paiements[0].date === 'string' ? paiements[0].date : new Date(paiements[0].date).toISOString())
        : undefined,
    };

    return {
      stats,
      ventes: type === 'achats' ? paginatedData : [],
      paiements: type === 'paiements' ? paginatedData : [],
      timeline: type === 'tous' ? paginatedData : [],
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
