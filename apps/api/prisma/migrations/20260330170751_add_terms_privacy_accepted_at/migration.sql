-- AlterTable
ALTER TABLE "users" ADD COLUMN     "privacy_accepted_at" TIMESTAMP(3),
ADD COLUMN     "terms_accepted_at" TIMESTAMP(3);
