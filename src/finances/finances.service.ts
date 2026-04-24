import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction, TypeTransaction, CategorieTransaction } from './entities/transaction.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class FinancesService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
  ) {}

  async createTransaction(
    organizationId: string,
    data: {
      description: string;
      montant: number;
      type: TypeTransaction;
      categorie: CategorieTransaction;
      venteId?: string;
      versementId?: string;
    },
  ): Promise<Transaction> {
    const transaction = this.transactionsRepository.create({
      ...data,
      organizationId,
      date: new Date(),
    });

    return this.transactionsRepository.save(transaction);
  }

  async getTresorerie(organizationId: string): Promise<{ solde: number; recettes: number; depenses: number }> {
    const recettesResult = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.montant), 0)', 'total')
      .where('transaction.organizationId = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: TypeTransaction.IN })
      .getRawOne();

    const depensesResult = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('COALESCE(SUM(transaction.montant), 0)', 'total')
      .where('transaction.organizationId = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: TypeTransaction.OUT })
      .getRawOne();

    const recettes = Number(recettesResult.total);
    const depenses = Number(depensesResult.total);
    const solde = recettes - depenses;

    return { solde, recettes, depenses };
  }

  async getRecettesMois(organizationId: string): Promise<{ total: number; count: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = await this.transactionsRepository.find({
      where: {
        organizationId,
        type: TypeTransaction.IN,
        date: Between(startOfMonth, endOfMonth),
      },
    });

    const total = transactions.reduce((sum, t) => sum + Number(t.montant), 0);

    return { total, count: transactions.length };
  }

  async getDepensesMois(organizationId: string): Promise<{ total: number; count: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = await this.transactionsRepository.find({
      where: {
        organizationId,
        type: TypeTransaction.OUT,
        date: Between(startOfMonth, endOfMonth),
      },
    });

    const total = transactions.reduce((sum, t) => sum + Number(t.montant), 0);

    return { total, count: transactions.length };
  }

  async getChargesBreakdown(organizationId: string): Promise<any> {
    const result = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('transaction.categorie', 'categorie')
      .addSelect('SUM(transaction.montant)', 'total')
      .where('transaction.organizationId = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: TypeTransaction.OUT })
      .groupBy('transaction.categorie')
      .getRawMany();

    return result.map((item) => ({
      categorie: item.categorie,
      total: Number(item.total),
    }));
  }

  async getTransactions(
    organizationId: string,
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<Transaction>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionsRepository.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async getRapportMensuel(organizationId: string): Promise<any> {
    const tresorerie = await this.getTresorerie(organizationId);
    const recettesMois = await this.getRecettesMois(organizationId);
    const depensesMois = await this.getDepensesMois(organizationId);
    const chargesBreakdown = await this.getChargesBreakdown(organizationId);

    const now = new Date();
    const moisActuel = now.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    return {
      periode: moisActuel,
      tresorerie,
      recettesMois,
      depensesMois,
      chargesBreakdown,
      soldeMois: recettesMois.total - depensesMois.total,
    };
  }

  async getStatsPeriode(organizationId: string, debut: Date, fin: Date): Promise<any> {
    const transactions = await this.transactionsRepository.find({
      where: {
        organizationId,
        date: Between(debut, fin),
      },
    });

    const recettes = transactions
      .filter((t) => t.type === TypeTransaction.IN)
      .reduce((sum, t) => sum + Number(t.montant), 0);

    const depenses = transactions
      .filter((t) => t.type === TypeTransaction.OUT)
      .reduce((sum, t) => sum + Number(t.montant), 0);

    return {
      periode: {
        debut: debut.toISOString().split('T')[0],
        fin: fin.toISOString().split('T')[0],
      },
      recettes,
      depenses,
      solde: recettes - depenses,
      nombreTransactions: transactions.length,
    };
  }
}
