import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: 'APPROVED',
    description: 'User status',
    enum: UserStatus,
  })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status: UserStatus;
}
