import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categorie } from './entities/categorie.entity';
import { Article } from '../stock/entities/article.entity';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Categorie)
    private categorieRepository: Repository<Categorie>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async create(createDto: CreateCategorieDto): Promise<Categorie> {
    const existingByCode = await this.categorieRepository.findOne({
      where: { code: createDto.code },
    });

    if (existingByCode) {
      throw new ConflictException(
        `Une catégorie avec le code "${createDto.code}" existe déjà`,
      );
    }

    const existingByNom = await this.categorieRepository.findOne({
      where: { nom: createDto.nom },
    });

    if (existingByNom) {
      throw new ConflictException(
        `Une catégorie avec le nom "${createDto.nom}" existe déjà`,
      );
    }

    const categorie = this.categorieRepository.create(createDto);
    return this.categorieRepository.save(categorie);
  }

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResponse<Categorie>> {
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.categorieRepository.findAndCount({
      order: { nom: 'ASC' },
      skip,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  async findActive(): Promise<Categorie[]> {
    return this.categorieRepository.find({
      where: { actif: true },
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Categorie> {
    const categorie = await this.categorieRepository.findOne({
      where: { id },
      relations: ['articles'],
    });

    if (!categorie) {
      throw new NotFoundException(`Catégorie avec l'ID ${id} introuvable`);
    }

    return categorie;
  }

  async findByCode(code: string): Promise<Categorie> {
    const categorie = await this.categorieRepository.findOne({
      where: { code },
    });

    if (!categorie) {
      throw new NotFoundException(
        `Catégorie avec le code "${code}" introuvable`,
      );
    }

    return categorie;
  }

  async update(id: string, updateDto: UpdateCategorieDto): Promise<Categorie> {
    const categorie = await this.findOne(id);

    if (updateDto.code && updateDto.code !== categorie.code) {
      const existingByCode = await this.categorieRepository.findOne({
        where: { code: updateDto.code },
      });

      if (existingByCode) {
        throw new ConflictException(
          `Une autre catégorie avec le code "${updateDto.code}" existe déjà`,
        );
      }
    }

    if (updateDto.nom && updateDto.nom !== categorie.nom) {
      const existingByNom = await this.categorieRepository.findOne({
        where: { nom: updateDto.nom },
      });

      if (existingByNom) {
        throw new ConflictException(
          `Une autre catégorie avec le nom "${updateDto.nom}" existe déjà`,
        );
      }
    }

    Object.assign(categorie, updateDto);
    return this.categorieRepository.save(categorie);
  }

  async remove(id: string): Promise<void> {
    const categorie = await this.findOne(id);

    // Vérifier s'il existe des articles dans cette catégorie
    const articlesCount = await this.articleRepository.count({
      where: { categorieId: id },
    });

    if (articlesCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette catégorie : ${articlesCount} article(s) associé(s). Changez d'abord la catégorie des articles ou supprimez-les.`,
      );
    }

    await this.categorieRepository.remove(categorie);
  }

  async seedDefaultCategories(): Promise<void> {
    const defaultCategories = [
      {
        nom: 'Abayas',
        code: 'abayas',
        description: 'Abayas et robes islamiques',
      },
      {
        nom: 'Foulards',
        code: 'foulards',
        description: 'Foulards et hijabs',
      },
      {
        nom: 'Bazin',
        code: 'bazin',
        description: 'Tissus bazin et brodés',
      },
      {
        nom: 'Autres',
        code: 'autres',
        description: 'Autres articles',
      },
    ];

    for (const catData of defaultCategories) {
      const existing = await this.categorieRepository.findOne({
        where: { code: catData.code },
      });

      if (!existing) {
        const categorie = this.categorieRepository.create(catData);
        await this.categorieRepository.save(categorie);
      }
    }
  }
}
