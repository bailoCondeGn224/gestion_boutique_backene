import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Versement } from './entities/versement.entity';
import { CreateVersementDto } from './dto/create-versement.dto';
import { UpdateVersementDto } from './dto/update-versement.dto';
import { FournisseursService } from '../fournisseurs/fournisseurs.service';
import { ApprovisionnementService } from '../approvisionnements/approvisionnements.service';
import { VersementFilterDto } from './dto/versement-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class VersementsService {
  constructor(
    @InjectRepository(Versement)
    private versementsRepository: Repository<Versement>,
    private fournisseursService: FournisseursService,
    private approvisionnementService: ApprovisionnementService,
    private dataSource: DataSource,
  ) {}

  async create(createVersementDto: CreateVersementDto, organizationId: string): Promise<Versement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // Fix Issue #7: Isolation level

    try {
      // Fix Issue #1: Lock rows FIRST, then validate
      // Verrouiller le fournisseur avec SELECT ... FOR UPDATE
      const fournisseurRows = await queryRunner.manager.query(
        `SELECT * FROM fournisseur WHERE id = $1 AND "organizationId" = $2 FOR UPDATE`,
        [createVersementDto.fournisseurId, organizationId],
      );

      if (fournisseurRows.length === 0) {
        throw new NotFoundException(
          `Fournisseur avec l'ID ${createVersementDto.fournisseurId} introuvable`,
        );
      }

      const fournisseur = fournisseurRows[0];
      let approvisionnement = null;
      let approvisionnementNumero = null;

      // Si un approvisionnement est spécifié, le verrouiller et valider
      if (createVersementDto.approvisionnementId) {
        const approRows = await queryRunner.manager.query(
          `SELECT * FROM approvisionnement WHERE id = $1 AND "organizationId" = $2 FOR UPDATE`,
          [createVersementDto.approvisionnementId, organizationId],
        );

        if (approRows.length === 0) {
          throw new NotFoundException(
            `Approvisionnement avec l'ID ${createVersementDto.approvisionnementId} introuvable`,
          );
        }

        approvisionnement = approRows[0];

        // Vérifier que l'approvisionnement appartient au bon fournisseur
        if (approvisionnement.fournisseurId !== createVersementDto.fournisseurId) {
          throw new BadRequestException(
            'L\'approvisionnement ne correspond pas au fournisseur sélectionné',
          );
        }

        // CRITICAL: Valider APRÈS verrouillage avec les valeurs actuelles
        if (Number(createVersementDto.montant) > Number(approvisionnement.montantRestant)) {
          throw new BadRequestException(
            `Le montant du versement (${createVersementDto.montant} GNF) dépasse le montant restant de l'approvisionnement (${approvisionnement.montantRestant} GNF)`,
          );
        }

        approvisionnementNumero = approvisionnement.numero;
      }

      // Recalculer la dette réelle du fournisseur (Fix Issue #8)
      const detteResult = await queryRunner.manager.query(
        `SELECT COALESCE(SUM("montantRestant"), 0) as dette_reelle
         FROM approvisionnement
         WHERE "fournisseurId" = $1 AND "organizationId" = $2 AND statut = 'VALIDE'`,
        [createVersementDto.fournisseurId, organizationId],
      );

      const detteReelle = Number(detteResult[0]?.dette_reelle || 0);

      // Vérifier que le montant ne dépasse pas la dette totale du fournisseur
      if (Number(createVersementDto.montant) > detteReelle) {
        throw new BadRequestException(
          `Le montant du versement (${createVersementDto.montant} GNF) dépasse la dette du fournisseur (${detteReelle} GNF)`,
        );
      }

      const versement = this.versementsRepository.create({
        ...createVersementDto,
        fournisseurNom: fournisseur.nom,
        approvisionnementNumero,
        date: createVersementDto.date ? new Date(createVersementDto.date) : new Date(),
        organizationId,
      });

      const savedVersement = await queryRunner.manager.save(versement);

      // Fix Issue #12: Mettre à jour le fournisseur dans la même transaction
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalPaye" = "totalPaye" + $1
         WHERE id = $2 AND "organizationId" = $3`,
        [Number(createVersementDto.montant), fournisseur.id, organizationId],
      );

      // Si un approvisionnement est lié, mettre à jour son montantPaye
      if (approvisionnement) {
        const nouveauMontantPaye = Number(approvisionnement.montantPaye) + Number(createVersementDto.montant);
        const nouveauMontantRestant = Number(approvisionnement.total) - nouveauMontantPaye;

        await queryRunner.manager.query(
          `UPDATE approvisionnement
           SET "montantPaye" = $1, "montantRestant" = $2
           WHERE id = $3 AND "organizationId" = $4`,
          [nouveauMontantPaye, nouveauMontantRestant, approvisionnement.id, organizationId],
        );
      }

      await queryRunner.commitTransaction();

      return savedVersement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(organizationId: string, filterDto?: VersementFilterDto): Promise<PaginatedResponse<Versement>> {
    const { page = 1, limit = 10, search, fournisseurId, dateDebut, dateFin, modePaiement } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.versementsRepository.createQueryBuilder('versement');

    // Filtrage par organization (CRITIQUE pour multi-tenant)
    queryBuilder.where('versement.organizationId = :organizationId', { organizationId });

    // Filtre par recherche (référence)
    if (search) {
      queryBuilder.andWhere('versement.reference ILIKE :search', { search: `%${search}%` });
    }

    // Filtre par fournisseur
    if (fournisseurId) {
      queryBuilder.andWhere('versement.fournisseurId = :fournisseurId', { fournisseurId });
    }

    // Filtre par date de début
    if (dateDebut) {
      queryBuilder.andWhere('versement.date >= :dateDebut', { dateDebut: new Date(dateDebut) });
    }

    // Filtre par date de fin
    if (dateFin) {
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('versement.date <= :dateFin', { dateFin: endDate });
    }

    // Filtre par mode de paiement
    if (modePaiement) {
      queryBuilder.andWhere('versement.modePaiement = :modePaiement', { modePaiement });
    }

    const [data, total] = await queryBuilder
      .orderBy('versement.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, organizationId: string): Promise<Versement> {
    const versement = await this.versementsRepository.findOne({
      where: { id, organizationId },
    });

    if (!versement) {
      throw new NotFoundException(`Versement avec l'ID ${id} introuvable`);
    }

    return versement;
  }

  async findByFournisseur(
    fournisseurId: string,
    organizationId: string,
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<Versement>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.versementsRepository.findAndCount({
      where: { fournisseurId, organizationId },
      order: { date: 'DESC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async getMontantsMois(organizationId: string): Promise<{ total: number; count: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const versements = await this.versementsRepository.find({
      where: {
        organizationId,
        date: Between(startOfMonth, endOfMonth),
      },
    });

    const total = versements.reduce(
      (sum, v) => sum + Number(v.montant),
      0,
    );

    return {
      total,
      count: versements.length,
    };
  }

  async update(
    id: string,
    updateVersementDto: UpdateVersementDto,
    organizationId: string,
  ): Promise<Versement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // Fix Issue #7

    try {
      const versement = await this.findOne(id, organizationId);
      const oldMontant = Number(versement.montant);
      const oldFournisseurId = versement.fournisseurId;

      // Si le montant change, ajuster le totalPaye du fournisseur
      if (updateVersementDto.montant !== undefined && updateVersementDto.montant !== oldMontant) {
        const difference = Number(updateVersementDto.montant) - oldMontant;

        // Vérifier que le nouveau montant ne dépasse pas la dette
        const fournisseur = await this.fournisseursService.findOne(oldFournisseurId, organizationId);
        const nouvelleDette = Number(fournisseur.dette) - difference;

        if (nouvelleDette < 0) {
          throw new BadRequestException(
            `Le nouveau montant (${updateVersementDto.montant} GNF) dépasse la dette du fournisseur`,
          );
        }

        // Fix Issue #4: Si versement lié à approvisionnement, valider aussi
        if (versement.approvisionnementId) {
          const appro = await this.approvisionnementService.findOne(
            versement.approvisionnementId,
            organizationId,
          );

          // Calculer ce que serait le nouveau montantRestant de l'approvisionnement
          const newApproMontantPaye = Number(appro.montantPaye) - oldMontant + Number(updateVersementDto.montant);
          const newApproMontantRestant = Number(appro.total) - newApproMontantPaye;

          if (newApproMontantRestant < 0) {
            throw new BadRequestException(
              `Impossible de modifier ce montant : cela dépasserait le total de l'approvisionnement (${appro.numero})`,
            );
          }
        }

        // Ajuster le totalPaye du fournisseur avec vérification de l'organization
        await queryRunner.manager.query(
          `UPDATE fournisseur
           SET "totalPaye" = "totalPaye" + $1,
               dette = "totalAchats" - ("totalPaye" + $1)
           WHERE id = $2 AND "organizationId" = $3`,
          [difference, oldFournisseurId, organizationId],
        );
      }

      // Si le fournisseur change (cas rare mais possible)
      if (updateVersementDto.fournisseurId && updateVersementDto.fournisseurId !== oldFournisseurId) {
        // Vérifier que le nouveau fournisseur appartient à la même organization
        const newFournisseur = await this.fournisseursService.findOne(updateVersementDto.fournisseurId, organizationId);

        // Rétablir le totalPaye de l'ancien fournisseur
        await queryRunner.manager.query(
          `UPDATE fournisseur
           SET "totalPaye" = "totalPaye" - $1,
               dette = "totalAchats" - ("totalPaye" - $1)
           WHERE id = $2 AND "organizationId" = $3`,
          [oldMontant, oldFournisseurId, organizationId],
        );

        // Ajouter au totalPaye du nouveau fournisseur
        const newMontant = updateVersementDto.montant ?? oldMontant;
        await queryRunner.manager.query(
          `UPDATE fournisseur
           SET "totalPaye" = "totalPaye" + $1,
               dette = "totalAchats" - ("totalPaye" + $1)
           WHERE id = $2 AND "organizationId" = $3`,
          [newMontant, updateVersementDto.fournisseurId, organizationId],
        );

        // Mettre à jour le nom du fournisseur
        updateVersementDto['fournisseurNom'] = newFournisseur.nom;
      }

      // Mettre à jour le versement
      Object.assign(versement, updateVersementDto);
      const updatedVersement = await queryRunner.manager.save(versement);

      await queryRunner.commitTransaction();
      return updatedVersement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const versement = await this.findOne(id, organizationId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // Fix Issue #7

    try {
      // Mettre à jour le totalPaye du fournisseur dans la transaction
      await queryRunner.manager.query(
        `UPDATE fournisseur
         SET "totalPaye" = "totalPaye" - $1
         WHERE id = $2 AND "organizationId" = $3`,
        [Number(versement.montant), versement.fournisseurId, organizationId],
      );

      // Fix Issue #6: Si versement lié à approvisionnement, vérifier qu'il existe avant de restaurer
      if (versement.approvisionnementId) {
        const approExists = await queryRunner.manager.query(
          `SELECT id, total, "montantPaye" FROM approvisionnement
           WHERE id = $1 AND "organizationId" = $2`,
          [versement.approvisionnementId, organizationId],
        );

        // Seulement restaurer si l'approvisionnement existe encore
        if (approExists.length > 0) {
          const appro = approExists[0];
          const nouveauMontantPaye = Number(appro.montantPaye) - Number(versement.montant);
          const nouveauMontantRestant = Number(appro.total) - nouveauMontantPaye;

          await queryRunner.manager.query(
            `UPDATE approvisionnement
             SET "montantPaye" = $1, "montantRestant" = $2
             WHERE id = $3 AND "organizationId" = $4`,
            [nouveauMontantPaye, nouveauMontantRestant, appro.id, organizationId],
          );
        }
        // Si approvisionnement n'existe plus, on supprime quand même le versement (orphelin)
      }

      await queryRunner.manager.remove(versement);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
