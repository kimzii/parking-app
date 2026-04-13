import {
  IsDateString,
  IsOptional,
  IsString,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'User first name',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'User last name',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'User phone number',
    minLength: 10,
    maxLength: 15,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    description: 'Profile picture URL',
  })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({
    example: 'MALE',
    description: 'User sex',
    enum: ['MALE', 'FEMALE'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  sex?: string;

  @ApiPropertyOptional({
    example: '2000-01-15',
    description: 'User birthday in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateOfBirth must be a valid date string' })
  dateOfBirth?: string;
}
