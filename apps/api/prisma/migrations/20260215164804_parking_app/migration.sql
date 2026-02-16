/*
  Warnings:

  - You are about to drop the column `verification_status` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `verification_status` on the `hosts` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "VerificationStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "drivers" DROP COLUMN "verification_status";

-- AlterTable
ALTER TABLE "hosts" DROP COLUMN "verification_status";

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "status";

-- DropEnum
DROP TYPE "UserStatus";
