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

  async create(createFournisseurDto: CreateFournisseurDto): Promise<Fournisseur> {
    // Vérifier si un fournisseur avec cet email existe déjà
    if (createFournisseurDto.email) {
      const existingFournisseur = await this.fournisseursRepository.findOne({
        where: { email: createFournisseurDto.email },
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
    });

    return this.fournisseursRepository.save(fournisseur);
  }

  async findAll(filterDto?: FournisseurFilterDto): Promise<PaginatedResponse<Fournisseur>> {
    const { page = 1, limit = 10, search, statut } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.fournisseursRepository.createQueryBuilder('fournisseur');

    // Filtre par recherche (nom, email, téléphone)
    if (search) {
      queryBuilder.andWhere(
        '(fournisseur.nom LIKE :search OR fournisseur.email LIKE :search OR fournisseur.telephone LIKE :search)',
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

  async findOne(id: string): Promise<Fournisseur> {
    const fournisseur = await this.fournisseursRepository.findOne({
      where: { id },
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
  ): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id);

    // Vérifier si l'email est modifié et s'il existe déjà
    if (updateFournisseurDto.email && updateFournisseurDto.email !== fournisseur.email) {
      const existingFournisseur = await this.fournisseursRepository.findOne({
        where: { email: updateFournisseurDto.email },
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
  ): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id);

    fournisseur.totalPaye = Number(fournisseur.totalPaye) + montantPaye;
    fournisseur.dette = fournisseur.totalAchats - fournisseur.totalPaye;

    return this.fournisseursRepository.save(fournisseur);
  }

  async updateTotalAchats(
    id: string,
    montantAchats: number,
  ): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id);

    fournisseur.totalAchats = Number(fournisseur.totalAchats) + montantAchats;
    fournisseur.dette = fournisseur.totalAchats - fournisseur.totalPaye;

    return this.fournisseursRepository.save(fournisseur);
  }

  async remove(id: string): Promise<void> {
    const fournisseur = await this.findOne(id);

    // Vérifier s'il existe des approvisionnements pour ce fournisseur
    const approCount = await this.approvisionnementRepository.count({
      where: { fournisseurId: id },
    });

    if (approCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce fournisseur : ${approCount} approvisionnement(s) associé(s). Supprimez d'abord les approvisionnements.`,
      );
    }

    // Vérifier s'il existe des versements pour ce fournisseur
    const versementCount = await this.versementRepository.count({
      where: { fournisseurId: id },
    });

    if (versementCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce fournisseur : ${versementCount} versement(s) associé(s). Supprimez d'abord les versements.`,
      );
    }

    await this.fournisseursRepository.remove(fournisseur);
  }

  async getDette(id: string): Promise<{ dette: number }> {
    const fournisseur = await this.findOne(id);
    return { dette: Number(fournisseur.dette) };
  }

  async getStats(id: string): Promise<any> {
    const fournisseur = await this.findOne(id);

    const approvisionnements = await this.approvisionnementRepository.find({
      where: { fournisseurId: id },
      order: { dateLivraison: 'DESC' },
    });

    const versements = await this.versementRepository.find({
      where: { fournisseurId: id },
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

  async getDetails(id: string): Promise<any> {
    const fournisseur = await this.findOne(id);

    // Récupérer les 5 derniers approvisionnements
    const approvisionnements = await this.approvisionnementRepository.find({
      where: { fournisseurId: id },
      order: { dateLivraison: 'DESC' },
      take: 5,
    });

    // Récupérer les 5 derniers versements
    const versements = await this.versementRepository.find({
      where: { fournisseurId: id },
      order: { date: 'DESC' },
      take: 5,
    });

    // Compter le total
    const [, totalAppros] = await this.approvisionnementRepository.findAndCount({
      where: { fournisseurId: id },
    });

    const [, totalVersements] = await this.versementRepository.findAndCount({
      where: { fournisseurId: id },
    });

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

  async getGlobalStats(): Promise<any> {
    const total = await this.fournisseursRepository.count();

    const totalActifs = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
      .where('fournisseur.statut = :statut', { statut: 'actif' })
      .getCount();

    const statsResult = await this.fournisseursRepository
      .createQueryBuilder('fournisseur')
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
