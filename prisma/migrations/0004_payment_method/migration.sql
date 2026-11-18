-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "gatewayFee" INTEGER,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "methodDetail" TEXT;

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

