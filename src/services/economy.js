const { randomBetween, formatMoney, addTransaction } = require('./services/economy');

async function ensureUser(prisma, discordId, guildId, username, avatarUrl = null) {
  const user = await prisma.user.upsert({
    where: { discordId },
    update: { guildId, username, avatarUrl },
    create: {
      discordId,
      guildId,
      username,
      avatarUrl,
      wallet: 500,
      bank: 0,
      level: 1,
      xp: 0
    }
  });

  return user;
}

async function updateUserBalance(prisma, userId, deltaWallet, deltaBank = 0) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      wallet: user.wallet + deltaWallet,
      bank: user.bank + deltaBank
    }
  });

  return updated;
}

module.exports = {
  ensureUser,
  updateUserBalance,
  randomBetween,
  formatMoney,
  addTransaction
};
