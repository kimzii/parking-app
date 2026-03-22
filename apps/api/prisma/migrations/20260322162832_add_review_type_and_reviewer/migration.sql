/*
  Warnings:

  - A unique constraint covering the columns `[reservation_id,review_type]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `review_type` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviewer_id` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('DRIVER_TO_LOCATION', 'HOST_TO_DRIVER');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "review_type" "ReviewType" NOT NULL,
ADD COLUMN     "reviewer_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reservation_id_review_type_key" ON "reviews"("reservation_id", "review_type");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
