const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('./db');
const { token, clientId, guildId } = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const SHOP_ITEMS = [
  { name: 'قناع', price: 150, type: 'armor', description: 'درع بسيط', rarity: 'common' },
  { name: 'سيف', price: 280, type: 'weapon', description: 'سلاح أساسي', rarity: 'common' },
  { name: 'درع', price: 420, type: 'armor', description: 'درع متوسط', rarity: 'uncommon' },
  { name: 'خاتم الحظ', price: 650, type: 'accessory', description: 'يزيد فرص النجاح', rarity: 'rare' },
  { name: 'غطاء حماية', price: 800, type: 'shield', description: 'يحمي من السرقة', rarity: 'rare' },
  { name: 'آلة التكسير', price: 1100, type: 'tool', description: 'تزيد فعالية الجريمة', rarity: 'epic' },
  { name: 'حزمة فاخرة', price: 1500, type: 'booster', description: 'زيادة في العائد', rarity: 'legendary' }
];

const COMMANDS = {
  حساب: 'balance',
  رصيد: 'balance',
  بنك: 'bank',
  يومية: 'daily',
  عمل: 'work',
  سرقة: 'rob',
  متجر: 'shop',
  شراء: 'buy',
  بيع: 'sell',
  مخزون: 'inventory',
  شركة: 'company',
  تحويل: 'transfer',
  إيداع: 'deposit',
  سحب: 'withdraw',
  سجل: 'transactions',
  قائمة: 'leaderboard',
  جريمة: 'crime',
  قمار: 'gamble',
  حماية: 'shield',
  خبرة: 'level',
  مستقبل: 'future'
};

async function ensureUser(discordId, guildId, username) {
  const user = await prisma.user.upsert({
    where: { discordId },
    update: { username, guildId },
    create: {
      discordId,
      guildId,
      username,
      wallet: 500,
      bank: 0,
      level: 1,
      xp: 0
    }
  });

  return user;
}

async function addTransaction(userId, type, amount, reason) {
  await prisma.transaction.create({
    data: { userId, type, amount, reason }
  });
}

function formatMoney(value) {
  return `${Number(value).toLocaleString()} 💰`;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getUserByDiscordId(discordId) {
  const user = await prisma.user.findUnique({
    where: { discordId },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 5 } }
  });

  if (!user) {
    return null;
  }

  return user;
}

async function ensureShopItems() {
  for (const item of SHOP_ITEMS) {
    await prisma.shopItem.upsert({
      where: { name: item.name },
      update: {},
      create: {
        name: item.name,
        price: item.price,
        type: item.type,
        description: item.description,
        rarity: item.rarity
      }
    });
  }
}

async function createAdminLog(guildId, adminId, action, targetId, reason) {
  await prisma.adminLog.create({
    data: {
      guildId,
      adminId,
      action,
      targetId: targetId || null,
      reason: reason || null
    }
  });
}

async function buildBalanceEmbed(user) {
  return new EmbedBuilder()
    .setColor('#00d9ff')
    .setTitle('💼 الرصيد')
    .setDescription(`المحفظة: ${formatMoney(user.wallet)}\nالبنك: ${formatMoney(user.bank)}\nالمستوى: ${user.level}\nالخبرة: ${user.xp}`)
    .setTimestamp();
}

async function handleBalance(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const embed = await buildBalanceEmbed(user);
  await message.reply({ embeds: [embed] });
}

async function handleDaily(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const now = new Date();

  if (user.lastDaily && now.getTime() - new Date(user.lastDaily).getTime() < 24 * 60 * 60 * 1000) {
    const hours = Math.ceil((24 * 60 * 60 * 1000 - (now.getTime() - new Date(user.lastDaily).getTime())) / (60 * 60 * 1000));
    return message.reply(`⏳ يمكنك استلام المكافأة اليومية خلال ${hours} ساعة.`);
  }

  const reward = randomBetween(250, 700);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: user.wallet + reward,
      lastDaily: now
    }
  });

  await addTransaction(user.id, 'daily', reward, 'مكافأة يومية');

  const embed = new EmbedBuilder()
    .setColor('#ffd700')
    .setTitle('🎉 مكافأة يومية')
    .setDescription(`استلمت ${formatMoney(reward)}\nالرصيد الحالي: ${formatMoney(updated.wallet)}`);

  await message.reply({ embeds: [embed] });
}

async function handleWork(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);

  if (user.lastWork && Date.now() - new Date(user.lastWork).getTime() < 60 * 1000) {
    const seconds = Math.ceil((60 * 1000 - (Date.now() - new Date(user.lastWork).getTime())) / 1000);
    return message.reply(`⏳ انتظر ${seconds} ثانية قبل العمل مرة أخرى.`);
  }

  const reward = randomBetween(80, 220);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: user.wallet + reward,
      xp: user.xp + reward,
      lastWork: new Date()
    }
  });

  await addTransaction(user.id, 'work', reward, 'أجر العمل');

  await message.reply(`💪 تم العمل بنجاح، لقد حصلت على ${formatMoney(reward)}. الرصيد الحالي: ${formatMoney(updated.wallet)}`);
}

async function handleBank(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const embed = new EmbedBuilder()
    .setColor('#7dffb2')
    .setTitle('🏦 البنك')
    .setDescription(`المحفظة: ${formatMoney(user.wallet)}\nالبنك: ${formatMoney(user.bank)}`);

  await message.reply({ embeds: [embed] });
}

async function handleDeposit(message, amountValue) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const amount = Number(amountValue || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply('⚠️ اكتب مبلغ صالح للإيداع، مثال: إيداع 200');
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

  await addTransaction(user.id, 'deposit', amount, 'إيداع إلى البنك');
  await message.reply(`✅ تم إيداع ${formatMoney(amount)} إلى البنك.\nالمحفظة: ${formatMoney(updated.wallet)}\nالبنك: ${formatMoney(updated.bank)}`);
}

async function handleWithdraw(message, amountValue) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const amount = Number(amountValue || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply('⚠️ اكتب مبلغ صالح للسحب، مثال: سحب 200');
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

  await addTransaction(user.id, 'withdraw', amount, 'سحب من البنك');
  await message.reply(`✅ تم سحب ${formatMoney(amount)} من البنك.\nالمحفظة: ${formatMoney(updated.wallet)}\nالبنك: ${formatMoney(updated.bank)}`);
}

async function handleTransfer(message, targetUser, amountValue) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const amount = Number(amountValue || 0);

  if (!targetUser) {
    return message.reply('⚠️ قم بالإشارة إلى المستخدم المراد تحويل المال إليه. مثال: تحويل @name 200');
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

  const target = await ensureUser(targetUser.id, targetUser.guild?.id || message.guildId, targetUser.username);

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: user.wallet - amount }
  });

  await prisma.user.update({
    where: { id: target.id },
    data: { wallet: target.wallet + amount }
  });

  await addTransaction(user.id, 'transfer_out', amount, `تحويل إلى ${targetUser.username}`);
  await addTransaction(target.id, 'transfer_in', amount, `استلام من ${message.author.username}`);

  await message.reply(`✅ تم تحويل ${formatMoney(amount)} إلى ${targetUser.username}.`);
}

async function handleDailyTransactionList(userId) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (!transactions.length) {
    return 'لا توجد معاملات حتى الآن.';
  }

  return transactions.map((item, index) => `${index + 1}. ${item.type} | ${formatMoney(item.amount)} | ${item.reason}`).join('\n');
}

async function handleTransactions(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const lines = await handleDailyTransactionList(user.id);

  const embed = new EmbedBuilder()
    .setColor('#b08cff')
    .setTitle('📑 سجل المعاملات')
    .setDescription(lines);

  await message.reply({ embeds: [embed] });
}

async function handleShop(message, itemName) {
  await ensureShopItems();
  const items = await prisma.shopItem.findMany({ where: { enabled: true } });

  const itemsString = items.map((item) => `• ${item.name} - ${formatMoney(item.price)} (${item.type})`).join('\n');
  const embed = new EmbedBuilder()
    .setColor('#ff78a9')
    .setTitle('🛍️ المتجر')
    .setDescription(itemsString || 'لا توجد عناصر متاحة الآن.');

  await message.reply({ embeds: [embed] });
}

async function handleBuy(message, itemName) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const name = itemName || '';

  if (!name.trim()) {
    return message.reply('⚠️ اكتب اسم العنصر، مثال: شراء سيف');
  }

  const item = await prisma.shopItem.findFirst({
    where: {
      name: {
        contains: name,
        mode: 'insensitive'
      }
    }
  });

  if (!item) {
    return message.reply('❌ العنصر غير موجود أو غير متاح.');
  }

  if (user.wallet < item.price) {
    return message.reply('❌ رصيدك غير كافٍ لشراء هذا العنصر.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: user.wallet - item.price }
  });

  const existing = await prisma.inventory.findFirst({
    where: { userId: user.id, itemName: item.name }
  });

  if (existing) {
    await prisma.inventory.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + 1 }
    });
  } else {
    await prisma.inventory.create({
      data: { userId: user.id, itemName: item.name, quantity: 1 }
    });
  }

  await addTransaction(user.id, 'purchase', item.price, `شراء ${item.name}`);
  await message.reply(`✅ تم شراء ${item.name} بنجاح بسعر ${formatMoney(item.price)}`);
}

async function handleInventory(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const items = await prisma.inventory.findMany({ where: { userId: user.id } });

  if (!items.length) {
    return message.reply('📦 لا توجد عناصر في المخزون الخاص بك.');
  }

  const text = items.map((item) => `• ${item.itemName} × ${item.quantity}`).join('\n');
  const embed = new EmbedBuilder()
    .setColor('#7cc7ff')
    .setTitle('🎒 المخزون')
    .setDescription(text);

  await message.reply({ embeds: [embed] });
}

async function handleCompany(message, actionText) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const text = actionText || '';

  if (!text.trim()) {
    return message.reply('🏢 مثال: شركة إنشاء اسم الشركة');
  }

  if (text.toLowerCase().startsWith('إنشاء') || text.toLowerCase().startsWith('create')) {
    const companyName = text.replace(/^(إنشاء|create)\s+/i, '').trim();
    if (!companyName) return message.reply('⚠️ اكتب اسم الشركة بعد كلمة إنشاء');

    const existing = await prisma.company.findFirst({ where: { name: companyName } });
    if (existing) return message.reply('❌ اسم الشركة موجود بالفعل.');

    const created = await prisma.company.create({
      data: {
        name: companyName,
        ownerId: user.id,
        balance: 0,
        level: 1
      }
    });

    await prisma.companyMember.create({
      data: {
        companyId: created.id,
        userId: user.id,
        role: 'owner'
      }
    });

    return message.reply(`✅ تم إنشاء الشركة **${companyName}** بنجاح.`);
  }

  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } }
      ]
    },
    include: { members: true }
  });

  if (!company) {
    return message.reply('❌ أنت لا تمتلك شركة أو عضو فيها.');
  }

  return message.reply(`🏢 الشركة: **${company.name}**\nالمالك: ${company.ownerId}\nالموظفين: ${company.members.length}\nالرصيد: ${formatMoney(company.balance)}`);
}

async function handleRob(message, targetMention) {
  const attacker = await ensureUser(message.author.id, message.guildId, message.author.username);

  if (!targetMention || !targetMention.id) {
    return message.reply('⚠️ اذكر المستخدم الذي تريد سرقته، مثال: سرقة @فلان');
  }

  const victim = await ensureUser(targetMention.id, targetMention.guild?.id || message.guildId, targetMention.username);

  if (attacker.id === victim.id) {
    return message.reply('❌ لا يمكنك سرقة نفسك.');
  }

  if (attacker.jailUntil && new Date(attacker.jailUntil) > new Date()) {
    return message.reply('🚫 أنت في السجن ولا يمكنك السرقة الآن.');
  }

  if (victim.wallet < 150) {
    return message.reply('❌ هذا المستخدم لا يملك ما يكفي للسرقة.');
  }

  const now = Date.now();
  const cooldown = 10 * 60 * 1000;
  if (attacker.lastRob && now - new Date(attacker.lastRob).getTime() < cooldown) {
    const sec = Math.ceil((cooldown - (now - new Date(attacker.lastRob).getTime())) / 1000);
    return message.reply(`⏳ يمكنك سرقة مستخدم آخر بعد ${sec} ثانية.`);
  }

  const successChance = randomBetween(1, 100);
  const reward = randomBetween(50, 500);

  if (successChance <= 55) {
    const updatedAttacker = await prisma.user.update({
      where: { id: attacker.id },
      data: {
        wallet: attacker.wallet + reward,
        lastRob: new Date()
      }
    });

    await prisma.user.update({
      where: { id: victim.id },
      data: { wallet: victim.wallet - reward }
    });

    await prisma.robberyLog.create({
      data: {
        victimId: victim.id,
        robberId: attacker.id,
        amount: reward,
        success: true
      }
    });

    await addTransaction(attacker.id, 'rob_success', reward, `سرقة من ${targetMention.username}`);
    await addTransaction(victim.id, 'rob_loss', reward, `سرقة من قبل ${message.author.username}`);

    return message.reply(`✅ نجحت السرقة بنجاح، حصلت على ${formatMoney(reward)} من ${targetMention.username}.\nالرصيد الحالي: ${formatMoney(updatedAttacker.wallet)}`);
  }

  const penalty = randomBetween(30, 180);
  const updatedAttacker = await prisma.user.update({
    where: { id: attacker.id },
    data: {
      wallet: Math.max(0, attacker.wallet - penalty),
      lastRob: new Date()
    }
  });

  await prisma.robberyLog.create({
    data: {
      victimId: victim.id,
      robberId: attacker.id,
      amount: penalty,
      success: false
    }
  });

  await addTransaction(attacker.id, 'rob_fail', penalty, `فشل سرقة من ${targetMention.username}`);
  await message.reply(`❌ فشلت السرقة، تم خصم ${formatMoney(penalty)}.\nالرصيد الحالي: ${formatMoney(updatedAttacker.wallet)}`);
}

async function handleLeaderboard(message) {
  const users = await prisma.user.findMany({
    orderBy: [{ wallet: 'desc' }, { bank: 'desc' }],
    take: 10
  });

  const rows = users.map((user, index) => `${index + 1}. ${user.username} - ${formatMoney(user.wallet + user.bank)}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#ffe66d')
    .setTitle('🏆 قائمة المتصدرين')
    .setDescription(rows || 'لا توجد بيانات بعد.');

  await message.reply({ embeds: [embed] });
}

async function handleCrime(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const chance = randomBetween(1, 100);
  const pay = randomBetween(60, 300);

  if (chance <= 60) {
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + pay }
    });

    await addTransaction(user.id, 'crime_success', pay, 'جريمة ناجحة');
    return message.reply(`✅ جريمة ناجحة، حصلت على ${formatMoney(pay)}.`);
  }

  const fine = randomBetween(25, 100);
  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: Math.max(0, user.wallet - fine) }
  });

  await addTransaction(user.id, 'crime_fail', fine, 'غرامة جريمة');
  return message.reply(`❌ فشلت الجريمة، تم خصم ${formatMoney(fine)}.`);
}

async function handleGamble(message, inputValue) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const amount = Number(inputValue || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply('⚠️ اكتب مبلغ صحيح، مثال: قمار 50');
  }

  if (user.wallet < amount) {
    return message.reply('❌ لا تملك هذا المبلغ في المحفظة.');
  }

  const win = randomBetween(1, 100) > 40;

  if (win) {
    const reward = amount * 2;
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + reward }
    });

    await addTransaction(user.id, 'gamble_win', reward, 'قمار فائز');
    return message.reply(`🎲 فاز! ربحت ${formatMoney(reward)}.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: user.wallet - amount }
  });

  await addTransaction(user.id, 'gamble_loss', amount, 'خسارة القمار');
  return message.reply(`🎲 خسرت ${formatMoney(amount)}.`);
}

async function handleShield(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  const item = await prisma.inventory.findFirst({ where: { userId: user.id, itemName: { contains: 'حماية' } } });

  if (!item) {
    return message.reply('❌ لا يوجد لديك درع حماية فعلي. استخدم المتجر لشراء عنصر الحماية.');
  }

  return message.reply('🛡️ لديك حماية فعالة ضد محاولة السرقة هذه المرة.');
}

async function handleLevel(message) {
  const user = await ensureUser(message.author.id, message.guildId, message.author.username);
  return message.reply(`📈 المستوى الحالي: ${user.level} | الخبرة: ${user.xp}`);
}

async function handleMessageCommand(message) {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  if (!content) return;

  const lower = content.toLowerCase();
  const args = content.split(/\s+/);
  const command = args[0].trim().toLowerCase();
  const rest = args.slice(1).join(' ');

  const isCommand = Object.keys(COMMANDS).some((key) => lower.startsWith(key.toLowerCase())) || lower.startsWith('شراء') || lower.startsWith('بيع') || lower.startsWith('إنشاء') || lower.startsWith('create');

  if (!isCommand) return;

  const mention = message.mentions.users.first();

  if (command === 'حساب' || command === 'رصيد') return handleBalance(message);
  if (command === 'بنك') return handleBank(message);
  if (command === 'يومية') return handleDaily(message);
  if (command === 'عمل') return handleWork(message);
  if (command === 'سرقة') return handleRob(message, mention);
  if (command === 'متجر') return handleShop(message, rest);
  if (command === 'شراء') return handleBuy(message, rest);
  if (command === 'بيع') return handleBuy(message, rest);
  if (command === 'مخزون') return handleInventory(message);
  if (command === 'شركة') return handleCompany(message, rest);
  if (command === 'تحويل') return handleTransfer(message, mention, rest.replace(/@\S+\s*/i, '').trim());
  if (command === 'إيداع') return handleDeposit(message, rest);
  if (command === 'سحب') return handleWithdraw(message, rest);
  if (command === 'سجل') return handleTransactions(message);
  if (command === 'قائمة') return handleLeaderboard(message);
  if (command === 'جريمة') return handleCrime(message);
  if (command === 'قمار') return handleGamble(message, rest);
  if (command === 'حماية') return handleShield(message);
  if (command === 'خبرة') return handleLevel(message);
}

const slashCommands = [
  new SlashCommandBuilder().setName('اعطاء').setDescription('إعطاء مستخدم مبلغ').addUserOption((option) => option.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((option) => option.setName('مبلغ').setDescription('المبلغ').setRequired(true)).addStringOption((option) => option.setName('سبب').setDescription('السبب').setRequired(false)),
  new SlashCommandBuilder().setName('سحب').setDescription('سحب مبلغ من مستخدم').addUserOption((option) => option.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((option) => option.setName('مبلغ').setDescription('المبلغ').setRequired(true)),
  new SlashCommandBuilder().setName('تعيين').setDescription('تعيين رصيد مستخدم').addUserOption((option) => option.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((option) => option.setName('مبلغ').setDescription('المبلغ').setRequired(true)),
  new SlashCommandBuilder().setName('تجميد').setDescription('تجميد مستخدم مؤقتاً').addUserOption((option) => option.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((option) => option.setName('دقائق').setDescription('عدد الدقائق').setRequired(true)).addStringOption((option) => option.setName('سبب').setDescription('السبب').setRequired(false)),
  new SlashCommandBuilder().setName('اضافة_عنصر').setDescription('إضافة عنصر جديد إلى المتجر').addStringOption((option) => option.setName('اسم').setDescription('اسم العنصر').setRequired(true)).addIntegerOption((option) => option.setName('سعر').setDescription('سعر العنصر').setRequired(true)).addStringOption((option) => option.setName('نوع').setDescription('نوع العنصر').setRequired(true)).addStringOption((option) => option.setName('وصف').setDescription('الوصف').setRequired(true)),
  new SlashCommandBuilder().setName('حذف_عنصر').setDescription('حذف عنصر من المتجر').addStringOption((option) => option.setName('اسم').setDescription('اسم العنصر').setRequired(true)),
  new SlashCommandBuilder().setName('تحديث_متجر').setDescription('تحديث المتجر').addStringOption((option) => option.setName('اسم').setDescription('اسم العنصر').setRequired(true)).addIntegerOption((option) => option.setName('سعر').setDescription('السعر الجديد').setRequired(true)),
  new SlashCommandBuilder().setName('تسجيلات').setDescription('عرض سجل الإداري').addIntegerOption((option) => option.setName('عدد').setDescription('عدد الإدخالات').setRequired(false)),
  new SlashCommandBuilder().setName('اعدادات').setDescription('إدارة إعدادات البوت')
];

async function handleAdminGive(interaction) {
  const target = interaction.options.getUser('مستخدم');
  const amount = interaction.options.getInteger('مبلغ');
  const reason = interaction.options.getString('سبب') || 'إدارة';

  const user = await ensureUser(target.id, interaction.guildId, target.username);
  await prisma.user.update({ where: { id: user.id }, data: { wallet: user.wallet + amount } });
  await addTransaction(user.id, 'admin_add', amount, reason);
  await createAdminLog(interaction.guildId, interaction.user.id, 'اعطاء', target.id, reason);
  await interaction.reply(`✅ تمت إضافة ${formatMoney(amount)} إلى ${target.username}`);
}

async function handleAdminRemove(interaction) {
  const target = interaction.options.getUser('مستخدم');
  const amount = interaction.options.getInteger('مبلغ');

  const user = await ensureUser(target.id, interaction.guildId, target.username);
  await prisma.user.update({ where: { id: user.id }, data: { wallet: Math.max(0, user.wallet - amount) } });
  await addTransaction(user.id, 'admin_remove', amount, 'سحب من الإدارة');
  await createAdminLog(interaction.guildId, interaction.user.id, 'سحب', target.id, 'سحب اداري');
  await interaction.reply(`✅ تم سحب ${formatMoney(amount)} من ${target.username}`);
}

async function handleAdminSet(interaction) {
  const target = interaction.options.getUser('مستخدم');
  const amount = interaction.options.getInteger('مبلغ');

  const user = await ensureUser(target.id, interaction.guildId, target.username);
  await prisma.user.update({ where: { id: user.id }, data: { wallet: amount } });
  await addTransaction(user.id, 'admin_set', amount, 'تعيين رصيد');
  await createAdminLog(interaction.guildId, interaction.user.id, 'تعيين', target.id, 'تعيين رصيد');
  await interaction.reply(`✅ تم تعيين رصيد ${target.username} إلى ${formatMoney(amount)}`);
}

async function handleAdminJail(interaction) {
  const target = interaction.options.getUser('مستخدم');
  const minutes = interaction.options.getInteger('دقائق');
  const reason = interaction.options.getString('سبب') || 'تجميد من الإدارة';

  const user = await ensureUser(target.id, interaction.guildId, target.username);
  const jailDate = new Date(Date.now() + minutes * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { jailUntil: jailDate } });
  await createAdminLog(interaction.guildId, interaction.user.id, 'تجميد', target.id, reason);
  await interaction.reply(`🚫 تم تجميد ${target.username} لمدة ${minutes} دقيقة.`);
}

async function handleAddShopItem(interaction) {
  const name = interaction.options.getString('اسم');
  const price = interaction.options.getInteger('سعر');
  const type = interaction.options.getString('نوع');
  const description = interaction.options.getString('وصف');

  const item = await prisma.shopItem.upsert({
    where: { name },
    update: { price, type, description },
    create: { name, price, type, description, rarity: 'common' }
  });

  await createAdminLog(interaction.guildId, interaction.user.id, 'add_shop_item', null, `اسم: ${item.name}`);
  await interaction.reply(`✅ تم إضافة العنصر ${item.name} إلى المتجر.`);
}

async function handleDeleteShopItem(interaction) {
  const name = interaction.options.getString('اسم');
  await prisma.shopItem.delete({ where: { name } }).catch(() => null);
  await createAdminLog(interaction.guildId, interaction.user.id, 'delete_shop_item', null, `اسم: ${name}`);
  await interaction.reply(`✅ تم حذف العنصر ${name}.`);
}

async function handleUpdateShopItem(interaction) {
  const name = interaction.options.getString('اسم');
  const price = interaction.options.getInteger('سعر');
  await prisma.shopItem.update({ where: { name }, data: { price } });
  await createAdminLog(interaction.guildId, interaction.user.id, 'update_shop_item', null, `اسم: ${name}`);
  await interaction.reply(`✅ تم تحديث سعر ${name} إلى ${formatMoney(price)}.`);
}

async function handleAdminLogs(interaction) {
  const count = interaction.options.getInteger('عدد') || 10;
  const logs = await prisma.adminLog.findMany({ where: { guildId: interaction.guildId }, orderBy: { createdAt: 'desc' }, take: count });
  const text = logs.length ? logs.map((log) => `${log.action} | ${log.reason || 'بدون سبب'}`).join('\n') : 'لا توجد تسجيلات.';
  await interaction.reply({ content: text.slice(0, 1900) });
}

async function handleConfig(interaction) {
  await interaction.reply('⚙️ تم تجهيز إعدادات البوت بنجاح.');
}

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await ensureShopItems();

  try {
    const commandsToRegister = slashCommands.map((command) => command.toJSON());
    await client.application.commands.set(commandsToRegister);
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('Failed to register slash commands', error);
  }
});

client.on('messageCreate', async (message) => {
  await handleMessageCommand(message);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const name = interaction.commandName;

  if (name === 'اعطاء') return handleAdminGive(interaction);
  if (name === 'سحب') return handleAdminRemove(interaction);
  if (name === 'تعيين') return handleAdminSet(interaction);
  if (name === 'تجميد') return handleAdminJail(interaction);
  if (name === 'اضافة_عنصر') return handleAddShopItem(interaction);
  if (name === 'حذف_عنصر') return handleDeleteShopItem(interaction);
  if (name === 'تحديث_متجر') return handleUpdateShopItem(interaction);
  if (name === 'تسجيلات') return handleAdminLogs(interaction);
  if (name === 'اعدادات') return handleConfig(interaction);
});

client.login(token);
