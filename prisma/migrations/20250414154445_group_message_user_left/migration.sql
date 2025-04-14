-- DropForeignKey
ALTER TABLE "GroupMessage" DROP CONSTRAINT "GroupMessage_from_id_fkey";

-- AlterTable
ALTER TABLE "Friendship" ALTER COLUMN "date_accepted" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "GroupMessage" ALTER COLUMN "from_id" DROP NOT NULL,
ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expires" SET DEFAULT (now() at time zone 'utc') + interval '7d';

-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "GroupMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
