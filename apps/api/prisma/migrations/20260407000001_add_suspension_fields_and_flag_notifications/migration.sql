-- AlterTable: add suspension fields to user_roles
ALTER TABLE "user_roles" ADD COLUMN "suspended_at" TIMESTAMP(3);
ALTER TABLE "user_roles" ADD COLUMN "suspend_until" TIMESTAMP(3);
ALTER TABLE "user_roles" ADD COLUMN "suspension_reason" TEXT;

-- AlterEnum: add new NotificationType values
ALTER TYPE "NotificationType" ADD VALUE 'LOW_RATING_FLAGGED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'USER_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_UNSUSPENDED';
