import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';

export class CreateDriverVehicleDto {
  @ApiProperty({
    example: 'ABC-1234',
    description: 'Vehicle plate number',
  })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiPropertyOptional({
    enum: VehicleType,
    example: VehicleType.CAR,
    description: 'Type of vehicle',
  })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({
    example: 'Toyota',
    description: 'Vehicle brand/make',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'Camry',
    description: 'Vehicle model',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: 'Red',
    description: 'Vehicle color',
  })
  @IsOptional()
  @IsString()
  color?: string;
}
