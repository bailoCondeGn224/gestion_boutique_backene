import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fournisseur } from './entities/fournisseur.entity';
import { Approvisionnement } from '../approvisionnements/entities/approvisionnement.entity';
import { Versement } from '../versements/entities/versement.entity';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { FournisseurFilterDto } from './dto/fournisseur-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class FournisseursService {
  constructor(
    @InjectRepository(Fournisseur)
    private fournisseursRepository: Repository<Fournisseur>,
    @InjectRepository(Approvisionnement)
    private approvisionnementRepository: Repository<Approvisionnement>,
    @InjectRepository(Versement)
    private versementRepository: Repository<Versement>,
  ) {}

  async create(createFournisseurDto: CreateFournisseurDto, organizationId: string): Promise<Fournisseur> {
    // Vérifier si un fournisseur avec cet email existe déjà dans cette organisation
    if (createFournisseurDto.email) {
      const existingFournisseur = await this.fournisseursRepository.findOne({
        where: { email: createFournisseurDto.email, organizationId },
      });

      if (existingFournisseur) {
        throw new ConflictException(
          `Un fournisseur avec l'email "${createFournisseurDto.email}" existe déjà`,
        );
      }
    }

    const dette =
      (createFournisseurDto.totalAchats || 0) -
      (createFournisseurDto.totalPaye || 0);

    const fournisseur = this.fournisseursRepository.create({
      ...createFournisseurDto,
      dette,
      organizationId,
    });

    return this.fournisseursRepository.save(fournisseur);
  }

  async findAll(organizationId: string, filterDto?: FournisseurFilterDto): Promise<PaginatedResponse<Fournisseur>> {
    const { page = 1, limit = 10, search, statut } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.fournisseursRepository.createQueryBuilder('fournisseur');

    // Filtrage par organization (CRITIQUE pour multi-tenant)
    queryBuilder.where('fournisseur.organizationId = :organizationId', { organizationId });

    // Filtre par recherche (nom, email, téléphone)
    if (search) {
      queryBuilder.andWhere(
        '(fournisseur.nom ILIKE :search OR fournisseur.email ILIKE :search OR fournisseur.telephone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filtre par statut
    if (statut) {
      queryBuilder.andWhere('fournisseur.statut = :statut', { statut });
    }

    const [data, total] = await queryBuilder
      .orderBy('fournisseur.nom', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, organizationId: string): Promise<Fournisseur> {
    const fournisseur = await this.fournisseursRepository.findOne({
      where: { id, organizationId },
    });

    if (!fournisseur) {
      throw new NotFoundException(
        `Fournisseur avec l'ID ${id} introuvable`,
      );
    }

    return fournisseur;
  }

  async update(
    id: string,
    updateFournisseurDto: UpdateFournisseurDto,
    organizationId: string,
  ): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id, organizationId);

    // Vérifier si l'email est modifié et s'il existe déjà dans cette organisation
    if (updateFournisseurDto.email && updateFournisseurDto.email !== fournisseur.email) {
      const existingFournisseur = await this.fournisseursRepository.findOne({
        where: { email: updateFournisseurDto.email, organizationId },
      });

      if (existingFournisseur) {
        throw new ConflictException(
          `Un autre fournisseur avec l'email "${updateFournisseurDto.email}" existe déjà`,
        );
      }
    }

    Object.assign(fournisseur, updateFournisseurDto);

    fournisseur.dette = fournisseur.totalAchats - fournisseur.totalPaye;

    return this.fournisseursRepository.save(fournisseur);
  }

  async updateTotalPaye(
    id: string,
    montantPaye: number,
    organizationId: string,
  ): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id, organizationId);

    fournisseur.totalPaye = Number(fournisseur.totalPaye) + montantPaye;
    fournisseur.dette = fournisseur.totalAchats - fournisseur.totalPaye;

    return this.fournisseursRepository.save(fournisseur);
  }

  async updateTotalAchats(
    id: string,
    montantAchats: number,
    organizationId: string,
  ): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id, organizationId);

    fournisseur.totalAchats = Number(fournisseur.totalAchats) + montantAchats;
    fournisseur.dette = fournisseur.totalAchats - fournisseur.totalPaye;

    return this.fournisseursRepository.save(fournisseur);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const fournisseur = await this.findOne(id, organizationId);

    // Vérifier s'il existe des approvisionnements pour ce fournisseur
    const approCount = await this.approvisionnementRepository.count({
      where: { fournisseurId: id, organizationId },
    });

    if (approCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce fournisseur : ${approCount} approvisionnement(s) associé(s). Supprimez d'abord les approvisionnements.`,
      );
    }

    // Vérifier s'il existe des versements pour ce fournisseur
    const versementCount = await this.versementRepository.count({
      where: { fournisseurId: id, organizationId },
    });

    if (versementCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce fournisseur : ${versementCount} versement(s) associé(s). Supprimez d'abord les versements.`,
      );
    }

    await this.fournisseursRepository.remove(fournisseur);
  }

  async getDette(id: string, organizationId: string): Promise<{ dette: number }> {
    const fournisseur = await this.findOne(id, organizationId);
    return { dette: Number(fournisseur.dette) };
  }

  async getStats(id: string, organizationId: string): Promise<any> {
    const fournisseur = await this.findOne(id, organizationId);

    const approvisionnements = await this.approvisionnementRepository.find({
      where: { fournisseurId: id, organizationId },
      order: { dateLivraison: 'DESC' },
    });

    const versements = await this.versementRepository.find({
      where: { fournisseurId: id, organizationId },
      order: { date: 'DESC' },
    });

    const dernierAppro = approvisionnements[0];
    const dernierVersement = versements[0];

    return {
      totalAchats: Number(fournisseur.totalAchats),
      totalPaye: Number(fournisseur.totalPaye),
      dette: Number(fournisseur.dette),
      nombreApprovisionnements: approvisionnements.length,
      nombreVersements: versements.length,
      dernierApprovisionnement: dernierAppro
        ? {
            date: dernierAppro.dateLivraison,
            montant: Number(dernierAppro.total),
          }
        : null,
      dernierVersement: dernierVersement
        ? {
            date: dernierVersement.date,
            montant: Number(dernierVersement.montant),
          }
        : null,
    };
  }

  async getDetails(
    id: string,
    organizationId: string,
    approPage: number = 1,
    approLimit: number = 10,
  ): Promise<any> {
    const fournisseur = await this.findOne(id, organizationId);

    // Récupérer les approvisionnements avec pagination
    const [approvisionnements, totalAppros] = await this.approvisionnementRepository.findAndCount({
      where: { fournisseurId: id, organizationId },
      order: { dateLivraison: 'DESC' },
      skip: (approPage - 1) * approLimit,
      take: approLimit,
    });

    // Récupérer les 5 derniers versements (pas paginé pour l'instant)
    const versements = await this.versementRepository.find({
      where: { fournisseurId: id, organizationId },
      order: { date: 'DESC' },
      take: 5,
    });

    const [, totalVersements] = await this.versementRepository.findAndCount({
      where: { fournisseurId: id, organizationId },
    });

    // Métadonnées de pagination pour approvisionnements
    const totalPages = Math.ceil(totalAppros / approLimit);

    return {
      ...fournisseur,
      approvisionnements: approvisionnements.map((appro) => ({
        id: appro.id,
        numero: appro.numero,
        dateLivraison: appro.dateLivraison,
        total: Number(appro.total),
        montantPaye: Number(appro.montantPaye),
        montantRestant: Number(appro.montantRestant),
        createdAt: appro.createdAt,
      })),
      approMeta: {
        currentPage: approPage,
        totalPages,
        totalItems: totalAppros,
        itemsPerPage: approLimit,
      },
      versements: versements.map((vers) => ({
        id: vers.id,
        montant: Number(vers.montant),
        modePaiement: vers.modePaiement,
        date: vers.date,
        reference: vers.reference,
        createdAt: vers.createdAt,
      })),
      stats: {
        nombreApprovisionnements: totalAppros,
        nombreVersements: totalVersements,
        dernierApprovisionnement: approvisionnements[0]?.dateLivraison || null,
        dernierVersement: versements[0]?.date || null,
      },
    };
  }

  async getGlobalStats(organizationId: string): Promise<any> {
    const total = await this.fournisseursRepository.count({
      where: { organizationId },
    });

    const totalActifs = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
      .where('fournisseur.organizationId = :organizationId', { organizationId })
      .andWhere('fournisseur.statut = :statut', { statut: 'actif' })
      .getCount();

    const statsResult = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
      .where('fournisseur.organizationId = :organizationId', { organizationId })
      .select('SUM(fournisseur.totalAchats)', 'totalAchats')
      .addSelect('SUM(fournisseur.dette)', 'detteTotal')
      .addSelect('COUNT(CASE WHEN fournisseur.dette > 0 THEN 1 END)', 'nombreCreanciers')
      .getRawOne();

    return {
      total,
      actifs: totalActifs,
      totalDette: parseFloat(statsResult?.detteTotal || '0'),
      fournisseursEnDette: parseInt(statsResult?.nombreCreanciers || '0', 10),
      totalAchats: parseFloat(statsResult?.totalAchats || '0'),
    };
  }
}
