-- CreateTable
CREATE TABLE "StoreItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "starCost" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "UserPurchase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "itemKey" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "UserPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "fullName" TEXT,
    "gender" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "habitSlots" INTEGER NOT NULL DEFAULT 5,
    "activeTheme" TEXT NOT NULL DEFAULT 'default',
    "activeHabitSound" TEXT NOT NULL DEFAULT 'default',
    "activeBadgeSound" TEXT NOT NULL DEFAULT 'default',
    "streakShieldActive" BOOLEAN NOT NULL DEFAULT false,
    "activeTitle" TEXT,
    "unlockedTitles" TEXT NOT NULL DEFAULT '[]',
    "unlockedAvatars" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_User" ("avatar", "avatarUrl", "bio", "createdAt", "currentStreak", "fullName", "gender", "id", "level", "longestStreak", "stars", "totalPoints", "username") SELECT "avatar", "avatarUrl", "bio", "createdAt", "currentStreak", "fullName", "gender", "id", "level", "longestStreak", "stars", "totalPoints", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StoreItem_key_key" ON "StoreItem"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserPurchase_userId_itemKey_key" ON "UserPurchase"("userId", "itemKey");
