-- AlterTable
ALTER TABLE "parking_locations" ADD COLUMN     "slots_per_level" INTEGER;

-- AlterTable
ALTER TABLE "parking_spaces" ADD COLUMN     "level_number" INTEGER,
ADD COLUMN     "name" TEXT;
