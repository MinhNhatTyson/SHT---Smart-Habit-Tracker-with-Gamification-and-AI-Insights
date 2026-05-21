/*
  Warnings:

  - You are about to drop the column `pointValue` on the `Badge` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Badge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "starReward" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general'
);
INSERT INTO "new_Badge" ("category", "condition", "description", "icon", "id", "name", "rarity", "starReward") SELECT "category", "condition", "description", "icon", "id", "name", "rarity", "starReward" FROM "Badge";
DROP TABLE "Badge";
ALTER TABLE "new_Badge" RENAME TO "Badge";
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
