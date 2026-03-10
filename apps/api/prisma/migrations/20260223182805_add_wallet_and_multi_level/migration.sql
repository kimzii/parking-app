-- AlterTable
ALTER TABLE "driver_vehicles" ADD COLUMN     "model" TEXT;

-- AlterTable
ALTER TABLE "parking_locations" ADD COLUMN     "is_multi_level" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "number_of_levels" INTEGER;
