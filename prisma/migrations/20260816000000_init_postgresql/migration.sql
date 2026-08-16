-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedCart" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "token" TEXT NOT NULL,
    "cartData" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SavedCart_pkey" PRIMARY KEY ("id")
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
