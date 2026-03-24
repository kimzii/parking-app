import { IsString } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  pushToken: string;
}
