-- CreateEnum
CREATE TYPE "Type" AS ENUM ('TEXT', 'IMAGE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "user_id" INTEGER NOT NULL,
    "display_name" VARCHAR(30) NOT NULL,
    "bio" VARCHAR(190) NOT NULL,
    "picture" VARCHAR(255) NOT NULL DEFAULT 'https://res.cloudinary.com/dyi9mrxgm/image/upload/v1741103995/default_gplcic.jpg',
    "is_online" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "from_id" INTEGER NOT NULL,
    "to_id" INTEGER NOT NULL,
    "date_sent" TIMESTAMP(3) NOT NULL DEFAULT (now() at time zone 'utc'),

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "different_users" CHECK (from_id != to_id)
);

-- CreateTable
CREATE TABLE "Friend" (
    "id" SERIAL NOT NULL,
    "user1_id" INTEGER NOT NULL,
    "user2_id" INTEGER NOT NULL,
    "date_accepted" TIMESTAMP(3) NOT NULL DEFAULT (now() at time zone 'utc'),

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "different_users" CHECK (user1_id != user2_id)
);

-- CreateTable
CREATE TABLE "FriendMessage" (
    "id" SERIAL NOT NULL,
    "from_id" INTEGER NOT NULL,
    "friend_id" INTEGER NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "type" "Type" NOT NULL,
    "date_sent" TIMESTAMP(3) NOT NULL DEFAULT (now() at time zone 'utc'),

    CONSTRAINT "FriendMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "picture" VARCHAR(255),

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" SERIAL NOT NULL,
    "from_id" INTEGER NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "type" "Type" NOT NULL,
    "date_sent" TIMESTAMP(3) NOT NULL DEFAULT (now() at time zone 'utc'),

    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_display_name_key" ON "Profile"("display_name");

-- CreateIndex
CREATE UNIQUE INDEX "Request_from_id_to_id_key" ON "Request"("from_id", "to_id");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_user_id_group_id_key" ON "GroupMember"("user_id", "group_id");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendMessage" ADD CONSTRAINT "FriendMessage_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendMessage" ADD CONSTRAINT "FriendMessage_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "Friend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "GroupMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
