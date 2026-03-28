-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "RequestStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "top_up_requests" ADD COLUMN "expires_at" TIMESTAMP(3);
