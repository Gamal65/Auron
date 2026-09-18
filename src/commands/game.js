const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../db');
const { ensureUser, formatMoney, randomBetween, addTransaction } = require('../services/economy');

const SHOP_ITEMS = [
  { name: 'قناع', price: 150, type: 'armor', description: 'درع بسيط', rarity: 'common' },
  { name: 'سيف', price: 280, type: 'weapon', description: 'سلاح أساسي', rarity: 'common' },
  { name: 'درع', price: 420, type: 'armor', description: 'درع متوسط', rarity: 'uncommon' },
  { name: 'خاتم الحظ', price: 650, type: 'accessory', description: 'يزيد فرص النجاح', rarity: 'rare' },
  { name: 'غطاء حماية', price: 800, type: 'shield', description: 'يحمي من السرقة', rarity: 'rare' },
  { name: 'آلة التكسير', price: 1100, type: 'tool', description: 'تزيد فعالية الجريمة', rarity: 'epic' },
  { name: 'حزمة فاخرة', price: 1500, type: 'booster', description: 'زيادة في العائد', rarity: 'legendary' }
];

async function handleBalance(message) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const embed = new EmbedBuilder()
    .setColor('#00d9ff')
    .setTitle('💼 حسابك')
    .setDescription(`المحفظة: ${formatMoney(user.wallet)}\nالبنك: ${formatMoney(user.bank)}\nالمستوى: ${user.level}\nالخبرة: ${user.xp}`)
    .setThumbnail(message.author.displayAvatarURL({ format: 'png', size: 256 }))
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleBank(message) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const embed = new EmbedBuilder()
    .setColor('#7dffb2')
    .setTitle('🏦 البنك')
    .setDescription(`المحفظة: ${formatMoney(user.wallet)}\nالبنك: ${formatMoney(user.bank)}`);

  await message.reply({ embeds: [embed] });
}

async function handleDaily(message) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const now = new Date();

  if (user.lastDaily && now.getTime() - new Date(user.lastDaily).getTime() < 24 * 60 * 60 * 1000) {
    const hours = Math.ceil((24 * 60 * 60 * 1000 - (now.getTime() - new Date(user.lastDaily).getTime())) / (60 * 60 * 1000));
    return message.reply(`⏳ يمكنك استلام المكافأة يوميًا بعد ${hours} ساعة.`);
  }

  const reward = randomBetween(250, 700);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: user.wallet + reward,
      lastDaily: now
    }
  });

  await addTransaction(prisma, user.id, 'daily', reward, 'مكافأة يومية');
  await message.reply(`🎉 استلمت ${formatMoney(reward)}\nالرصيد الآن: ${formatMoney(updated.wallet)}`);
}

async function handleWork(message) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const now = Date.now();

  if (user.lastWork && now - new Date(user.lastWork).getTime() < 60 * 1000) {
    const sec = Math.ceil((60 * 1000 - (now - new Date(user.lastWork).getTime())) / 1000);
    return message.reply(`⏳ انتظر ${sec} ثانية قبل العمل مرة أخرى.`);
  }

  const reward = randomBetween(100, 260);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: user.wallet + reward,
      xp: user.xp + reward,
      lastWork: new Date()
    }
  });

  await addTransaction(prisma, user.id, 'work', reward, 'أجر العمل');
  await message.reply(`💪 عملت بنجاح وحصلت على ${formatMoney(reward)}\nالرصيد الحالي: ${formatMoney(updated.wallet)}`);
}

async function handleDeposit(message, amountValue) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const amount = Number(amountValue || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply('⚠️ أرسل مبلغ صحيح للإيداع. مثال: إيداع 200');
  }

  if (user.wallet < amount) {
    return message.reply('❌ لا تملك هذا المبلغ في المحفظة.');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: user.wallet - amount,
      bank: user.bank + amount
    }
  });

  await addTransaction(prisma, user.id, 'deposit', amount, 'إيداع إلى البنك');
  await message.reply(`✅ تم إيداع ${formatMoney(amount)}\nالمحفظة: ${formatMoney(updated.wallet)}\nالبنك: ${formatMoney(updated.bank)}`);
}

async function handleWithdraw(message, amountValue) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const amount = Number(amountValue || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply('⚠️ أرسل مبلغ صحيح للسحب. مثال: سحب 200');
  }

  if (user.bank < amount) {
    return message.reply('❌ لا تملك هذا المبلغ في البنك.');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: user.wallet + amount,
      bank: user.bank - amount
    }
  });

  await addTransaction(prisma, user.id, 'withdraw', amount, 'سحب من البنك');
  await message.reply(`✅ تم سحب ${formatMoney(amount)}\nالمحفظة: ${formatMoney(updated.wallet)}\nالبنك: ${formatMoney(updated.bank)}`);
}

async function handleTransfer(message, targetUser, amountValue) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const amount = Number(amountValue || 0);

  if (!targetUser) {
    return message.reply('⚠️ اذكر المستخدم الأول. مثال: تحويل @فلان 200');
  }

  if (targetUser.id === message.author.id) {
    return message.reply('❌ لا يمكنك تحويل المال لنفسك.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply('⚠️ المبلغ غير صحيح.');
  }

  if (user.wallet < amount) {
    return message.reply('❌ لا تملك هذا المبلغ في المحفظة.');
  }

  const target = await ensureUser(prisma, targetUser.id, targetUser.guild?.id || message.guildId, targetUser.username, targetUser.displayAvatarURL({ format: 'png', size: 256 }));

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: user.wallet - amount }
  });

  await prisma.user.update({
    where: { id: target.id },
    data: { wallet: target.wallet + amount }
  });

  await addTransaction(prisma, user.id, 'transfer_out', amount, `تحويل إلى ${targetUser.username}`);
  await addTransaction(prisma, target.id, 'transfer_in', amount, `استلام من ${message.author.username}`);

  await message.reply(`✅ تم تحويل ${formatMoney(amount)} إلى ${targetUser.username}.`);
}

async function handleTransactions(message) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const rows = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 8 });

  if (!rows.length) {
    return message.reply('📑 لا توجد معاملات حتى الآن.');
  }

  const text = rows.map((row, idx) => `${idx + 1}. ${row.type} | ${formatMoney(row.amount)} | ${row.reason}`).join('\n');
  const embed = new EmbedBuilder().setColor('#b08cff').setTitle('📑 سجل المعاملات').setDescription(text);
  await message.reply({ embeds: [embed] });
}

async function handleShop(message) {
  await prisma.shopItem.deleteMany({});

  for (const item of SHOP_ITEMS) {
    await prisma.shopItem.upsert({
      where: { name: item.name },
      update: {},
      create: item
    });
  }

  const items = await prisma.shopItem.findMany({ where: { enabled: true } });
  const description = items.map((item) => `• ${item.name} | ${formatMoney(item.price)} | ${item.rarity}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#ff78a9')
    .setTitle('🛍️ المتجر')
    .setDescription(description || 'لا توجد عناصر متاحة.');

  await message.reply({ embeds: [embed] });
}

async function handleBuy(message, itemName) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const search = (itemName || '').trim();

  if (!search) {
    return message.reply('⚠️ اكتب اسم العنصر، مثال: شراء سيف');
  }

  const item = await prisma.shopItem.findFirst({
    where: {
      name: {
        contains: search,
        mode: 'insensitive'
      }
    }
  });

  if (!item) {
    return message.reply('❌ العنصر غير موجود.');
  }

  if (user.wallet < item.price) {
    return message.reply('❌ رصيدك غير كافٍ لشراء هذا العنصر.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: user.wallet - item.price }
  });

  const inventory = await prisma.inventory.findFirst({ where: { userId: user.id, itemName: item.name } });
  if (inventory) {
    await prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: inventory.quantity + 1 } });
  } else {
    await prisma.inventory.create({ data: { userId: user.id, itemName: item.name, quantity: 1 } });
  }

  await addTransaction(prisma, user.id, 'purchase', item.price, `شراء ${item.name}`);
  await message.reply(`✅ تم شراء ${item.name} بنجاح بسعر ${formatMoney(item.price)}`);
}

async function handleInventory(message) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const items = await prisma.inventory.findMany({ where: { userId: user.id } });

  if (!items.length) {
    return message.reply('📦 لا توجد عناصر في مخزونك.');
  }

  const text = items.map((item) => `• ${item.itemName} × ${item.quantity}`).join('\n');
  const embed = new EmbedBuilder().setColor('#7cc7ff').setTitle('🎒 المخزون').setDescription(text);
  await message.reply({ embeds: [embed] });
}

async function handleRob(message, targetUser) {
  const attacker = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));

  if (!targetUser) {
    return message.reply('⚠️ اذكر المستخدم الذي تريد سرقته. مثال: سرقة @user');
  }

  if (targetUser.id === message.author.id) {
    return message.reply('❌ لا يمكنك سرقة نفسك.');
  }

  if (attacker.jailUntil && new Date(attacker.jailUntil) > new Date()) {
    return message.reply('🚫 أنت مسجون الآن ولا يمكنك السرقة.');
  }

  const victim = await ensureUser(prisma, targetUser.id, targetUser.guild?.id || message.guildId, targetUser.username, targetUser.displayAvatarURL({ format: 'png', size: 256 }));

  if (victim.wallet < 150) {
    return message.reply('❌ هذا المستخدم لا يملك ما يكفي.');
  }

  const now = Date.now();
  const cooldownMs = 10 * 60 * 1000;

  if (attacker.lastRob && now - new Date(attacker.lastRob).getTime() < cooldownMs) {
    const sec = Math.ceil((cooldownMs - (now - new Date(attacker.lastRob).getTime())) / 1000);
    return message.reply(`⏳ يمكنك سرقة مستخدم آخر بعد ${sec} ثانية.`);
  }

  const chance = randomBetween(1, 100);
  const payout = randomBetween(60, 600);

  if (chance <= 55) {
    await prisma.user.update({ where: { id: attacker.id }, data: { wallet: attacker.wallet + payout, lastRob: new Date() } });
    await prisma.user.update({ where: { id: victim.id }, data: { wallet: victim.wallet - payout } });
    await prisma.robberyLog.create({ data: { victimId: victim.id, robberId: attacker.id, amount: payout, success: true } });
    await addTransaction(prisma, attacker.id, 'rob_success', payout, `سرقة من ${targetUser.username}`);
    await addTransaction(prisma, victim.id, 'rob_loss', payout, `سُرق من ${message.author.username}`);

    return message.reply(`✅ نجحت السرقة! حصلت على ${formatMoney(payout)} من ${targetUser.username}.`);
  }

  const penalty = randomBetween(20, 180);
  await prisma.user.update({ where: { id: attacker.id }, data: { wallet: Math.max(0, attacker.wallet - penalty), lastRob: new Date() } });
  await prisma.robberyLog.create({ data: { victimId: victim.id, robberId: attacker.id, amount: penalty, success: false } });
  await addTransaction(prisma, attacker.id, 'rob_fail', penalty, `فشل سرقة من ${targetUser.username}`);

  return message.reply(`❌ فشلت السرقة، تم خصم ${formatMoney(penalty)}.`);
}

async function handleCrime(message) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const chance = randomBetween(1, 100);

  if (chance <= 60) {
    const gain = randomBetween(80, 320);
    await prisma.user.update({ where: { id: user.id }, data: { wallet: user.wallet + gain } });
    await addTransaction(prisma, user.id, 'crime_success', gain, 'جريمة ناجحة');
    return message.reply(`✅ جريمة ناجحة! ربحت ${formatMoney(gain)}.`);
  }

  const fine = randomBetween(30, 140);
  await prisma.user.update({ where: { id: user.id }, data: { wallet: Math.max(0, user.wallet - fine) } });
  await addTransaction(prisma, user.id, 'crime_fail', fine, 'غرامة جريمة');
  return message.reply(`❌ فشلت الجريمة، تم خصم ${formatMoney(fine)}.`);
}

async function handleGamble(message, amountValue) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const amount = Number(amountValue || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply('⚠️ اكتب مبلغ صحيح. مثال: قمار 50');
  }

  if (user.wallet < amount) {
    return message.reply('❌ لا تملك هذا المبلغ في المحفظة.');
  }

  const win = randomBetween(1, 100) > 40;

  if (win) {
    const reward = amount * 2;
    await prisma.user.update({ where: { id: user.id }, data: { wallet: user.wallet + reward } });
    await addTransaction(prisma, user.id, 'gamble_win', reward, 'قمار فائز');
    return message.reply(`🎲 فاز! ربحت ${formatMoney(reward)}.`);
  }

  await prisma.user.update({ where: { id: user.id }, data: { wallet: user.wallet - amount } });
  await addTransaction(prisma, user.id, 'gamble_loss', amount, 'خسارة قمار');
  return message.reply(`🎲 خسرت ${formatMoney(amount)}.`);
}

async function handleLeaderboard(message) {
  const users = await prisma.user.findMany({
    orderBy: [{ wallet: 'desc' }, { bank: 'desc' }],
    take: 10
  });

  const content = users.length ? users.map((u, i) => `${i + 1}. ${u.username} | ${formatMoney(u.wallet + u.bank)}`).join('\n') : 'لا توجد بيانات بعد.';

  const embed = new EmbedBuilder().setColor('#ffe66d').setTitle('🏆 قائمة المتصدرين').setDescription(content);
  await message.reply({ embeds: [embed] });
}

async function handleCompany(message, actionText) {
  const user = await ensureUser(prisma, message.author.id, message.guildId, message.author.username, message.author.displayAvatarURL({ format: 'png', size: 256 }));
  const text = (actionText || '').trim();

  if (!text) {
    return message.reply('🏢 مثال: شركة إنشاء اسم_الشركة');
  }

  if (text.toLowerCase().startsWith('إنشاء') || text.toLowerCase().startsWith('create')) {
    const name = text.replace(/^(إنشاء|create)\s+/i, '').trim();
    if (!name) {
      return message.reply('⚠️ اكتب اسم الشركة.');
    }

    const exists = await prisma.company.findFirst({ where: { name } });
    if (exists) {
      return message.reply('❌ اسم الشركة موجود بالفعل.');
    }

    const created = await prisma.company.create({ data: { name, ownerId: user.id, balance: 0, level: 1 } });
    await prisma.companyMember.create({ data: { companyId: created.id, userId: user.id, role: 'owner' } });
    return message.reply(`✅ تم إنشاء الشركة **${name}** بنجاح.`);
  }

  const company = await prisma.company.findFirst({
    where: {
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }]
    },
    include: { members: true }
  });

  if (!company) {
    return message.reply('❌ لا تمتلك شركة حاليًا.');
  }

  return message.reply(`🏢 الشركة: **${company.name}**\nالمالكين: ${company.ownerId}\nالموظفين: ${company.members.length}\nالرصيد: ${formatMoney(company.balance)}`);
}

module.exports = {
  handleBalance,
  handleBank,
  handleDaily,
  handleWork,
  handleDeposit,
  handleWithdraw,
  handleTransfer,
  handleTransactions,
  handleShop,
  handleBuy,
  handleInventory,
  handleRob,
  handleCrime,
  handleGamble,
  handleLeaderboard,
  handleCompany
};
