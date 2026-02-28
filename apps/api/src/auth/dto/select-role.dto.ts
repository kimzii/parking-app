import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectRoleDto {
  @ApiProperty({
    example: 'DRIVER',
    description: 'Role to assign to the user',
    enum: ['DRIVER', 'HOST'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['DRIVER', 'HOST'])
  role: 'DRIVER' | 'HOST';
}
