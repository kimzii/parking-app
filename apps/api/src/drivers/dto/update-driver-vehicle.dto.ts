import { PartialType } from '@nestjs/swagger';
import { CreateDriverVehicleDto } from './create-driver-vehicle.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateDriverVehicleDto extends PartialType(
  CreateDriverVehicleDto,
) {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the vehicle is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
