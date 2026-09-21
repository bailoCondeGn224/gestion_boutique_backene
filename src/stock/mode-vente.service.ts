import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ModeVente } from './entities/mode-vente.entity';
import { CreateModeVenteDto } from './dto/create-mode-vente.dto';
import { UpdateModeVenteDto } from './dto/update-mode-vente.dto';
import { ModeVenteInlineDto } from './dto/mode-vente-inline.dto';
import { Article } from './entities/article.entity';

const TABLES_REFERENCANT_MODE = [
  'ligne_vente',
  'ligne_commande',
  'ligne_approvisionnement',
  'online_order_item',
  'ligne_retour_client',
  'ligne_retour_fournisseur',
];

const cleNom = (nom: string) => nom.trim().toLowerCase();

@Injectable()
export class ModeVenteService {
  constructor(
    @InjectRepository(ModeVente)
    private modeVenteRepository: Repository<ModeVente>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async create(
    createDto: CreateModeVenteDto,
    organizationId: string,
  ): Promise<ModeVente> {
    const article = await this.articleRepository.findOne({
      where: { id: createDto.articleId, organizationId },
    });

    if (!article) {
      throw new NotFoundException(`Article avec l'ID ${createDto.articleId} introuvable`);
    }

    if (createDto.parDefaut) {
      await this.modeVenteRepository.update(
        { articleId: createDto.articleId, organizationId },
        { parDefaut: false },
      );
    }

    const modeVente = this.modeVenteRepository.create({
      ...createDto,
      organizationId,
    });

    return this.modeVenteRepository.save(modeVente);
  }

  async createMany(
    articleId: string,
    modes: Array<Omit<CreateModeVenteDto, 'articleId'>>,
    organizationId: string,
  ): Promise<ModeVente[]> {
    const created: ModeVente[] = [];

    for (const mode of modes) {
      const modeVente = this.modeVenteRepository.create({
        ...mode,
        articleId,
        organizationId,
      });
      created.push(await this.modeVenteRepository.save(modeVente));
    }

    return created;
  }

  async findByArticle(articleId: string, organizationId: string): Promise<ModeVente[]> {
    return this.modeVenteRepository.find({
      where: { articleId, organizationId },
      order: { parDefaut: 'DESC', nom: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<ModeVente> {
    const modeVente = await this.modeVenteRepository.findOne({
      where: { id, organizationId },
      relations: ['article'],
    });

    if (!modeVente) {
      throw new NotFoundException(`Mode de vente avec l'ID ${id} introuvable`);
    }

    return modeVente;
  }

  async findDefault(articleId: string, organizationId: string): Promise<ModeVente | null> {
    return this.modeVenteRepository.findOne({
      where: { articleId, organizationId, parDefaut: true },
    });
  }

  async update(
    id: string,
    updateDto: UpdateModeVenteDto,
    organizationId: string,
  ): Promise<ModeVente> {
    const modeVente = await this.findOne(id, organizationId);

    if (updateDto.parDefaut) {
      await this.modeVenteRepository.update(
        { articleId: modeVente.articleId, organizationId },
        { parDefaut: false },
      );
    }

    Object.assign(modeVente, updateDto);
    return this.modeVenteRepository.save(modeVente);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);
    await this.modeVenteRepository.delete({ id, organizationId });
  }

  async removeByArticle(articleId: string, organizationId: string): Promise<void> {
    await this.modeVenteRepository.delete({ articleId, organizationId });
  }

  /**
   * Aligne les modes de vente d'un article sur la liste reçue, rapprochés par nom.
   * Un mode existant garde son identifiant, référencé par les lignes de vente,
   * commande, retour et approvisionnement. Un mode retiré mais déjà utilisé ne
   * peut pas être supprimé : il est conservé sans être le mode par défaut.
   */
  async syncForArticle(
    articleId: string,
    modes: ModeVenteInlineDto[],
    organizationId: string,
    transaction?: EntityManager,
  ): Promise<{ conserves: string[] }> {
    if (!transaction) {
      return this.modeVenteRepository.manager.transaction((manager) =>
        this.syncForArticle(articleId, modes, organizationId, manager),
      );
    }

    const repo = transaction.getRepository(ModeVente);
    const existants = await repo.find({ where: { articleId, organizationId } });
    const parNom = new Map(existants.map((mode) => [cleNom(mode.nom), mode]));
    const retenus = new Set<string>();

    for (const mode of modes) {
      const existant = parNom.get(cleNom(mode.nom));

      if (existant) {
        existant.quantiteStock = mode.quantiteStock;
        existant.prixVente = mode.prixVente;
        existant.codeBarre = mode.codeBarre ?? existant.codeBarre;
        existant.parDefaut = mode.parDefaut ?? false;
        await repo.save(existant);
        retenus.add(existant.id);
      } else {
        const cree = await repo.save(
          repo.create({ ...mode, articleId, organizationId }),
        );
        retenus.add(cree.id);
      }
    }

    const conserves: string[] = [];

    for (const mode of existants) {
      if (retenus.has(mode.id)) continue;

      if (await this.estReference(transaction, mode.id)) {
        mode.parDefaut = false;
        await repo.save(mode);
        conserves.push(mode.nom);
      } else {
        await repo.delete({ id: mode.id });
      }
    }

    return { conserves };
  }

  private async estReference(manager: EntityManager, modeVenteId: string): Promise<boolean> {
    for (const table of TABLES_REFERENCANT_MODE) {
      const lignes = await manager.query(
        `SELECT 1 FROM "${table}" WHERE "modeVenteId" = $1 LIMIT 1`,
        [modeVenteId],
      );
      if (lignes.length > 0) return true;
    }
    return false;
  }
}
