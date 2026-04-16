import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VersementClient } from './entities/versement-client.entity';
import { CreateVersementClientDto } from './dto/create-versement-client.dto';
import { UpdateVersementClientDto } from './dto/update-versement-client.dto';
import { VersementClientFilterDto } from './dto/versement-client-filter.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { Client } from '../clients/entities/client.entity';
import { Vente } from '../ventes/entities/vente.entity';

@Injectable()
export class VersementsClientService {
  constructor(
    @InjectRepository(VersementClient)
    private versementClientRepository: Repository<VersementClient>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Vente)
    private venteRepository: Repository<Vente>,
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateVersementClientDto): Promise<VersementClient> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Vérifier que le client existe
      const client = await this.clientRepository.findOne({
        where: { id: createDto.clientId },
      });

      if (!client) {
        throw new NotFoundException('Client introuvable');
      }

      // Vérifier que le montant ne dépasse pas la dette du client
      if (createDto.montant > client.totalCredits) {
        throw new BadRequestException(
          `Le montant du versement (${createDto.montant}) dépasse la dette du client (${client.totalCredits})`,
        );
      }

      // Si versement pour une vente spécifique, vérifier
      let venteNumero: string | undefined;
      if (createDto.venteId) {
        const vente = await this.venteRepository.findOne({
          where: { id: createDto.venteId },
        });

        if (!vente) {
          throw new NotFoundException('Vente introuvable');
        }

        if (vente.clientId !== createDto.clientId) {
          throw new BadRequestException('Cette vente n\'appartient pas à ce client');
        }

        // Vérifier que le versement ne dépasse pas le montant restant de la vente
        if (createDto.montant > vente.montantRestant) {
          throw new BadRequestException(
            `Le montant du versement (${createDto.montant}) dépasse le montant restant de la vente (${vente.montantRestant})`,
          );
        }

        // Récupérer le numéro de vente pour l'enregistrer
        venteNumero = vente.numero;

        // Mettre à jour la vente
        await queryRunner.manager.update(Vente, createDto.venteId, {
          montantPaye: vente.montantPaye + createDto.montant,
          montantRestant: vente.montantRestant - createDto.montant,
        });
      }

      // Créer le versement avec le venteNumero si disponible
      const versement = this.versementClientRepository.create({
        ...createDto,
        date: new Date(createDto.date),
        venteNumero,
      });
      const savedVersement = await queryRunner.manager.save(versement);

      // Mettre à jour le totalCredits du client (diminuer la dette)
      await queryRunner.manager.update(Client, createDto.clientId, {
        totalCredits: client.totalCredits - createDto.montant,
      });

      await queryRunner.commitTransaction();
      return savedVersement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filterDto?: VersementClientFilterDto): Promise<PaginatedResponse<VersementClient>> {
    const { page = 1, limit = 10, clientId, venteId, dateDebut, dateFin, search } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.versementClientRepository.createQueryBuilder('versement');

    // Filtre par client
    if (clientId) {
      queryBuilder.andWhere('versement.clientId = :clientId', { clientId });
    }

    // Filtre par vente
    if (venteId) {
      queryBuilder.andWhere('versement.venteId = :venteId', { venteId });
    }

    // Filtre par date de début
    if (dateDebut) {
      queryBuilder.andWhere('versement.date >= :dateDebut', { dateDebut: new Date(dateDebut) });
    }

    // Filtre par date de fin
    if (dateFin) {
      queryBuilder.andWhere('versement.date <= :dateFin', { dateFin: new Date(dateFin) });
    }

    // Recherche par nom client ou référence
    if (search) {
      queryBuilder.andWhere(
        '(versement.clientNom ILIKE :search OR versement.reference ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Tri par date décroissante (plus récent en premier)
    queryBuilder.orderBy('versement.date', 'DESC');
    queryBuilder.addOrderBy('versement.createdAt', 'DESC');

    // Pagination
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<VersementClient> {
    const versement = await this.versementClientRepository.findOne({
      where: { id },
      relations: ['client', 'vente'],
    });

    if (!versement) {
      throw new NotFoundException('Versement introuvable');
    }

    return versement;
  }

  async findByClient(clientId: string): Promise<VersementClient[]> {
    return this.versementClientRepository.find({
      where: { clientId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async update(id: string, updateDto: UpdateVersementClientDto): Promise<VersementClient> {
    const versement = await this.findOne(id);
    Object.assign(versement, updateDto);
    return this.versementClientRepository.save(versement);
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const versement = await this.findOne(id);

      // Restaurer le totalCredits du client
      const client = await this.clientRepository.findOne({
        where: { id: versement.clientId },
      });

      if (client) {
        await queryRunner.manager.update(Client, versement.clientId, {
          totalCredits: client.totalCredits + versement.montant,
        });
      }

      // Si versement lié à une vente, restaurer montantRestant
      if (versement.venteId) {
        const vente = await this.venteRepository.findOne({
          where: { id: versement.venteId },
        });

        if (vente) {
          await queryRunner.manager.update(Vente, versement.venteId, {
            montantPaye: vente.montantPaye - versement.montant,
            montantRestant: vente.montantRestant + versement.montant,
          });
        }
      }

      // Supprimer le versement
      await queryRunner.manager.delete(VersementClient, id);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
