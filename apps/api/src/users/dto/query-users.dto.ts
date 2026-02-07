import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

export class QueryUsersDto {
  @ApiPropertyOptional({
    example: 'DRIVER',
    description: 'Filter by user role',
    enum: RoleName,
  })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by email, first name, or last name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
