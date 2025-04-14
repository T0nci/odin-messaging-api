const prisma = require("../../src/db/client");

module.exports = {
  deleteFriends: async () => {
    await prisma.friend.deleteMany();
    await prisma.friendship.deleteMany();
  },
  deleteRequests: async () => {
    await prisma.request.deleteMany();
  },
  deleteGroups: async () => {
    await prisma.groupMessage.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
  },
};
