/*
  Warnings:

  - The primary key for the `RefreshToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `token` on the `RefreshToken` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FriendMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Friendship" ALTER COLUMN "date_accepted" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "GroupMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey",
DROP COLUMN "token",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "expires" SET DEFAULT (now() at time zone 'utc') + interval '7d',
ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RefreshToken_id_seq";

-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');
