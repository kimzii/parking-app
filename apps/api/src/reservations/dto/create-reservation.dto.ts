import { IsOptional, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  parkingSpaceId: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class VerifyScanDto {
  @IsString()
  qrCode: string;
}
