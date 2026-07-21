import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginCustomerDto {
  @ApiProperty({ example: '624123456' })
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  telephone: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  password: string;
}
