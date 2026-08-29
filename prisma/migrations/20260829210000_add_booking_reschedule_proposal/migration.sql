-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "proposalStatus" "ProposalStatus",
ADD COLUMN     "proposedStartTimeUTC" TIMESTAMP(3),
ADD COLUMN     "proposedEndTimeUTC" TIMESTAMP(3),
ADD COLUMN     "proposalReason" TEXT,
ADD COLUMN     "proposalToken" TEXT,
ADD COLUMN     "proposalRespondedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_proposalToken_key" ON "Booking"("proposalToken");
