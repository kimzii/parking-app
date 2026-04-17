import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsOptional()
  @IsUUID()
  parkingSpaceId?: string;

  @IsOptional()
  @IsUUID()
  parkingLocationId?: string;

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
