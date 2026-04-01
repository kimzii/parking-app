-- Add PAYMENT_PENDING to ReservationStatus enum
ALTER TYPE "ReservationStatus" ADD VALUE 'PAYMENT_PENDING';

-- Add remaining_due column to reservations
ALTER TABLE "reservations" ADD COLUMN "remaining_due" DECIMAL(10,2);
