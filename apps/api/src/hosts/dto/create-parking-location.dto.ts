import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsArray,
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
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: 'Array of image URLs for the parking location',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
