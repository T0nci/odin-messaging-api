-- AlterEnum
ALTER TYPE "Type" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "Friendship" ALTER COLUMN "date_accepted" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "GroupMessage" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expires" SET DEFAULT (now() at time zone 'utc') + interval '7d';

-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "date_sent" SET DEFAULT (now() at time zone 'utc');
