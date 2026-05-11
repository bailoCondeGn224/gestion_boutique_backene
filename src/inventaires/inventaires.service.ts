import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Inventaire, StatutInventaire } from './entities/inventaire.entity';
import { ComptageInventaire } from './entities/comptage-inventaire.entity';
import { Article } from '../stock/entities/article.entity';
import {
  MouvementStock,
  TypeMouvement,
  MotifMouvement,
} from '../mouvements-stock/entities/mouvement-stock.entity';
import { CreateInventaireDto } from './dto/create-inventaire.dto';
import { AddComptageDto } from './dto/add-comptage.dto';

@Injectable()
export class InventairesService {
  constructor(
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
    @InjectRepository(ComptageInventaire)
    private comptageRepository: Repository<ComptageInventaire>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(MouvementStock)
    private mouvementRepository: Repository<MouvementStock>,
    private dataSource: DataSource,
  ) {}

  /**
   * Créer un nouvel inventaire
   * Compte automatiquement le nombre total d'articles actifs
   */
  async create(
    createInventaireDto: CreateInventaireDto,
    userId: string,
    organizationId: string,
    responsableNom: string,
  ): Promise<Inventaire> {
    // Récupérer le dernier inventaire terminé
    const dernierInventaire = await this.inventaireRepository.findOne({
      where: { organizationId, statut: StatutInventaire.TERMINE },
      order: { date: 'DESC' },
    });

    // Vérifier que la date n'est pas dans le futur
    if (createInventaireDto.date) {
      const dateInventaire = new Date(createInventaireDto.date);
      const maintenant = new Date();

      if (dateInventaire > maintenant) {
        throw new BadRequestException(
          'Impossible de créer un inventaire pour une date future',
        );
      }

      // Vérifier que la date n'est pas antérieure au dernier inventaire
      if (dernierInventaire && dateInventaire < dernierInventaire.date) {
        const dateFormat = new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(dernierInventaire.date);

        throw new BadRequestException(
          `Un inventaire a déjà été fait le ${dateFormat}. Vous ne pouvez pas créer un inventaire avec une date antérieure.`,
        );
      }
    }

    // Compter le nombre total d'articles actifs dans l'organisation
    const totalArticles = await this.articleRepository.count({
      where: { organizationId },
    });

    const inventaire = this.inventaireRepository.create({
      ...createInventaireDto,
      date: createInventaireDto.date ? new Date(createInventaireDto.date) : undefined,
      organizationId,
      responsableId: userId,
      responsableNom,
      totalArticles,
      statut: StatutInventaire.EN_COURS,
    });

    return this.inventaireRepository.save(inventaire);
  }

  /**
   * Liste les inventaires d'une organisation
   */
  async findAll(organizationId: string): Promise<Inventaire[]> {
    return this.inventaireRepository.find({
      where: { organizationId },
      relations: ['responsable', 'comptages'],
      order: { date: 'DESC' },
    });
  }

  /**
   * Retourne la date minimale autorisée pour un nouvel inventaire
   * (date du dernier inventaire terminé + 1 jour)
   */
  async getDateMin(organizationId: string): Promise<{ dateMin: string | null }> {
    const dernierInventaire = await this.inventaireRepository.findOne({
      where: { organizationId, statut: StatutInventaire.TERMINE },
      order: { date: 'DESC' },
    });

    if (!dernierInventaire) {
      return { dateMin: null }; // Aucun inventaire précédent, pas de limite
    }

    // Retourner la date du dernier inventaire (on peut créer à partir de cette date)
    return { dateMin: dernierInventaire.date.toISOString() };
  }

  /**
   * Détails d'un inventaire avec ses comptages et statistiques
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const inventaire = await this.inventaireRepository.findOne({
      where: { id, organizationId },
      relations: ['responsable', 'comptages', 'comptages.article'],
    });

    if (!inventaire) {
      throw new NotFoundException('Inventaire non trouvé');
    }

    // Calculer les statistiques des écarts
    let articlesManquants = 0;
    let articlesSurplus = 0;
    let valeurPertes = 0;
    let valeurSurplus = 0;

    for (const comptage of inventaire.comptages || []) {
      if (comptage.ecart < 0) {
        articlesManquants += Math.abs(comptage.ecart);
        valeurPertes += Math.abs(comptage.ecart) * (comptage.article?.prixAchat || 0);
      } else if (comptage.ecart > 0) {
        articlesSurplus += comptage.ecart;
        valeurSurplus += comptage.ecart * (comptage.article?.prixAchat || 0);
      }
    }

    return {
      ...inventaire,
      statistiques: {
        articlesManquants,
        articlesSurplus,
        valeurPertes: Math.round(valeurPertes),
        valeurSurplus: Math.round(valeurSurplus),
        valeurNetteEcart: Math.round(valeurSurplus - valeurPertes),
      },
    };
  }

  /**
   * Ajouter un comptage d'article
   */
  async addComptage(
    inventaireId: string,
    addComptageDto: AddComptageDto,
    organizationId: string,
    comptePar: string,
  ): Promise<ComptageInventaire> {
    // Vérifier que l'inventaire existe et est EN_COURS
    const inventaire = await this.inventaireRepository.findOne({
      where: { id: inventaireId, organizationId },
    });

    if (!inventaire) {
      throw new NotFoundException('Inventaire non trouvé');
    }

    if (inventaire.statut !== StatutInventaire.EN_COURS) {
      throw new BadRequestException(
        'Impossible de compter: l\'inventaire est terminé',
      );
    }

    // Récupérer l'article et son stock actuel
    const article = await this.articleRepository.findOne({
      where: { id: addComptageDto.articleId, organizationId },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé');
    }

    // Vérifier si l'article n'a pas déjà été compté
    const comptageExistant = await this.comptageRepository.findOne({
      where: {
        inventaireId,
        articleId: addComptageDto.articleId,
      },
    });

    if (comptageExistant) {
      throw new BadRequestException('Cet article a déjà été compté');
    }

    // Calculer l'écart: quantiteComptee - quantiteSysteme
    const ecart = addComptageDto.quantiteComptee - article.stock;

    // Créer le comptage
    const comptage = this.comptageRepository.create({
      inventaireId,
      articleId: article.id,
      articleNom: article.nom,
      quantiteSysteme: article.stock,
      quantiteComptee: addComptageDto.quantiteComptee,
      ecart,
      note: addComptageDto.note,
      comptePar,
    });

    await this.comptageRepository.save(comptage);

    // Mettre à jour les compteurs de l'inventaire
    await this.updateInventaireStats(inventaireId);

    return comptage;
  }

  /**
   * Mettre à jour les statistiques d'un inventaire
   */
  private async updateInventaireStats(inventaireId: string): Promise<void> {
    const comptages = await this.comptageRepository.find({
      where: { inventaireId },
    });

    const articlesComptes = comptages.length;
    const articlesAvecEcarts = comptages.filter((c) => c.ecart !== 0).length;

    await this.inventaireRepository.update(inventaireId, {
      articlesComptes,
      articlesAvecEcarts,
    });
  }

  /**
   * Récupérer les écarts d'un inventaire avec statistiques
   */
  async getEcarts(
    inventaireId: string,
    organizationId: string,
  ): Promise<any> {
    const inventaire = await this.inventaireRepository.findOne({
      where: { id: inventaireId, organizationId },
    });

    if (!inventaire) {
      throw new NotFoundException('Inventaire non trouvé');
    }

    const comptages = await this.comptageRepository.find({
      where: { inventaireId },
      relations: ['article'],
      order: { ecart: 'ASC' },
    });

    // Calculer les statistiques
    let articlesManquants = 0;
    let articlesSurplus = 0;
    let valeurPertes = 0;
    let valeurSurplus = 0;

    for (const comptage of comptages) {
      if (comptage.ecart < 0) {
        articlesManquants += Math.abs(comptage.ecart);
        valeurPertes += Math.abs(comptage.ecart) * (comptage.article?.prixAchat || 0);
      } else if (comptage.ecart > 0) {
        articlesSurplus += comptage.ecart;
        valeurSurplus += comptage.ecart * (comptage.article?.prixAchat || 0);
      }
    }

    return {
      comptages,
      statistiques: {
        articlesManquants,
        articlesSurplus,
        valeurPertes: Math.round(valeurPertes),
        valeurSurplus: Math.round(valeurSurplus),
        valeurNetteEcart: Math.round(valeurSurplus - valeurPertes),
      },
    };
  }

  /**
   * Valider un inventaire et ajuster les stocks
   * - Marque l'inventaire comme TERMINE
   * - Crée des mouvements de stock AJUSTEMENT_INVENTAIRE
   * - Met à jour les quantités dans Article
   */
  async valider(
    inventaireId: string,
    organizationId: string,
    userId: string,
  ): Promise<Inventaire> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Vérifier l'inventaire
      const inventaire = await queryRunner.manager.findOne(Inventaire, {
        where: { id: inventaireId, organizationId },
      });

      if (!inventaire) {
        throw new NotFoundException('Inventaire non trouvé');
      }

      if (inventaire.statut === StatutInventaire.TERMINE) {
        throw new BadRequestException('Inventaire déjà terminé');
      }

      // Récupérer tous les comptages
      const comptages = await queryRunner.manager.find(ComptageInventaire, {
        where: { inventaireId },
      });

      // Pour chaque comptage avec écart, créer ajustement et mettre à jour stock
      for (const comptage of comptages) {
        if (comptage.ecart === 0) {
          continue; // Pas d'ajustement nécessaire
        }

        // Récupérer l'article
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: comptage.articleId, organizationId },
        });

        if (!article) {
          continue; // Article supprimé entre-temps
        }

        const stockAvant = article.stock;
        const stockApres = comptage.quantiteComptee;
        const quantite = Math.abs(comptage.ecart);
        const prixUnitaire = article.prixAchat || 0;

        // Créer le mouvement de stock
        const mouvement = queryRunner.manager.create(MouvementStock, {
          organizationId,
          articleId: article.id,
          articleNom: article.nom,
          type: comptage.ecart > 0 ? TypeMouvement.ENTREE : TypeMouvement.SORTIE,
          motif: MotifMouvement.AJUSTEMENT,
          quantite,
          stockAvant,
          stockApres,
          prixUnitaire,
          valeurTotal: quantite * prixUnitaire,
          reference: `INV-${inventaire.id.substring(0, 8)}`,
          note: comptage.note || 'Ajustement suite inventaire physique',
          userId,
          userNom: inventaire.responsableNom,
          date: new Date(),
        });

        await queryRunner.manager.save(mouvement);

        // Mettre à jour le stock de l'article
        await queryRunner.manager.update(Article, article.id, {
          stock: stockApres,
        });
      }

      // Marquer l'inventaire comme TERMINE
      await queryRunner.manager.update(Inventaire, inventaireId, {
        statut: StatutInventaire.TERMINE,
        termineLe: new Date(),
      });

      await queryRunner.commitTransaction();

      // Récupérer l'inventaire mis à jour
      return this.findOne(inventaireId, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
