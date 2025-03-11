/*
  Warnings:

  - You are about to drop the column `picture` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FriendMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Friendship" ALTER COLUMN "date_accepted" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "GroupMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "picture",
ADD COLUMN     "public_id" VARCHAR(255) NOT NULL DEFAULT 'default_gplcic';

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expires" SET DEFAULT (now() at time zone 'utc') + interval '7d';

-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');
