import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMultiLevelConsistent } from '../validators/multi-level.validator';

export class CreateParkingLocationDto {
  @ApiProperty({
    example: 'Downtown Parking Spot',
    description: 'Title of the parking location',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Secure parking space near shopping mall',
    description: 'Description of the parking location',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '123 Main Street, City, State',
    description: 'Address of the parking location',
  })
  @IsString()
  address: string;

  @ApiProperty({
    example: 40.7128,
    description: 'Latitude coordinate',
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    example: -74.006,
    description: 'Longitude coordinate',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    example: 15.5,
    description: 'Base price per hour in USD',
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePricePerHour: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Total number of parking slots',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalSlots?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the parking location has multiple levels',
  })
  @IsOptional()
  @IsBoolean()
  isMultiLevel?: boolean;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of levels in the parking structure (if multi-level)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsMultiLevelConsistent({
    message: 'numberOfLevels can only be set when isMultiLevel is true',
  })
  numberOfLevels?: number;

  @ApiPropertyOptional({
    example: [5, 3, 8],
    description:
      'Slots per level as an array (e.g. [5,3,8] means level 1 has 5, level 2 has 3, level 3 has 8)',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  levelSlots?: number[];

  @ApiPropertyOptional({
    example: ['A1', 'A2', 'B1', 'B2'],
    description:
      'Custom space names in order. If omitted, auto-generated (A1, A2, B1, B2...)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spaceNames?: string[];

  @ApiPropertyOptional({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description:
      'Array of image URLs for the parking location (Entrance, Parking Spot, Street View)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({
    example: 'https://example.com/proof-of-residence.jpg',
    description:
      'URL of proof of residence document (e.g., utility bill, property tax, land title)',
  })
  @IsOptional()
  @IsString()
  proofOfResidenceUrl?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Opening time in HH:mm format (24-hour)',
  })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({
    example: '22:00',
    description: 'Closing time in HH:mm format (24-hour)',
  })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the parking location is open 24 hours',
  })
  @IsOptional()
  @IsBoolean()
  is24Hours?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'If true, drivers can book this location without selecting a specific slot.',
  })
  @IsOptional()
  @IsBoolean()
  allowParkAnywhere?: boolean;

  @ApiPropertyOptional({
    example: ['CAR', 'MOTORCYCLE'],
    description:
      'Vehicle types accepted at this location. Defaults to both CAR and MOTORCYCLE.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['CAR', 'MOTORCYCLE'], { each: true })
  acceptedVehicles?: string[];
}
