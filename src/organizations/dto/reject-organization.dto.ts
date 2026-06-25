import { IsString, IsNotEmpty } from 'class-validator';

export class RejectOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Le motif de rejet est obligatoire' })
  motif: string;
}
