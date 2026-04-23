import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { PlanCode } from '../enums/plan-code.enum';

export class CreatePlanDto {
  @IsString()
  nom: string;

  @IsEnum(PlanCode)
  code: PlanCode;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  prixMensuel: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
