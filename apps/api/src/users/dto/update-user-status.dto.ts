import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: 'VERIFIED',
    description: 'User role verification status',
    enum: VerificationStatus,
  })
  @IsNotEmpty()
  @IsEnum(VerificationStatus)
  status: VerificationStatus;
}
