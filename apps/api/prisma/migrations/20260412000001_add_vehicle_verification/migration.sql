-- CreateEnum
CREATE TYPE "VehicleVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "driver_vehicles"
  ADD COLUMN "registration_image_url" TEXT,
  ADD COLUMN "verification_status"    "VehicleVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rejection_reason"       TEXT,
  ADD COLUMN "deleted_at"             TIMESTAMP(3);

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VEHICLE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'VEHICLE_REJECTED';
