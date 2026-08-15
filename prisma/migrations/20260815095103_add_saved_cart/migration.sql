-- CreateTable
CREATE TABLE "SavedCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "token" TEXT NOT NULL,
    "cartData" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedCart_token_key" ON "SavedCart"("token");

-- CreateIndex
CREATE INDEX "SavedCart_shop_idx" ON "SavedCart"("shop");

-- CreateIndex
CREATE INDEX "SavedCart_customerId_idx" ON "SavedCart"("customerId");

-- CreateIndex
CREATE INDEX "SavedCart_status_idx" ON "SavedCart"("status");

-- CreateIndex
CREATE INDEX "SavedCart_createdAt_idx" ON "SavedCart"("createdAt");

-- CreateIndex
CREATE INDEX "SavedCart_token_idx" ON "SavedCart"("token");
