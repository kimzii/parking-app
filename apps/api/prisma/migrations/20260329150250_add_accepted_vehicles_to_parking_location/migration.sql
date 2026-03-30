-- AlterTable
ALTER TABLE "parking_locations" ADD COLUMN     "accepted_vehicles" "VehicleType"[] DEFAULT ARRAY['CAR', 'MOTORCYCLE']::"VehicleType"[];

-- AlterTable
ALTER TABLE "top_up_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "withdraw_requests" ALTER COLUMN "id" DROP DEFAULT;
