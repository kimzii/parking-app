import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationStatus } from '@prisma/client';

export class UpdateLocationStatusDto {
  @ApiProperty({
    example: 'APPROVED',
    description: 'New status for the parking location',
    enum: LocationStatus,
  })
  @IsEnum(LocationStatus)
  status: LocationStatus;

  @ApiPropertyOptional({
    example: 'Location approved after verification',
    description: 'Admin notes for the status change',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
