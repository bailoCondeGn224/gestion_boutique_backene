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

  async create(organizationId: string, createDto: CreateVersementClientDto): Promise<VersementClient> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Vérifier que le client existe et appartient à l'organisation
      const client = await this.clientRepository.findOne({
        where: { id: createDto.clientId, organizationId },
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

      // Vérifier que la vente existe et appartient à l'organisation
      const vente = await this.venteRepository.findOne({
        where: { id: createDto.venteId, organizationId },
      });

      if (!vente) {
        throw new NotFoundException('Vente introuvable');
      }

      // Vérifier que la vente appartient bien au client
      if (vente.clientId !== createDto.clientId) {
        throw new BadRequestException('Cette vente n\'appartient pas à ce client');
      }

      // Vérifier que le versement ne dépasse pas le montant restant de la vente
      if (createDto.montant > vente.montantRestant) {
        throw new BadRequestException(
          `Le montant du versement (${createDto.montant}) dépasse le montant restant de la vente (${vente.montantRestant})`,
        );
      }

      // Mettre à jour la vente (conversion en Number pour éviter la concaténation de strings)
      await queryRunner.manager.update(Vente, createDto.venteId, {
        montantPaye: Number(vente.montantPaye) + Number(createDto.montant),
        montantRestant: Number(vente.montantRestant) - Number(createDto.montant),
      });

      // Créer le versement avec le numéro de vente et organizationId
      const versement = this.versementClientRepository.create({
        ...createDto,
        date: new Date(createDto.date),
        venteNumero: vente.numero,
        organizationId,
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

  async findAll(organizationId: string, filterDto?: VersementClientFilterDto): Promise<PaginatedResponse<VersementClient>> {
    const { page = 1, limit = 10, clientId, venteId, dateDebut, dateFin, search } = filterDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.versementClientRepository.createQueryBuilder('versement');

    // Filtre par organization (toujours en premier avec .where())
    queryBuilder.where('versement.organizationId = :organizationId', { organizationId });

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
        '(versement.clientNom IILIKE :search OR versement.reference IILIKE :search)',
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

  async findOne(organizationId: string, id: string): Promise<VersementClient> {
    const versement = await this.versementClientRepository.findOne({
      where: { id, organizationId },
      relations: ['client', 'vente'],
    });

    if (!versement) {
      throw new NotFoundException('Versement introuvable');
    }

    return versement;
  }

  async findByClient(organizationId: string, clientId: string): Promise<VersementClient[]> {
    return this.versementClientRepository.find({
      where: { clientId, organizationId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async update(organizationId: string, id: string, updateDto: UpdateVersementClientDto): Promise<VersementClient> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const versement = await this.findOne(organizationId, id);

      // ÉTAPE 1: ANNULER le paiement original

      // 1.1 Restaurer l'ancienne vente si elle était liée
      if (versement.venteId) {
        const oldVente = await this.venteRepository.findOne({
          where: { id: versement.venteId, organizationId },
        });

        if (oldVente) {
          await queryRunner.manager.update(Vente, versement.venteId, {
            montantPaye: Number(oldVente.montantPaye) - Number(versement.montant),
            montantRestant: Number(oldVente.montantRestant) + Number(versement.montant),
          });
        }
      }

      // 1.2 Restaurer la dette du client
      const client = await this.clientRepository.findOne({
        where: { id: versement.clientId, organizationId },
      });

      if (!client) {
        throw new NotFoundException('Client introuvable');
      }

      await queryRunner.manager.update(Client, versement.clientId, {
        totalCredits: Number(client.totalCredits) + Number(versement.montant),
      });

      // ÉTAPE 2: APPLIQUER le nouveau paiement

      const newMontant = updateDto.montant ?? versement.montant;
      const newVenteId = updateDto.venteId !== undefined ? updateDto.venteId : versement.venteId;

      // 2.1 Vérifier que le nouveau montant ne dépasse pas la dette totale
      const detteApresRestoration = Number(client.totalCredits) + Number(versement.montant);
      if (Number(newMontant) > detteApresRestoration) {
        throw new BadRequestException(
          `Le montant du versement (${newMontant} GNF) dépasse la dette du client (${detteApresRestoration} GNF)`,
        );
      }

      // 2.2 Si nouvelle vente liée, valider et mettre à jour
      let newVenteNumero = null;
      if (newVenteId) {
        // Si c'est la même vente qu'avant, la récupérer à nouveau après la restauration
        const newVente = await queryRunner.manager.findOne(Vente, {
          where: { id: newVenteId, organizationId },
        });

        if (!newVente) {
          throw new NotFoundException('Vente introuvable');
        }

        if (newVente.clientId !== versement.clientId) {
          throw new BadRequestException('Cette vente n\'appartient pas à ce client');
        }

        if (Number(newMontant) > Number(newVente.montantRestant)) {
          throw new BadRequestException(
            `Le montant du versement (${newMontant} GNF) dépasse le montant restant de la vente (${newVente.montantRestant} GNF)`,
          );
        }

        await queryRunner.manager.update(Vente, newVenteId, {
          montantPaye: Number(newVente.montantPaye) + Number(newMontant),
          montantRestant: Number(newVente.montantRestant) - Number(newMontant),
        });

        newVenteNumero = newVente.numero;
      }

      // 2.3 Mettre à jour la dette du client avec le nouveau montant
      await queryRunner.manager.update(Client, versement.clientId, {
        totalCredits: detteApresRestoration - Number(newMontant),
      });

      // ÉTAPE 3: Mettre à jour l'enregistrement du versement
      Object.assign(versement, {
        ...updateDto,
        venteNumero: newVenteNumero || (newVenteId ? versement.venteNumero : null),
      });

      const savedVersement = await queryRunner.manager.save(versement);

      await queryRunner.commitTransaction();
      return savedVersement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const versement = await this.findOne(organizationId, id);

      // Restaurer le totalCredits du client
      const client = await this.clientRepository.findOne({
        where: { id: versement.clientId, organizationId },
      });

      if (client) {
        await queryRunner.manager.update(Client, versement.clientId, {
          totalCredits: Number(client.totalCredits) + Number(versement.montant),
        });
      }

      // Si versement lié à une vente, restaurer montantRestant
      if (versement.venteId) {
        const vente = await this.venteRepository.findOne({
          where: { id: versement.venteId, organizationId },
        });

        if (vente) {
          await queryRunner.manager.update(Vente, versement.venteId, {
            montantPaye: Number(vente.montantPaye) - Number(versement.montant),
            montantRestant: Number(vente.montantRestant) + Number(versement.montant),
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
