const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../db');
const { ensureUser, formatMoney, addTransaction } = require('../services/economy');

const adminCommands = [
  new SlashCommandBuilder()
    .setName('give')
    .setDescription('إعطاء مال للاعب')
    .addUserOption((option) => option.setName('user').setDescription('المستخدم').setRequired(true))
    .addIntegerOption((option) => option.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('خصم مال من لاعب')
    .addUserOption((option) => option.setName('user').setDescription('المستخدم').setRequired(true))
    .addIntegerOption((option) => option.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setbalance')
    .setDescription('تعيين رصيد لاعب')
    .addUserOption((option) => option.setName('user').setDescription('المستخدم').setRequired(true))
    .addIntegerOption((option) => option.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('jail')
    .setDescription('تجميد لاعب مؤقتًا')
    .addUserOption((option) => option.setName('user').setDescription('المستخدم').setRequired(true))
    .addIntegerOption((option) => option.setName('minutes').setDescription('عدد الدقائق').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('إلغاء تجميد لاعب')
    .addUserOption((option) => option.setName('user').setDescription('المستخدم').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('إضافة عنصر جديد')
    .addStringOption((option) => option.setName('name').setDescription('اسم العنصر').setRequired(true))
    .addIntegerOption((option) => option.setName('price').setDescription('السعر').setRequired(true).setMinValue(1))
    .addStringOption((option) => option.setName('type').setDescription('نوع العنصر').setRequired(true))
    .addStringOption((option) => option.setName('description').setDescription('الوصف').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('حذف عنصر')
    .addStringOption((option) => option.setName('name').setDescription('اسم العنصر').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('updateitem')
    .setDescription('تحديث سعر العنصر')
    .addStringOption((option) => option.setName('name').setDescription('اسم العنصر').setRequired(true))
    .addIntegerOption((option) => option.setName('price').setDescription('السعر الجديد').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('عرض سجل الإدارة')
    .addIntegerOption((option) => option.setName('count').setDescription('عدد السجلات').setRequired(false).setMinValue(1).setMaxValue(20))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('إدارة إعدادات البوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

async function handleGive(interaction) {
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  const user = await ensureUser(target.id, interaction.guildId, target.username, target.displayAvatarURL({ extension: 'png', size: 256 }));

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: { increment: amount } }
  });

  await addTransaction(user.id, 'admin_give', amount, 'إعطاء مال إداري');
  await createAdminLog(interaction.guildId, interaction.user.id, 'give', target.id, 'إعطاء مال');

  return interaction.reply(`✅ تم إعطاء **${amount}** إلى ${target.username}`);
}

async function handleRemove(interaction) {
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  const user = await ensureUser(target.id, interaction.guildId, target.username, target.displayAvatarURL({ extension: 'png', size: 256 }));

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: { decrement: amount } }
  });

  await addTransaction(user.id, 'admin_remove', amount, 'خصم مالي إداري');
  await createAdminLog(interaction.guildId, interaction.user.id, 'remove', target.id, 'خصم مال');

  return interaction.reply(`✅ تم خصم **${amount}** من ${target.username}`);
}

async function handleSetBalance(interaction) {
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  const user = await ensureUser(target.id, interaction.guildId, target.username, target.displayAvatarURL({ extension: 'png', size: 256 }));

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: amount }
  });

  await addTransaction(user.id, 'admin_setbalance', amount, 'تعيين رصيد إداري');
  await createAdminLog(interaction.guildId, interaction.user.id, 'setbalance', target.id, 'تعيين رصيد');

  return interaction.reply(`✅ تم تعيين رصيد ${target.username} إلى **${amount}**`);
}

async function handleJail(interaction) {
  const target = interaction.options.getUser('user');
  const minutes = interaction.options.getInteger('minutes');

  const user = await ensureUser(target.id, interaction.guildId, target.username, target.displayAvatarURL({ extension: 'png', size: 256 }));

  await prisma.user.update({
    where: { id: user.id },
    data: { jailUntil: new Date(Date.now() + minutes * 60 * 1000) }
  });

  await createAdminLog(interaction.guildId, interaction.user.id, 'jail', target.id, 'تجميد لاعب');

  return interaction.reply(`🚓 تم تجميد ${target.username} لمدة **${minutes}** دقيقة.`);
}

async function handleUnjail(interaction) {
  const target = interaction.options.getUser('user');

  const user = await ensureUser(target.id, interaction.guildId, target.username, target.displayAvatarURL({ extension: 'png', size: 256 }));

  await prisma.user.update({
    where: { id: user.id },
    data: { jailUntil: null }
  });

  await createAdminLog(interaction.guildId, interaction.user.id, 'unjail', target.id, 'إلغاء تجميد');

  return interaction.reply(`✅ تم إلغاء تجميد ${target.username}.`);
}

async function handleAddItem(interaction) {
  const name = interaction.options.getString('name');
  const price = interaction.options.getInteger('price');
  const type = interaction.options.getString('type');
  const description = interaction.options.getString('description');

  await prisma.shopItem.upsert({
    where: { name },
    update: { price, type, description },
    create: { name, price, type, description, rarity: 'common' }
  });

  await createAdminLog(interaction.guildId, interaction.user.id, 'additem', null, `إضافة عنصر: ${name}`);

  return interaction.reply(`✅ تم إضافة العنصر **${name}** إلى المتجر.`);
}

async function handleRemoveItem(interaction) {
  const name = interaction.options.getString('name');

  await prisma.shopItem.delete({ where: { name } }).catch(() => null);
  await createAdminLog(interaction.guildId, interaction.user.id, 'removeitem', null, `حذف عنصر: ${name}`);

  return interaction.reply(`✅ تم حذف العنصر **${name}**.`);
}

async function handleUpdateItem(interaction) {
  const name = interaction.options.getString('name');
  const price = interaction.options.getInteger('price');

  await prisma.shopItem.update({
    where: { name },
    data: { price }
  });

  await createAdminLog(interaction.guildId, interaction.user.id, 'updateitem', null, `تحديث سعر: ${name}`);

  return interaction.reply(`✅ تم تحديث سعر **${name}** إلى **${price}**.`);
}

async function handleLogs(interaction) {
  const count = interaction.options.getInteger('count') || 10;

  const logs = await prisma.adminLog.findMany({
    where: { guildId: interaction.guildId },
    orderBy: { createdAt: 'desc' },
    take: count
  });

  const text = logs.length
    ? logs.map((row) => `• ${row.action} | ${row.reason || 'بدون سبب'}`).join('\n')
    : 'لا توجد تسجيلات';

  return interaction.reply({ content: text.slice(0, 1900) });
}

async function handleSettings(interaction) {
  return interaction.reply('⚙️ تم تجهيز إعدادات البوت بنجاح.');
}

module.exports = {
  adminCommands,
  handleGive,
  handleRemove,
  handleSetBalance,
  handleJail,
  handleUnjail,
  handleAddItem,
  handleRemoveItem,
  handleUpdateItem,
  handleLogs,
  handleSettings
};
