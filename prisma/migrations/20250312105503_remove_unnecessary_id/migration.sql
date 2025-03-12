/*
  Warnings:

  - The primary key for the `Request` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Request` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Request_from_id_to_id_key";

-- AlterTable
ALTER TABLE "FriendMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Friendship" ALTER COLUMN "date_accepted" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "GroupMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expires" SET DEFAULT (now() at time zone 'utc') + interval '7d';

-- AlterTable
ALTER TABLE "Request" DROP CONSTRAINT "Request_pkey",
DROP COLUMN "id",
ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc'),
ADD CONSTRAINT "Request_pkey" PRIMARY KEY ("from_id", "to_id");
