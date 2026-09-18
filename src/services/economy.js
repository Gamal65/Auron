const { prisma } = require('../db');

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatMoney(value) {
  return `${Number(value).toLocaleString('en-US')} 🪙`;
}

async function ensureUser(discordId, guildId, username, avatarUrl = null) {
  return prisma.user.upsert({
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
      xp: 0,
      reputation: 0,
      gems: 0
    }
  });
}

async function addTransaction(userId, type, amount, reason) {
  return prisma.transaction.create({ data: { userId, type, amount, reason } });
}

async function atomicTransfer(fromId, toId, amount, reason) {
  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUnique({ where: { id: fromId } });
    const receiver = await tx.user.findUnique({ where: { id: toId } });

    if (!sender || !receiver) throw new Error('USER_NOT_FOUND');
    if (sender.wallet < amount) throw new Error('INSUFFICIENT_FUNDS');

    await tx.user.update({
      where: { id: fromId },
      data: { wallet: { decrement: amount } }
    });

    await tx.user.update({
      where: { id: toId },
      data: { wallet: { increment: amount } }
    });

    await tx.transaction.create({
      data: { userId: fromId, type: 'transfer_out', amount, reason }
    });

    await tx.transaction.create({
      data: { userId: toId, type: 'transfer_in', amount, reason }
    });
  });
}

module.exports = {
  prisma,
  ensureUser,
  randomBetween,
  formatMoney,
  addTransaction,
  atomicTransfer
};
