import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, DataSource } from 'typeorm';
import { Depense, CategorieDepense, StatutDepense } from './entities/depense.entity';
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
   *
   * Utilise des intervalles semi-ouverts [dateDebut, dateFin) où dateFin est exclue.
   * Une dépense à la date de fin d'un inventaire appartient à l'inventaire suivant.
   * Exemple : Si Inventaire A = [1 mai, 15 mai), une dépense du 15 mai appartient à l'inventaire suivant
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
      .andWhere(':date >= inventaire."dateDebut" AND :date < inventaire."dateFin"', { date })
      .getOne();

    if (inventaireCloture) {
      throw new BadRequestException(
        `Impossible d'enregistrer une dépense pour cette date. ` +
        `Elle appartient à une période d'inventaire déjà clôturée ` +
        `(du ${new Date(inventaireCloture.dateDebut).toLocaleDateString('fr-FR')} ` +
        `au ${new Date(inventaireCloture.dateFin).toLocaleDateString('fr-FR')} exclu). ` +
        `Les finances de cette période ont déjà été calculées et ne peuvent plus être modifiées. ` +
        `Vous pouvez enregistrer cette dépense à partir du ${new Date(inventaireCloture.dateFin).toLocaleDateString('fr-FR')}.`,
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
    const { page = 1, limit = 20, dateDebut, dateFin, type, categorie, statut, search } = filters;

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

    // Filtrer par statut
    if (statut) {
      query.andWhere('depense.statut = :statut', { statut });
    }

    // Recherche textuelle
    if (search) {
      query.andWhere(
        '(depense.description IILIKE :search OR depense.reference IILIKE :search)',
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
    const currentDate = depense.date instanceof Date
      ? depense.date.toISOString().split('T')[0]
      : String(depense.date).split('T')[0];
    await this.validateDateNotInClosedInventaire(
      currentDate,
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
    // Vérifier que la dépense existe
    const depense = await this.findOne(id, organizationId);

    // Vérifier que la dépense n'est pas déjà attachée à un inventaire clôturé
    if (depense.inventaireId) {
      throw new BadRequestException(
        'Impossible de supprimer une dépense déjà rattachée à un inventaire clôturé. ' +
        'Les finances de cet inventaire ont déjà été calculées.',
      );
    }

    // Vérifier que la dépense n'appartient pas à une période clôturée
    // Handle date as either Date object or string (TypeORM can return either)
    let dateStr: string;
    if (depense.date instanceof Date) {
      dateStr = depense.date.toISOString().split('T')[0];
    } else {
      // Already a string, extract date part if it includes time
      dateStr = String(depense.date).split('T')[0];
    }

    await this.validateDateNotInClosedInventaire(
      dateStr,
      organizationId,
    );

    // Utiliser delete() au lieu de remove() pour éviter les erreurs
    await this.depenseRepository.delete({ id, organizationId });
  }

  /**
   * Calculer les totaux de dépenses par catégorie pour une période
   * Utilisé pour les calculs financiers d'inventaire
   *
   * Utilise des intervalles semi-ouverts [dateDebut, dateFin) où dateFin est exclue
   *
   * @param organizationId - ID de l'organisation
   * @param dateDebut - Date de début de la période (incluse)
   * @param dateFin - Date de fin de la période (exclue)
   * @param inventaireId - ID de l'inventaire (optionnel, pour recalcul)
   * @param isRecalcul - True si c'est un recalcul (utilise les dépenses attachées)
   * @param inventaireCreatedAt - Date de création de l'inventaire (pour filtrer par createdAt)
   */
  async getTotalsByCategorie(
    organizationId: string,
    dateDebut: Date,
    dateFin: Date,
    inventaireId?: string,
    isRecalcul: boolean = false,
    inventaireCreatedAt?: Date,
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
      // Conditions :
      // - Date comptable dans [dateDebut, dateFin)
      // - Créée AVANT l'inventaire (si inventaireCreatedAt fourni)
      // - Pas encore attachée à un inventaire
      query
        .andWhere('depense.date >= :dateDebut AND depense.date < :dateFin', {
          dateDebut,
          dateFin,
        })
        .andWhere('depense.inventaireId IS NULL');

      // Filtrer par createdAt si fourni (pour exclure les dépenses rétroactives)
      if (inventaireCreatedAt) {
        query.andWhere('depense.createdAt < :inventaireCreatedAt', {
          inventaireCreatedAt,
        });
      }
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
   *
   * Utilise des intervalles semi-ouverts [dateDebut, dateFin) où dateFin est exclue
   *
   * LOGIQUE : Attache toutes les dépenses NON ENCORE LIÉES à un inventaire qui :
   * 1. Ont une date comptable dans la période [dateDebut, dateFin)
   * 2. Ont été CRÉÉES AVANT la création de l'inventaire (createdAt < inventaireCreatedAt)
   *
   * Cela permet d'exclure les dépenses rétroactives créées après l'inventaire.
   */
  async attacherAInventaire(
    organizationId: string,
    dateDebut: Date,
    dateFin: Date,
    inventaireId: string,
    inventaireCreatedAt: Date,
  ): Promise<number> {
    // Attacher toutes les dépenses non attachées de la période à cet inventaire
    // Conditions :
    // - Date comptable dans [dateDebut, dateFin)
    // - Créée AVANT l'inventaire (createdAt < inventaireCreatedAt)
    // - Pas encore attachée à un inventaire
    const result = await this.depenseRepository
      .createQueryBuilder()
      .update()
      .set({
        inventaireId,
        statut: StatutDepense.INCLUSE, // Marquer la dépense comme incluse dans un inventaire
      })
      .where('organizationId = CAST(:organizationId AS uuid)', { organizationId })
      .andWhere('date >= :dateDebut AND date < :dateFin', {
        dateDebut,
        dateFin,
      })
      .andWhere('createdAt < :inventaireCreatedAt', {
        inventaireCreatedAt,
      })
      .andWhere('inventaireId IS NULL')
      .execute();

    console.log(`✅ ${result.affected || 0} dépense(s) attachée(s) à l'inventaire ${inventaireId} (créées avant ${inventaireCreatedAt.toLocaleString('fr-FR')})`);
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
