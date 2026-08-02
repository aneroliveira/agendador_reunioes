-- CreateEnum
CREATE TYPE "MeetingProvider" AS ENUM ('GOOGLE_MEET', 'TEAMS');

-- AlterTable
ALTER TABLE "OwnerAccount" ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "websiteUrl" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "avatarImageUrl" TEXT,
ADD COLUMN     "teamsMeetingLink" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "meetingProvider" "MeetingProvider" NOT NULL DEFAULT 'GOOGLE_MEET';
