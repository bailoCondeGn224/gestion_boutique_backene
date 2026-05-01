import { IsNumber, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ModePaiement } from '../../ventes/entities/vente.entity';

export class LivrerCommandeDto {
  @ApiProperty({
    example: 120000,
    minimum: 0,
    description: 'Montant payé à la livraison',
  })
  @IsNumber()
  @Min(0, { message: 'Le montant payé ne peut pas être négatif' })
  montantPaye: number;

  @ApiProperty({
    example: 'especes',
    enum: ModePaiement,
    description: 'Mode de paiement à la livraison',
  })
  @IsEnum(ModePaiement, { message: 'Mode de paiement invalide' })
  modePaiement: ModePaiement;

  @ApiProperty({
    example: 'Client satisfait',
    required: false,
    description: 'Note de livraison',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
