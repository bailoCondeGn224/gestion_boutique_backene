import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnlineOrderStatut, ModeLivraison } from '../entities/online-order.entity';

export class OnlineOrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  articleId: string;

  @ApiProperty()
  articleNom: string;

  @ApiPropertyOptional()
  modeVenteId?: string;

  @ApiPropertyOptional()
  modeVenteNom?: string;

  @ApiProperty()
  quantite: number;

  @ApiPropertyOptional()
  quantiteBase?: number;

  @ApiProperty()
  prixUnitaire: number;

  @ApiProperty()
  sousTotal: number;
}

export class OnlineOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  numero: string;

  @ApiProperty({ enum: OnlineOrderStatut })
  statut: OnlineOrderStatut;

  @ApiProperty({ enum: ModeLivraison })
  modeLivraison: ModeLivraison;

  @ApiPropertyOptional()
  adresseLivraison?: string;

  @ApiPropertyOptional()
  telephoneLivraison?: string;

  @ApiProperty()
  fraisLivraison: number;

  @ApiProperty()
  sousTotal: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  customerNom: string;

  @ApiProperty()
  customerTelephone: string;

  @ApiPropertyOptional()
  motifAnnulation?: string;

  @ApiProperty({ type: [OnlineOrderItemResponseDto] })
  items: OnlineOrderItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  confirmeeLe?: Date;

  @ApiPropertyOptional()
  preteLe?: Date;

  @ApiPropertyOptional()
  livreeLe?: Date;

  @ApiPropertyOptional()
  annuleeLe?: Date;

  @ApiPropertyOptional()
  expedieeLe?: Date;

  @ApiPropertyOptional()
  livreurId?: string;

  @ApiPropertyOptional()
  livreurNom?: string;

  @ApiPropertyOptional()
  livreurTelephone?: string;

  @ApiPropertyOptional()
  whatsappLink?: string;
}
