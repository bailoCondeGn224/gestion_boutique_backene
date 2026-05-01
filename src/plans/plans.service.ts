import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanCode } from './enums/plan-code.enum';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private plansRepository: Repository<Plan>,
  ) {}

  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    // Vérifier si un plan avec le même code existe déjà
    const existingPlanByCode = await this.plansRepository.findOne({
      where: { code: createPlanDto.code },
    });
    if (existingPlanByCode) {
      throw new ConflictException(
        `Un plan avec le code "${createPlanDto.code}" existe déjà`,
      );
    }

    // Vérifier si un plan avec le même nom existe déjà
    const existingPlanByNom = await this.plansRepository.findOne({
      where: { nom: createPlanDto.nom },
    });
    if (existingPlanByNom) {
      throw new ConflictException(
        `Un plan avec le nom "${createPlanDto.nom}" existe déjà`,
      );
    }

    const plan = this.plansRepository.create(createPlanDto);
    return this.plansRepository.save(plan);
  }

  async findAll(): Promise<Plan[]> {
    return this.plansRepository.find({
      where: { actif: true },
      order: { prixMensuel: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan avec l'ID ${id} introuvable`);
    }
    return plan;
  }

  async findByCode(code: PlanCode): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { code } });
    if (!plan) {
      throw new NotFoundException(`Plan avec le code ${code} introuvable`);
    }
    return plan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(id);

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà pour un autre plan
    if (updatePlanDto.nom && updatePlanDto.nom !== plan.nom) {
      const existingPlanByNom = await this.plansRepository.findOne({
        where: { nom: updatePlanDto.nom },
      });
      if (existingPlanByNom && existingPlanByNom.id !== id) {
        throw new ConflictException(
          `Un plan avec le nom "${updatePlanDto.nom}" existe déjà`,
        );
      }
    }

    Object.assign(plan, updatePlanDto);
    return this.plansRepository.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.plansRepository.remove(plan);
  }
}
