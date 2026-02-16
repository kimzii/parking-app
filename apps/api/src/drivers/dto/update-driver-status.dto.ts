import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

export class UpdateDriverStatusDto {
  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.VERIFIED,
    description: 'New verification status for the driver',
  })
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @ApiPropertyOptional({
    example: 'Driver license verified and approved',
    description: 'Optional admin notes for the status change',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
