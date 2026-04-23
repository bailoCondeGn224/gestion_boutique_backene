import { Injectable, NotFoundException } from '@nestjs/common';
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
    Object.assign(plan, updatePlanDto);
    return this.plansRepository.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.plansRepository.remove(plan);
  }
}
