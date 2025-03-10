/*
  Warnings:

  - You are about to drop the column `date_accepted` on the `Friend` table. All the data in the column will be lost.
  - You are about to drop the column `user1_id` on the `Friend` table. All the data in the column will be lost.
  - You are about to drop the column `user2_id` on the `Friend` table. All the data in the column will be lost.
  - You are about to drop the column `from_id` on the `FriendMessage` table. All the data in the column will be lost.
  - Added the required column `friendship_id` to the `Friend` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Friend` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Friend" DROP CONSTRAINT "Friend_user1_id_fkey";

-- DropForeignKey
ALTER TABLE "Friend" DROP CONSTRAINT "Friend_user2_id_fkey";

-- DropForeignKey
ALTER TABLE "FriendMessage" DROP CONSTRAINT "FriendMessage_from_id_fkey";

-- AlterTable
ALTER TABLE "Friend" DROP COLUMN "date_accepted",
DROP COLUMN "user1_id",
DROP COLUMN "user2_id",
ADD COLUMN     "friendship_id" INTEGER NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FriendMessage" DROP COLUMN "from_id",
ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "GroupMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL DEFAULT (now() at time zone 'utc') + interval '1d',

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" SERIAL NOT NULL,
    "date_accepted" TIMESTAMP(3) NOT NULL DEFAULT (now() at time zone 'utc'),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_friendship_id_fkey" FOREIGN KEY ("friendship_id") REFERENCES "Friendship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
