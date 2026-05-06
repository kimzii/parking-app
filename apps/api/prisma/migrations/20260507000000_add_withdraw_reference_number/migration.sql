-- Add withdraw request reference number

-- 1) Add the column as nullable so existing rows can be backfilled
ALTER TABLE "withdraw_requests" ADD COLUMN "reference_number" TEXT;

-- 2) Backfill existing rows deterministically from the UUID
UPDATE "withdraw_requests"
SET "reference_number" = 'WD-' || UPPER(SUBSTRING(REPLACE("id"::text, '-', '') FROM 1 FOR 10))
WHERE "reference_number" IS NULL;

-- 3) Enforce non-null and uniqueness
ALTER TABLE "withdraw_requests" ALTER COLUMN "reference_number" SET NOT NULL;

CREATE UNIQUE INDEX "withdraw_requests_reference_number_key" ON "withdraw_requests"("reference_number");
