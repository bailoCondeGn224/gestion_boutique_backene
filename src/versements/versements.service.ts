import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Versement } from './entities/versement.entity';
import { CreateVersementDto } from './dto/create-versement.dto';
import { UpdateVersementDto } from './dto/update-versement.dto';
import { FournisseursService } from '../fournisseurs/fournisseurs.service';
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
    private dataSource: DataSource,
  ) {}

  async create(createVersementDto: CreateVersementDto): Promise<Versement> {
    const fournisseur = await this.fournisseursService.findOne(
      createVersementDto.fournisseurId,
    );

    if (Number(createVersementDto.montant) > Number(fournisseur.dette)) {
      throw new BadRequestException(
        `Le montant du versement (${createVersementDto.montant} GNF) dépasse la dette du fournisseur (${fournisseur.dette} GNF)`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const versement = this.versementsRepository.create({
        ...createVersementDto,
        fournisseurNom: fournisseur.nom,
        date: new Date(),
      });

      const savedVersement = await queryRunner.manager.save(versement);

      await this.fournisseursService.updateTotalPaye(
        fournisseur.id,
        Number(createVersementDto.montant),
      );

      await queryRunner.commitTransaction();

      return savedVersement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filterDto?: VersementFilterDto): Promise<PaginatedResponse<Versement>> {
    const { page = 1, limit = 10, search, fournisseurId, dateDebut, dateFin, modePaiement } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.versementsRepository.createQueryBuilder('versement');

    // Filtre par recherche (référence)
    if (search) {
      queryBuilder.andWhere('versement.reference LIKE :search', { search: `%${search}%` });
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

  async findOne(id: string): Promise<Versement> {
    const versement = await this.versementsRepository.findOne({
      where: { id },
    });

    if (!versement) {
      throw new NotFoundException(`Versement avec l'ID ${id} introuvable`);
    }

    return versement;
  }

  async findByFournisseur(
    fournisseurId: string,
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<Versement>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.versementsRepository.findAndCount({
      where: { fournisseurId },
      order: { date: 'DESC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async getMontantsMois(): Promise<{ total: number; count: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const versements = await this.versementsRepository.find({
      where: {
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
  ): Promise<Versement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const versement = await this.findOne(id);
      const oldMontant = Number(versement.montant);
      const oldFournisseurId = versement.fournisseurId;

      // Si le montant change, ajuster le totalPaye du fournisseur
      if (updateVersementDto.montant !== undefined && updateVersementDto.montant !== oldMontant) {
        const difference = Number(updateVersementDto.montant) - oldMontant;

        // Vérifier que le nouveau montant ne dépasse pas la dette
        const fournisseur = await this.fournisseursService.findOne(oldFournisseurId);
        const nouvelleDette = Number(fournisseur.dette) - difference;

        if (nouvelleDette < 0) {
          throw new BadRequestException(
            `Le nouveau montant (${updateVersementDto.montant} GNF) dépasse la dette du fournisseur`,
          );
        }

        // Ajuster le totalPaye du fournisseur
        await queryRunner.manager.query(
          `UPDATE fournisseur
           SET "totalPaye" = "totalPaye" + $1,
               dette = "totalAchats" - ("totalPaye" + $1)
           WHERE id = $2`,
          [difference, oldFournisseurId],
        );
      }

      // Si le fournisseur change (cas rare mais possible)
      if (updateVersementDto.fournisseurId && updateVersementDto.fournisseurId !== oldFournisseurId) {
        // Rétablir le totalPaye de l'ancien fournisseur
        await queryRunner.manager.query(
          `UPDATE fournisseur
           SET "totalPaye" = "totalPaye" - $1,
               dette = "totalAchats" - ("totalPaye" - $1)
           WHERE id = $2`,
          [oldMontant, oldFournisseurId],
        );

        // Ajouter au totalPaye du nouveau fournisseur
        const newMontant = updateVersementDto.montant ?? oldMontant;
        await queryRunner.manager.query(
          `UPDATE fournisseur
           SET "totalPaye" = "totalPaye" + $1,
               dette = "totalAchats" - ("totalPaye" + $1)
           WHERE id = $2`,
          [newMontant, updateVersementDto.fournisseurId],
        );

        // Mettre à jour le nom du fournisseur
        const newFournisseur = await this.fournisseursService.findOne(updateVersementDto.fournisseurId);
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

  async remove(id: string): Promise<void> {
    const versement = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fournisseur = await this.fournisseursService.findOne(
        versement.fournisseurId,
      );

      fournisseur.totalPaye =
        Number(fournisseur.totalPaye) - Number(versement.montant);
      fournisseur.dette = fournisseur.totalAchats - fournisseur.totalPaye;

      await queryRunner.manager.save(fournisseur);
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
