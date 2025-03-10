-- AlterTable
ALTER TABLE "FriendMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Friendship" ALTER COLUMN "date_accepted" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GroupMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expires" SET DEFAULT (now() at time zone 'utc') + interval '1d';

-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');
