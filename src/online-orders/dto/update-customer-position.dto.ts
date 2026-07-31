import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerPositionDto {
  @ApiProperty({ description: 'Latitude GPS', example: 9.5370 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude GPS', example: -13.6785 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
