const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureUser(discordId, guildId, username, avatarUrl = null) {
  return prisma.user.upsert({
    where: { discordId },
    update: { guildId, username, avatarUrl },
    create: { discordId, guildId, username, avatarUrl, wallet: 500, bank: 0 }
  });
}

function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function formatMoney(value) { return `${Number(value).toLocaleString('en-US')} 🪙`; }
function addTransaction(userId, type, amount, reason) { return prisma.transaction.create({ data: { userId, type, amount, reason } }); }

async function atomicTransfer(fromId, toId, amount, reason) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('INVALID_AMOUNT');
  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUnique({ where: { id: fromId } });
    const receiver = await tx.user.findUnique({ where: { id: toId } });
    if (!sender || !receiver || sender.wallet < amount) throw new Error('INSUFFICIENT_FUNDS');
    await tx.user.update({ where: { id: fromId }, data: { wallet: { decrement: amount } } });
    await tx.user.update({ where: { id: toId }, data: { wallet: { increment: amount } } });
    await tx.transaction.create({ data: { userId: fromId, type: 'transfer_out', amount, reason } });
    await tx.transaction.create({ data: { userId: toId, type: 'transfer_in', amount, reason } });
  });
}

module.exports = { prisma, ensureUser, randomBetween, formatMoney, addTransaction, atomicTransfer };
