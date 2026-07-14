import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModeVente } from './entities/mode-vente.entity';
import { CreateModeVenteDto } from './dto/create-mode-vente.dto';
import { UpdateModeVenteDto } from './dto/update-mode-vente.dto';
import { Article } from './entities/article.entity';

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
}
