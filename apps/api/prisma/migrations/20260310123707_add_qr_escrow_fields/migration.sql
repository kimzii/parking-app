-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "actual_entry_time" TIMESTAMP(3),
ADD COLUMN     "actual_exit_time" TIMESTAMP(3),
ADD COLUMN     "escrow_amount" DECIMAL(10,2),
ADD COLUMN     "final_amount" DECIMAL(10,2),
ADD COLUMN     "host_payout_id" UUID,
ADD COLUMN     "overtime_amount" DECIMAL(10,2),
ADD COLUMN     "qr_code_secret" TEXT;

-- CreateIndex
CREATE INDEX "reservations_qr_code_idx" ON "reservations"("qr_code");
