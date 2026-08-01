import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePositionDto {
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
