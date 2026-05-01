import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Plan } from '../plans/entities/plan.entity';
import { Vente } from '../ventes/entities/vente.entity';
import { Client } from '../clients/entities/client.entity';
import { Article } from '../stock/entities/article.entity';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Vente)
    private venteRepository: Repository<Vente>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async getGlobalStats() {
    const [
      totalOrganizations,
      totalUsers,
      totalVentes,
      totalClients,
      totalArticles,
      activeOrganizations,
    ] = await Promise.all([
      this.organizationRepository.count(),
      this.userRepository.count({ where: { isSuperAdmin: false } }),
      this.venteRepository.count(),
      this.clientRepository.count(),
      this.articleRepository.count(),
      this.organizationRepository.count({ where: { actif: true } }),
    ]);

    return {
      totalOrganizations,
      activeOrganizations,
      inactiveOrganizations: totalOrganizations - activeOrganizations,
      totalUsers,
      totalVentes,
      totalClients,
      totalArticles,
    };
  }

  async getAllOrganizations() {
    return this.organizationRepository.find({
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrganizationDetails(organizationId: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['plan'],
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const [
      totalUsers,
      totalVentes,
      totalClients,
      totalArticles,
      recentVentes,
    ] = await Promise.all([
      this.userRepository.count({
        where: { organization: { id: organizationId } },
      }),
      this.venteRepository.count({
        where: { organizationId },
      }),
      this.clientRepository.count({
        where: { organizationId },
      }),
      this.articleRepository.count({
        where: { organizationId },
      }),
      this.venteRepository.find({
        where: { organizationId },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['client'],
      }),
    ]);

    // Calculer le CA total
    const ventesResult = await this.venteRepository
      .createQueryBuilder('vente')
      .select('SUM(vente.montantTotal)', 'total')
      .where('vente.organizationId = :organizationId', { organizationId })
      .getRawOne();

    const chiffreAffaires = Number(ventesResult?.total || 0);

    return {
      organization,
      stats: {
        totalUsers,
        totalVentes,
        totalClients,
        totalArticles,
        chiffreAffaires,
      },
      recentVentes,
    };
  }

  async getOrganizationsByPlan() {
    const plans = await this.planRepository.find();

    const stats = await Promise.all(
      plans.map(async (plan) => {
        const count = await this.organizationRepository.count({
          where: { plan: { id: plan.id } },
        });
        return {
          plan: plan.nom,
          planCode: plan.code,
          count,
        };
      }),
    );

    return stats;
  }

  async getRecentActivity(limit: number = 10) {
    const recentOrganizations = await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['plan'],
    });

    const recentUsers = await this.userRepository.find({
      where: { isSuperAdmin: false },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['organization', 'role'],
    });

    return {
      recentOrganizations,
      recentUsers,
    };
  }

  async getGrowthStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      organizationsThisMonth,
      organizationsLastMonth,
      usersThisMonth,
      usersLastMonth,
    ] = await Promise.all([
      this.organizationRepository.count({
        where: { createdAt: startOfMonth as any },
      }),
      this.organizationRepository
        .createQueryBuilder('org')
        .where('org.createdAt >= :start', { start: startOfLastMonth })
        .andWhere('org.createdAt <= :end', { end: endOfLastMonth })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.isSuperAdmin = :isSuperAdmin', { isSuperAdmin: false })
        .andWhere('user.createdAt >= :start', { start: startOfMonth })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.isSuperAdmin = :isSuperAdmin', { isSuperAdmin: false })
        .andWhere('user.createdAt >= :start', { start: startOfLastMonth })
        .andWhere('user.createdAt <= :end', { end: endOfLastMonth })
        .getCount(),
    ]);

    return {
      organizations: {
        thisMonth: organizationsThisMonth,
        lastMonth: organizationsLastMonth,
        growth:
          organizationsLastMonth > 0
            ? ((organizationsThisMonth - organizationsLastMonth) / organizationsLastMonth) * 100
            : 0,
      },
      users: {
        thisMonth: usersThisMonth,
        lastMonth: usersLastMonth,
        growth:
          usersLastMonth > 0
            ? ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100
            : 0,
      },
    };
  }
}
