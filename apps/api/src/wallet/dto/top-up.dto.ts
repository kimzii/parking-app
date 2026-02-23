import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopUpDto {
  @ApiProperty({
    example: 100,
    description: 'Amount to top up (minimum 1)',
  })
  @IsNumber()
  @Min(1)
  amount: number;
}
