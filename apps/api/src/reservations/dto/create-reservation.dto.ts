import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
