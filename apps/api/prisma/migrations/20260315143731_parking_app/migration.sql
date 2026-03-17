/*
  Warnings:

  - You are about to drop the column `actual_entry_time` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `actual_exit_time` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `reservations` table. All the data in the column will be lost.
  - Added the required column `arrival_deadline` to the `reservations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'EXPIRED';

-- DropIndex
DROP INDEX "reservations_parking_space_id_start_time_end_time_idx";

-- AlterTable
ALTER TABLE "parking_spaces" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "actual_entry_time",
DROP COLUMN "actual_exit_time",
DROP COLUMN "end_time",
DROP COLUMN "start_time",
ADD COLUMN     "arrival_deadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "session_ended_at" TIMESTAMP(3),
ADD COLUMN     "session_started_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "reservations_parking_space_id_idx" ON "reservations"("parking_space_id");
