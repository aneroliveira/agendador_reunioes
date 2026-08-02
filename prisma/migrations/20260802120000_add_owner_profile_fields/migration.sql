-- AlterTable
ALTER TABLE "OwnerAccount" ADD COLUMN     "introText" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "whatsappUrl" TEXT,
ADD COLUMN     "themeColor" TEXT NOT NULL DEFAULT '#c4677a';
