const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { prisma } = require('../db');
const { ensureUser, formatMoney, addTransaction } = require('../services/economy');

const slashCommands = [
  new SlashCommandBuilder().setName('اعطاء').setDescription('إعطاء مستخدم مبلغ').addUserOption((o) => o.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((o) => o.setName('مبلغ').setDescription('المبلغ').setRequired(true)).addStringOption((o) => o.setName('سبب').setDescription('سبب الإعطاء').setRequired(false)),
  new SlashCommandBuilder().setName('سحب').setDescription('سحب مبلغ من مستخدم').addUserOption((o) => o.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((o) => o.setName('مبلغ').setDescription('المبلغ').setRequired(true)).addStringOption((o) => o.setName('سبب').setDescription('سبب السحب').setRequired(false)),
  new SlashCommandBuilder().setName('تعيين').setDescription('تعيين رصيد مستخدم').addUserOption((o) => o.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((o) => o.setName('مبلغ').setDescription('المبلغ').setRequired(true)),
  new SlashCommandBuilder().setName('تجميد').setDescription('تجميد مستخدم مؤقتً').addUserOption((o) => o.setName('مستخدم').setDescription('المستخدم').setRequired(true)).addIntegerOption((o) => o.setName('دقائق').setDescription('عدد الدقائق').setRequired(true)).addStringOption((o) => o.setName('سبب').setDescription('سبب التجميد').setRequired(false)),
  new SlashCommandBuilder().setName('اضافة_عنصر').setDescription('إضافة عنصر للمتجر').addStringOption((o) => o.setName('اسم').setDescription('اسم العنصر').setRequired(true)).addIntegerOption((o) => o.setName('سعر').setDescription('سعر العنصر').setRequired(true)).addStringOption((o) => o.setName('نوع').setDescription('نوع العنصر').setRequired(true)).addStringOption((o) => o.setName('وصف').setDescription('الوصف').setRequired(true)),
  new SlashCommandBuilder().setName('حذف_عنصر').setDescription('حذف عنصر من المتجر').addStringOption((o) => o.setName('اسم').setDescription('اسم العنصر').setRequired(true)),
  new SlashCommandBuilder().setName('تحديث_السوق').setDescription('تحديث سعر عنصر في المتجر').addStringOption((o) => o.setName('اسم').setDescription('اسم العنصر').setRequired(true)).addIntegerOption((o) => o.setName('سعر').setDescription('السعر الجديد').setRequired(true)),
  new SlashCommandBuilder().setName('تسجيلات').setDescription('عرض سجل الإدارة').addIntegerOption((o) => o.setName('عدد').setDescription('عدد السجلات').setRequired(false)),
  new SlashCommandBuilder().setName('اعدادات').setDescription('إدارة إعدادات البوت')
];

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

async function handleAdminGive(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const target = interaction.options.getUser('مستخدم');
  const amount = interaction.options.getInteger('مبلغ');
  const reason = interaction.options.getString('سبب') || 'إدارة';

  const user = await ensureUser(prisma, target.id, interaction.guildId, target.username, target.displayAvatarURL({ format: 'png', size: 256 }));
  await prisma.user.update({ where: { id: user.id }, data: { wallet: user.wallet + amount } });
  await addTransaction(prisma, user.id, 'admin_add', amount, reason);
  await createAdminLog(interaction.guildId, interaction.user.id, 'اعطاء', target.id, reason);

  await interaction.reply(`✅ تمت إضافة ${formatMoney(amount)} إلى ${target.username}`);
}

async function handleAdminRemove(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const target = interaction.options.getUser('مستخدم');
  const amount = interaction.options.getInteger('مبلغ');
  const reason = interaction.options.getString('سبب') || 'سحب إداري';

  const user = await ensureUser(prisma, target.id, interaction.guildId, target.username, target.displayAvatarURL({ format: 'png', size: 256 }));
  await prisma.user.update({ where: { id: user.id }, data: { wallet: Math.max(0, user.wallet - amount) } });
  await addTransaction(prisma, user.id, 'admin_remove', amount, reason);
  await createAdminLog(interaction.guildId, interaction.user.id, 'سحب', target.id, reason);

  await interaction.reply(`✅ تم سحب ${formatMoney(amount)} من ${target.username}`);
}

async function handleAdminSet(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const target = interaction.options.getUser('مستخدم');
  const amount = interaction.options.getInteger('مبلغ');

  const user = await ensureUser(prisma, target.id, interaction.guildId, target.username, target.displayAvatarURL({ format: 'png', size: 256 }));
  await prisma.user.update({ where: { id: user.id }, data: { wallet: amount } });
  await addTransaction(prisma, user.id, 'admin_set', amount, 'إعادة تعيين الرصيد');
  await createAdminLog(interaction.guildId, interaction.user.id, 'تعيين', target.id, 'إعادة تعيين الرصيد');

  await interaction.reply(`✅ تم تعيين رصيد ${target.username} إلى ${formatMoney(amount)}`);
}

async function handleAdminJail(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const target = interaction.options.getUser('مستخدم');
  const minutes = interaction.options.getInteger('دقائق');
  const reason = interaction.options.getString('سبب') || 'تجميد من الإدارة';

  const user = await ensureUser(prisma, target.id, interaction.guildId, target.username, target.displayAvatarURL({ format: 'png', size: 256 }));
  const jailUntil = new Date(Date.now() + minutes * 60 * 1000);

  await prisma.user.update({ where: { id: user.id }, data: { jailUntil } });
  await createAdminLog(interaction.guildId, interaction.user.id, 'تجميد', target.id, reason);

  await interaction.reply(`🚫 تم تجميد ${target.username} لمدة ${minutes} دقيقة.`);
}

async function handleAddShopItem(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const name = interaction.options.getString('اسم');
  const price = interaction.options.getInteger('سعر');
  const type = interaction.options.getString('نوع');
  const description = interaction.options.getString('وصف');

  await prisma.shopItem.upsert({
    where: { name },
    update: { price, type, description },
    create: { name, price, type, description, rarity: 'common' }
  });

  await createAdminLog(interaction.guildId, interaction.user.id, 'إضافة_عنصر', null, `اسم: ${name}`);
  await interaction.reply(`✅ تم إضافة العنصر **${name}** إلى المتجر.`);
}

async function handleDeleteShopItem(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const name = interaction.options.getString('اسم');
  await prisma.shopItem.delete({ where: { name } }).catch(() => null);
  await createAdminLog(interaction.guildId, interaction.user.id, 'حذف_عنصر', null, `اسم: ${name}`);
  await interaction.reply(`✅ تم حذف العنصر **${name}**.`);
}

async function handleUpdateMarket(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const name = interaction.options.getString('اسم');
  const price = interaction.options.getInteger('سعر');
  await prisma.shopItem.update({ where: { name }, data: { price } });
  await createAdminLog(interaction.guildId, interaction.user.id, 'تحديث_السوق', null, `اسم: ${name}`);
  await interaction.reply(`✅ تم تحديث سعر **${name}** إلى ${formatMoney(price)}.`);
}

async function handleAdminLogs(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  const count = interaction.options.getInteger('عدد') || 10;
  const logs = await prisma.adminLog.findMany({ where: { guildId: interaction.guildId }, orderBy: { createdAt: 'desc' }, take: count });
  const text = logs.length ? logs.map((row) => `${row.action} | ${row.reason || 'بدون سبب'}`).join('\n') : 'لا توجد تسجيلات.';

  await interaction.reply({ content: text.slice(0, 1900) });
}

async function handleConfig(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية الإدارة.', ephemeral: true });
  }

  await interaction.reply('⚙️ تم تجهيز إعدادات البوت بنجاح.');
}

module.exports = {
  slashCommands,
  handleAdminGive,
  handleAdminRemove,
  handleAdminSet,
  handleAdminJail,
  handleAddShopItem,
  handleDeleteShopItem,
  handleUpdateMarket,
  handleAdminLogs,
  handleConfig
};
