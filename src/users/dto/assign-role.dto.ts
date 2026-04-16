import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ example: 'uuid-role-id', description: 'ID du rôle à assigner' })
  @IsUUID()
  roleId: string;
}
