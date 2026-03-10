import { IsString, IsDateString, IsUUID, IsOptional } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  parkingSpaceId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class VerifyScanDto {
  @IsString()
  qrCode: string;
}

export class CalculateFeeDto {
  @IsUUID()
  parkingSpaceId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
