import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Modification de la seule position de la boutique par son propre admin.
 *
 * DTO volontairement étroit: PATCH /organizations/:id est réservé au super-admin
 * car il expose le plan, le slug et le statut d'abonnement. Ici l'admin de la
 * boutique ne peut toucher qu'à son point de départ de livraison.
 */
export class UpdateOrganizationPositionDto {
  @ApiProperty({ example: 9.6412 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -13.5784 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
