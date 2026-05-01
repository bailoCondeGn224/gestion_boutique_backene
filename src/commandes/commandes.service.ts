import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Commande } from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { CommandeFilterDto } from './dto/commande-filter.dto';
import { LivrerCommandeDto } from './dto/livrer-commande.dto';
import { StatutCommande } from './enums/statut-commande.enum';
import { VentesService } from '../ventes/ventes.service';
import { ClientsService } from '../clients/clients.service';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class CommandesService {
  constructor(
    @InjectRepository(Commande)
    private commandesRepository: Repository<Commande>,
    @InjectRepository(LigneCommande)
    private lignesCommandeRepository: Repository<LigneCommande>,
    private ventesService: VentesService,
    private clientsService: ClientsService,
    private dataSource: DataSource,
  ) {}

  async generateNumero(organizationId: string): Promise<string> {
    const lastCommande = await this.commandesRepository
      .createQueryBuilder('commande')
      .where('commande.organizationId = :organizationId', { organizationId })
      .orderBy('commande.createdAt', 'DESC')
      .getOne();

    if (!lastCommande) {
      return 'CMD-001';
    }

    const match = lastCommande.numero.match(/CMD-(\d+)/);
    if (!match) {
      return 'CMD-001';
    }

    const nextNumber = parseInt(match[1]) + 1;
    return `CMD-${String(nextNumber).padStart(3, '0')}`;
  }

  async create(
    createCommandeDto: CreateCommandeDto,
    organizationId: string,
  ): Promise<Commande> {
    // Vérifier que le client existe et appartient à l'organisation
    const client = await this.clientsService.findOne(
      organizationId,
      createCommandeDto.clientId,
    );
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Générer le numéro de commande
      const numero = await this.generateNumero(organizationId);

      // Créer la commande SANS les lignes
      const { lignes, ...commandeData } = createCommandeDto;
      const commande = this.commandesRepository.create({
        ...commandeData,
        numero,
        statut: StatutCommande.EN_ATTENTE,
        organizationId,
      });

      const savedCommande = await queryRunner.manager.save(commande);

      // Créer manuellement les lignes avec organizationId
      for (const ligne of lignes) {
        await queryRunner.manager.query(
          `INSERT INTO ligne_commande
           ("commandeId", "articleId", nom, quantite, "prixUnitaire", "sousTotal", "organizationId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            savedCommande.id,
            ligne.articleId,
            ligne.nom,
            ligne.quantite,
            ligne.prixUnitaire,
            ligne.sousTotal,
            organizationId,
          ],
        );
      }

      await queryRunner.commitTransaction();

      // Récupérer la commande complète avec les lignes
      return this.findOne(savedCommande.id, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    organizationId: string,
    filterDto?: CommandeFilterDto,
  ): Promise<PaginatedResponse<Commande>> {
    const {
      page = 1,
      limit = 10,
      search,
      statut,
      clientId,
      dateDebut,
      dateFin,
    } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.commandesRepository
      .createQueryBuilder('commande')
      .leftJoinAndSelect('commande.lignes', 'lignes');

    // Filtre par organization
    queryBuilder.where('commande.organizationId = :organizationId', {
      organizationId,
    });

    // Filtre par recherche (numéro)
    if (search) {
      queryBuilder.andWhere('commande.numero LIKE :search', {
        search: `%${search}%`,
      });
    }

    // Filtre par statut
    if (statut) {
      queryBuilder.andWhere('commande.statut = :statut', { statut });
    }

    // Filtre par client
    if (clientId) {
      queryBuilder.andWhere('commande.clientId = :clientId', { clientId });
    }

    // Filtre par dates
    if (dateDebut) {
      queryBuilder.andWhere('commande.createdAt >= :dateDebut', { dateDebut });
    }
    if (dateFin) {
      queryBuilder.andWhere('commande.createdAt <= :dateFin', { dateFin });
    }

    // Pagination et tri
    queryBuilder
      .orderBy('commande.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, organizationId: string): Promise<Commande> {
    const commande = await this.commandesRepository.findOne({
      where: { id, organizationId },
      relations: ['lignes'],
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    return commande;
  }

  async update(
    id: string,
    updateCommandeDto: UpdateCommandeDto,
    organizationId: string,
  ): Promise<Commande> {
    const commande = await this.findOne(id, organizationId);

    // Vérifier que la commande est en attente
    if (commande.statut !== StatutCommande.EN_ATTENTE) {
      throw new BadRequestException(
        'Seules les commandes en attente peuvent être modifiées',
      );
    }

    // Vérifier le client si modifié
    if (
      updateCommandeDto.clientId &&
      updateCommandeDto.clientId !== commande.clientId
    ) {
      const client = await this.clientsService.findOne(
        organizationId,
        updateCommandeDto.clientId,
      );
      if (!client) {
        throw new NotFoundException('Client non trouvé');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Si les lignes sont modifiées, les supprimer et recréer
      if (updateCommandeDto.lignes) {
        await queryRunner.manager.delete(LigneCommande, {
          commandeId: id,
        });

        for (const ligne of updateCommandeDto.lignes) {
          await queryRunner.manager.query(
            `INSERT INTO ligne_commande
             ("commandeId", "articleId", nom, quantite, "prixUnitaire", "sousTotal", "organizationId", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              id,
              ligne.articleId,
              ligne.nom,
              ligne.quantite,
              ligne.prixUnitaire,
              ligne.sousTotal,
              organizationId,
            ],
          );
        }
      }

      // Mettre à jour la commande
      const { lignes, ...commandeData } = updateCommandeDto;
      await queryRunner.manager.update(Commande, id, commandeData);

      await queryRunner.commitTransaction();

      return this.findOne(id, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async livrerCommande(
    id: string,
    livrerCommandeDto: LivrerCommandeDto,
    organizationId: string,
    userId: string,
    userNom: string,
  ): Promise<{ commande: Commande; vente: any }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Récupérer la commande
      const commande = await this.findOne(id, organizationId);

      // Vérifier que la commande est en attente
      if (commande.statut !== StatutCommande.EN_ATTENTE) {
        throw new BadRequestException(
          'La commande est déjà livrée ou annulée',
        );
      }

      // Créer la vente à partir de la commande
      const vente = await this.ventesService.create(
        {
          clientId: commande.clientId,
          lignes: commande.lignes.map((ligne) => ({
            articleId: ligne.articleId,
            nom: ligne.nom,
            quantite: ligne.quantite,
            prixUnitaire: Number(ligne.prixUnitaire),
            sousTotal: Number(ligne.sousTotal),
          })),
          total: Number(commande.total),
          montantPaye: Number(commande.acompte) + Number(livrerCommandeDto.montantPaye),
          montantRestant: Math.max(
            0,
            Number(commande.montantRestant) - Number(livrerCommandeDto.montantPaye),
          ),
          modePaiement: livrerCommandeDto.modePaiement,
          userId,
          userNom,
        },
        organizationId,
      );

      // Mettre à jour la commande
      await queryRunner.manager.update(Commande, id, {
        statut: StatutCommande.LIVREE,
        dateLivree: new Date(),
        venteId: vente.id,
      });

      await queryRunner.commitTransaction();

      const updatedCommande = await this.findOne(id, organizationId);
      return { commande: updatedCommande, vente };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async annulerCommande(
    id: string,
    organizationId: string,
  ): Promise<Commande> {
    const commande = await this.findOne(id, organizationId);

    // Vérifier que la commande est en attente
    if (commande.statut !== StatutCommande.EN_ATTENTE) {
      throw new BadRequestException(
        'Seules les commandes en attente peuvent être annulées',
      );
    }

    await this.commandesRepository.update(id, {
      statut: StatutCommande.ANNULEE,
    });

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const commande = await this.findOne(id, organizationId);

    // On peut supprimer seulement les commandes annulées ou en attente
    if (commande.statut === StatutCommande.LIVREE) {
      throw new BadRequestException(
        'Les commandes livrées ne peuvent pas être supprimées',
      );
    }

    await this.commandesRepository.delete(id);
  }

  async getStats(organizationId: string): Promise<any> {
    const queryBuilder = this.commandesRepository
      .createQueryBuilder('commande')
      .where('commande.organizationId = :organizationId', { organizationId });

    const [
      total,
      enAttente,
      livrees,
      annulees,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .clone()
        .andWhere('commande.statut = :statut', {
          statut: StatutCommande.EN_ATTENTE,
        })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('commande.statut = :statut', {
          statut: StatutCommande.LIVREE,
        })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('commande.statut = :statut', {
          statut: StatutCommande.ANNULEE,
        })
        .getCount(),
    ]);

    // Calculer le total des acomptes
    const { sum: totalAcomptes } = await queryBuilder
      .clone()
      .andWhere('commande.statut = :statut', {
        statut: StatutCommande.EN_ATTENTE,
      })
      .select('SUM(commande.acompte)', 'sum')
      .getRawOne();

    // Calculer la valeur totale des commandes en attente
    const { sum: valeurEnAttente } = await queryBuilder
      .clone()
      .andWhere('commande.statut = :statut', {
        statut: StatutCommande.EN_ATTENTE,
      })
      .select('SUM(commande.total)', 'sum')
      .getRawOne();

    return {
      total,
      enAttente,
      livrees,
      annulees,
      totalAcomptes: Number(totalAcomptes) || 0,
      valeurEnAttente: Number(valeurEnAttente) || 0,
    };
  }
}
