import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, DataSource } from 'typeorm';
import { Depense, CategorieDepense } from './entities/depense.entity';
import { CreateDepenseDto } from './dto/create-depense.dto';
import { UpdateDepenseDto } from './dto/update-depense.dto';
import { DepenseFilterDto } from './dto/depense-filter.dto';

/**
 * Service pour la gestion des dépenses
 */
@Injectable()
export class DepensesService {
  constructor(
    @InjectRepository(Depense)
    private depenseRepository: Repository<Depense>,
    private dataSource: DataSource,
  ) {}

  /**
   * Valider que la date de la dépense n'appartient pas à une période d'inventaire clôturée
   * Règle métier : On ne peut pas ajouter/modifier une dépense dans une période déjà calculée
   */
  private async validateDateNotInClosedInventaire(
    date: string,
    organizationId: string,
  ): Promise<void> {
    const inventaireCloture = await this.dataSource
      .createQueryBuilder()
      .select('inventaire')
      .from('inventaire', 'inventaire')
      .where('inventaire."organizationId" = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('inventaire."financesCalcules" = true')
      .andWhere(':date BETWEEN inventaire."dateDebut" AND inventaire."dateFin"', { date })
      .getOne();

    if (inventaireCloture) {
      throw new BadRequestException(
        `Impossible d'enregistrer une dépense pour cette date. ` +
        `Elle appartient à une période d'inventaire déjà clôturée ` +
        `(du ${new Date(inventaireCloture.dateDebut).toLocaleDateString('fr-FR')} ` +
        `au ${new Date(inventaireCloture.dateFin).toLocaleDateString('fr-FR')}). ` +
        `Les finances de cette période ont déjà été calculées et ne peuvent plus être modifiées.`,
      );
    }
  }

  /**
   * Créer une nouvelle dépense
   */
  async create(
    createDepenseDto: CreateDepenseDto,
    organizationId: string,
    userId?: string,
    userNom?: string,
  ): Promise<Depense> {
    // Valider que la date n'est pas dans le futur
    const dateDepense = new Date(createDepenseDto.date);
    const aujourdhui = new Date();
    aujourdhui.setHours(23, 59, 59, 999);

    if (dateDepense > aujourdhui) {
      throw new BadRequestException(
        'La date de la dépense ne peut pas être dans le futur',
      );
    }

    // Valider que la date n'appartient pas à une période d'inventaire clôturée
    await this.validateDateNotInClosedInventaire(
      createDepenseDto.date,
      organizationId,
    );

    const depense = this.depenseRepository.create({
      ...createDepenseDto,
      organizationId,
      userId,
      userNom,
    });

    return await this.depenseRepository.save(depense);
  }

  /**
   * Récupérer toutes les dépenses avec filtres et pagination
   */
  async findAll(
    organizationId: string,
    filters: DepenseFilterDto,
  ): Promise<{ data: Depense[]; meta: any }> {
    const { page = 1, limit = 20, dateDebut, dateFin, type, categorie, search } = filters;

    const query = this.depenseRepository
      .createQueryBuilder('depense')
      .where('depense.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .leftJoinAndSelect('depense.user', 'user');

    // Filtrer par période
    if (dateDebut && dateFin) {
      query.andWhere('depense.date BETWEEN :dateDebut AND :dateFin', {
        dateDebut,
        dateFin,
      });
    } else if (dateDebut) {
      query.andWhere('depense.date >= :dateDebut', { dateDebut });
    } else if (dateFin) {
      query.andWhere('depense.date <= :dateFin', { dateFin });
    }

    // Filtrer par type
    if (type) {
      query.andWhere('depense.type = :type', { type });
    }

    // Filtrer par catégorie
    if (categorie) {
      query.andWhere('depense.categorie = :categorie', { categorie });
    }

    // Recherche textuelle
    if (search) {
      query.andWhere(
        '(depense.description ILIKE :search OR depense.reference ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Ordre et pagination
    query.orderBy('depense.date', 'DESC').addOrderBy('depense.createdAt', 'DESC');

    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer une dépense par ID
   */
  async findOne(id: string, organizationId: string): Promise<Depense> {
    const depense = await this.depenseRepository.findOne({
      where: { id, organizationId },
      relations: ['user'],
    });

    if (!depense) {
      throw new NotFoundException(`Dépense avec l'ID ${id} introuvable`);
    }

    return depense;
  }

  /**
   * Mettre à jour une dépense
   */
  async update(
    id: string,
    updateDepenseDto: UpdateDepenseDto,
    organizationId: string,
  ): Promise<Depense> {
    const depense = await this.findOne(id, organizationId);

    // Vérifier que la dépense n'est pas déjà attachée à un inventaire clôturé
    if (depense.inventaireId) {
      throw new BadRequestException(
        'Impossible de modifier une dépense déjà rattachée à un inventaire clôturé. ' +
        'Les finances de cet inventaire ont déjà été calculées.',
      );
    }

    // Vérifier d'abord que la dépense actuelle n'est pas dans une période clôturée
    await this.validateDateNotInClosedInventaire(
      depense.date.toISOString().split('T')[0],
      organizationId,
    );

    // Valider la date si elle est modifiée
    if (updateDepenseDto.date) {
      const dateDepense = new Date(updateDepenseDto.date);
      const aujourdhui = new Date();
      aujourdhui.setHours(23, 59, 59, 999);

      if (dateDepense > aujourdhui) {
        throw new BadRequestException(
          'La date de la dépense ne peut pas être dans le futur',
        );
      }

      // Valider que la nouvelle date n'appartient pas à une période clôturée
      await this.validateDateNotInClosedInventaire(
        updateDepenseDto.date,
        organizationId,
      );
    }

    Object.assign(depense, updateDepenseDto);
    return await this.depenseRepository.save(depense);
  }

  /**
   * Supprimer une dépense
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const depense = await this.findOne(id, organizationId);

    // Vérifier que la dépense n'est pas déjà attachée à un inventaire clôturé
    if (depense.inventaireId) {
      throw new BadRequestException(
        'Impossible de supprimer une dépense déjà rattachée à un inventaire clôturé. ' +
        'Les finances de cet inventaire ont déjà été calculées.',
      );
    }

    // Vérifier que la dépense n'appartient pas à une période clôturée
    await this.validateDateNotInClosedInventaire(
      depense.date.toISOString().split('T')[0],
      organizationId,
    );

    await this.depenseRepository.remove(depense);
  }

  /**
   * Calculer les totaux de dépenses par catégorie pour une période
   * Utilisé pour les calculs financiers d'inventaire
   *
   * @param organizationId - ID de l'organisation
   * @param dateDebut - Date de début de la période
   * @param dateFin - Date de fin de la période
   * @param inventaireId - ID de l'inventaire (optionnel, pour recalcul)
   * @param isRecalcul - True si c'est un recalcul (utilise les dépenses attachées)
   */
  async getTotalsByCategorie(
    organizationId: string,
    dateDebut: Date,
    dateFin: Date,
    inventaireId?: string,
    isRecalcul: boolean = false,
  ): Promise<{
    depensesFixes: number;
    depensesVariables: number;
    depensesExceptionnelles: number;
    totalDepenses: number;
  }> {
    const query = this.depenseRepository
      .createQueryBuilder('depense')
      .select('depense.categorie', 'categorie')
      .addSelect('COALESCE(SUM(depense.montant), 0)', 'total')
      .where('depense.organizationId = CAST(:organizationId AS uuid)', { organizationId });

    if (isRecalcul && inventaireId) {
      // Recalcul: utiliser uniquement les dépenses déjà attachées à cet inventaire
      query.andWhere('depense.inventaireId = CAST(:inventaireId AS uuid)', { inventaireId });
    } else {
      // Premier calcul: utiliser les dépenses de la période qui ne sont pas encore attachées
      query
        .andWhere('depense.date BETWEEN :dateDebut AND :dateFin', {
          dateDebut,
          dateFin,
        })
        .andWhere('depense.inventaireId IS NULL');
    }

    const result = await query
      .groupBy('depense.categorie')
      .getRawMany();

    const totaux = {
      depensesFixes: 0,
      depensesVariables: 0,
      depensesExceptionnelles: 0,
      totalDepenses: 0,
    };

    result.forEach((row) => {
      const montant = parseFloat(row.total);
      switch (row.categorie) {
        case CategorieDepense.FIXE:
          totaux.depensesFixes = montant;
          break;
        case CategorieDepense.VARIABLE:
          totaux.depensesVariables = montant;
          break;
        case CategorieDepense.EXCEPTIONNELLE:
          totaux.depensesExceptionnelles = montant;
          break;
      }
      totaux.totalDepenses += montant;
    });

    return totaux;
  }

  /**
   * Attacher les dépenses d'une période à un inventaire
   * Appelé après le calcul des finances pour "verrouiller" les dépenses
   */
  async attacherAInventaire(
    organizationId: string,
    dateDebut: Date,
    dateFin: Date,
    inventaireId: string,
  ): Promise<number> {
    // Vérifier qu'il n'y a pas de dépenses déjà attachées à un autre inventaire
    const depensesDejaAttachees = await this.depenseRepository
      .createQueryBuilder('depense')
      .where('depense.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('depense.date BETWEEN :dateDebut AND :dateFin', {
        dateDebut,
        dateFin,
      })
      .andWhere('depense.inventaireId IS NOT NULL')
      .andWhere('depense.inventaireId != CAST(:inventaireId AS uuid)', { inventaireId })
      .getCount();

    if (depensesDejaAttachees > 0) {
      throw new BadRequestException(
        `${depensesDejaAttachees} dépense(s) de cette période sont déjà rattachées à un autre inventaire. ` +
        'Impossible de calculer les finances pour des périodes qui se chevauchent.',
      );
    }

    // Attacher toutes les dépenses non attachées de la période à cet inventaire
    const result = await this.depenseRepository
      .createQueryBuilder()
      .update()
      .set({ inventaireId })
      .where('organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('date BETWEEN :dateDebut AND :dateFin', {
        dateDebut,
        dateFin,
      })
      .andWhere('inventaireId IS NULL')
      .execute();

    return result.affected || 0;
  }

  /**
   * Obtenir les statistiques de dépenses pour une période
   */
  async getStatistics(
    organizationId: string,
    dateDebut?: string,
    dateFin?: string,
  ): Promise<{
    totalDepenses: number;
    depensesFixes: number;
    depensesVariables: number;
    depensesExceptionnelles: number;
    nombreDepenses: number;
    depenseMoyenne: number;
    repartitionParType: Array<{ type: string; montant: number; pourcentage: number }>;
  }> {
    const query = this.depenseRepository
      .createQueryBuilder('depense')
      .where('depense.organizationId = CAST(:organizationId AS uuid)', { organizationId });

    if (dateDebut && dateFin) {
      query.andWhere('depense.date BETWEEN :dateDebut AND :dateFin', {
        dateDebut,
        dateFin,
      });
    }

    // Totaux par catégorie
    const totauxCategorie = await query
      .select('depense.categorie', 'categorie')
      .addSelect('COALESCE(SUM(depense.montant), 0)', 'total')
      .groupBy('depense.categorie')
      .getRawMany();

    let depensesFixes = 0;
    let depensesVariables = 0;
    let depensesExceptionnelles = 0;

    totauxCategorie.forEach((row) => {
      const montant = parseFloat(row.total);
      switch (row.categorie) {
        case CategorieDepense.FIXE:
          depensesFixes = montant;
          break;
        case CategorieDepense.VARIABLE:
          depensesVariables = montant;
          break;
        case CategorieDepense.EXCEPTIONNELLE:
          depensesExceptionnelles = montant;
          break;
      }
    });

    const totalDepenses = depensesFixes + depensesVariables + depensesExceptionnelles;

    // Nombre de dépenses
    const nombreDepenses = await query.getCount();
    const depenseMoyenne = nombreDepenses > 0 ? totalDepenses / nombreDepenses : 0;

    // Répartition par type
    const repartitionParType = await this.depenseRepository
      .createQueryBuilder('depense')
      .select('depense.type', 'type')
      .addSelect('COALESCE(SUM(depense.montant), 0)', 'montant')
      .where('depense.organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere(
        dateDebut && dateFin
          ? 'depense.date BETWEEN :dateDebut AND :dateFin'
          : '1=1',
        { dateDebut, dateFin },
      )
      .groupBy('depense.type')
      .orderBy('montant', 'DESC')
      .getRawMany();

    const repartitionAvecPourcentage = repartitionParType.map((row) => ({
      type: row.type,
      montant: parseFloat(row.montant),
      pourcentage: totalDepenses > 0 ? (parseFloat(row.montant) / totalDepenses) * 100 : 0,
    }));

    return {
      totalDepenses,
      depensesFixes,
      depensesVariables,
      depensesExceptionnelles,
      nombreDepenses,
      depenseMoyenne,
      repartitionParType: repartitionAvecPourcentage,
    };
  }
}
