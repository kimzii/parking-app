-- AlterTable
ALTER TABLE "parking_locations" ADD COLUMN     "close_time" TEXT,
ADD COLUMN     "is_24_hours" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "open_time" TEXT;
