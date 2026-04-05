-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('DRIVER', 'HOST', 'ADMIN', 'SYSTEM');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CANCELLED_BY_ADMIN';

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_by" "CancelledBy";
