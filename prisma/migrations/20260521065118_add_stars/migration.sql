-- Migration: add stars to User, add starReward + category to Badge
-- Safe for existing rows — provides defaults before enforcing NOT NULL

-- 1. Add stars to User (safe — has a default)
ALTER TABLE "User" ADD COLUMN "stars" INTEGER NOT NULL DEFAULT 0;

-- 2. Add starReward to Badge with a temporary default of 0
--    (the seed will overwrite all rows with correct values)
ALTER TABLE "Badge" ADD COLUMN "starReward" INTEGER NOT NULL DEFAULT 0;

-- 3. Add category to Badge with a default
ALTER TABLE "Badge" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general';

-- 4. Backfill starReward based on the old pointValue column
--    so existing rows aren't left with 0 if you don't re-seed immediately
UPDATE "Badge" SET "starReward" = CASE
  WHEN "pointValue" <= 10  THEN 5
  WHEN "pointValue" <= 50  THEN 15
  WHEN "pointValue" <= 200 THEN 40
  ELSE 100
END;