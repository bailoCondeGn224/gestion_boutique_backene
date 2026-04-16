import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateParametreDto } from './dto/create-parametre.dto';
import { UpdateParametreDto } from './dto/update-parametre.dto';
import { Parametre } from './entities/parametre.entity';

@Injectable()
export class ParametresService {
  constructor(
    @InjectRepository(Parametre)
    private readonly parametreRepository: Repository<Parametre>,
  ) {}

  /**
   * Récupérer les paramètres de l'entreprise
   * Il ne doit y avoir qu'un seul enregistrement
   */
  async getParametres(): Promise<Parametre> {
    const parametres = await this.parametreRepository.find();

    if (parametres.length === 0) {
      throw new NotFoundException('Paramètres non configurés. Veuillez les créer.');
    }

    // Retourner le premier (et unique) enregistrement
    return parametres[0];
  }

  /**
   * Créer les paramètres initiaux (seulement si aucun n'existe)
   */
  async createOrUpdate(createParametreDto: CreateParametreDto): Promise<Parametre> {
    const existing = await this.parametreRepository.find();

    if (existing.length > 0) {
      // Si des paramètres existent déjà, les mettre à jour
      await this.parametreRepository.update(existing[0].id, createParametreDto);
      return this.parametreRepository.findOne({ where: { id: existing[0].id } });
    } else {
      // Sinon, créer de nouveaux paramètres
      const parametre = this.parametreRepository.create(createParametreDto);
      return this.parametreRepository.save(parametre);
    }
  }

  /**
   * Mettre à jour les paramètres existants
   */
  async update(updateParametreDto: UpdateParametreDto): Promise<Parametre> {
    const existing = await this.parametreRepository.find();

    if (existing.length === 0) {
      throw new NotFoundException('Paramètres non trouvés. Veuillez les créer d\'abord.');
    }

    await this.parametreRepository.update(existing[0].id, updateParametreDto);
    return this.parametreRepository.findOne({ where: { id: existing[0].id } });
  }

  /**
   * Mettre à jour le logo
   */
  async updateLogo(filename: string): Promise<Parametre> {
    const existing = await this.parametreRepository.find();

    if (existing.length === 0) {
      throw new NotFoundException('Paramètres non trouvés. Veuillez les créer d\'abord.');
    }

    await this.parametreRepository.update(existing[0].id, { logo: filename });
    return this.parametreRepository.findOne({ where: { id: existing[0].id } });
  }

  /**
   * Récupérer le chemin du logo
   */
  async getLogoPath(): Promise<string | null> {
    try {
      const parametres = await this.getParametres();
      return parametres.logo || null;
    } catch (error) {
      return null;
    }
  }
}
