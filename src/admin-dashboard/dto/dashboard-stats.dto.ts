import { ApiProperty } from '@nestjs/swagger';

export class GlobalStatsDto {
  @ApiProperty({ description: 'Nombre total d\'organizations' })
  totalOrganizations: number;

  @ApiProperty({ description: 'Nombre d\'organizations actives' })
  activeOrganizations: number;

  @ApiProperty({ description: 'Nombre d\'organizations inactives' })
  inactiveOrganizations: number;

  @ApiProperty({ description: 'Nombre total d\'utilisateurs (hors super admins)' })
  totalUsers: number;

  @ApiProperty({ description: 'Nombre total de ventes' })
  totalVentes: number;

  @ApiProperty({ description: 'Nombre total de clients' })
  totalClients: number;

  @ApiProperty({ description: 'Nombre total d\'articles' })
  totalArticles: number;
}

export class OrganizationsByPlanDto {
  @ApiProperty({ description: 'Nom du plan' })
  plan: string;

  @ApiProperty({ description: 'Code du plan' })
  planCode: string;

  @ApiProperty({ description: 'Nombre d\'organizations sur ce plan' })
  count: number;
}

export class GrowthStatsDto {
  @ApiProperty({
    description: 'Statistiques de croissance des organizations',
    example: { thisMonth: 5, lastMonth: 3, growth: 66.67 },
  })
  organizations: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };

  @ApiProperty({
    description: 'Statistiques de croissance des utilisateurs',
    example: { thisMonth: 12, lastMonth: 8, growth: 50 },
  })
  users: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
}
