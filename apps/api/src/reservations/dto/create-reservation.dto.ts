import { IsString, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  parkingSpaceId: string;
}

export class VerifyScanDto {
  @IsString()
  qrCode: string;
}
