import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsTrue,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'User password (min 8 chars, must include uppercase, lowercase, number, and special character)',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: '09171234567',
    description: 'Mobile/GCash number',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    example: true,
    description: 'User must accept Terms and Conditions to register',
  })
  @IsBoolean()
  @IsTrue({ message: 'You must accept the Terms and Conditions' })
  termsAccepted: boolean;

  @ApiProperty({
    example: true,
    description: 'User must accept the Data Privacy Policy to register',
  })
  @IsBoolean()
  @IsTrue({ message: 'You must accept the Data Privacy Policy' })
  privacyAccepted: boolean;
}
