import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { CreateZakatDto } from './create-zakat.dto';
import { ZakatStatus } from '../enums/zakat-status.enum';

export class UpdateZakatDto extends PartialType(CreateZakatDto) {
  @IsOptional()
  @IsEnum(ZakatStatus)
  statut?: ZakatStatus;

  @IsOptional()
  @IsDateString()
  datePaiement?: string;
}
