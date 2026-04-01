-- Add commission breakdown fields for completed reservations
ALTER TABLE "reservations"
ADD COLUMN "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.1000,
ADD COLUMN "platform_fee" DECIMAL(10,2),
ADD COLUMN "host_payout_amount" DECIMAL(10,2);
