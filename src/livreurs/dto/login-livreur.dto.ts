import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginLivreurDto {
  @ApiProperty({ example: '+224620000000' })
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
