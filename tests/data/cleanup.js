const prisma = require("../../src/db/client");

module.exports = {
  deleteFriends: async () => {
    await prisma.friend.deleteMany();
    await prisma.friendship.deleteMany();
  },
  deleteRequests: async () => {
    await prisma.request.deleteMany();
  },
};
