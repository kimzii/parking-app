import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriverProfileDto {
  @ApiProperty({
    example: 'DL123456789',
    description: 'Driver license number',
  })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiPropertyOptional({
    example: 'https://example.com/license-front.jpg',
    description: 'URL of the uploaded license image',
  })
  @IsOptional()
  @IsString()
  licenseImageUrl?: string;
}
