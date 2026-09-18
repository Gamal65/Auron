const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { prisma, ensureUser, randomBetween, formatMoney, addTransaction } = require('../services/economy');
const { buildProfileCard } = require('../services/canvas');
const { EMOJI, COLORS, RARITY } = require('../ui/theme');

const SHOP_ITEMS = [
  { name: 'سيف نيون', price: 300, type: 'weapon', description: 'سلاح قوي', rarity: 'rare' },
  { name: 'درع التحدي', price: 180, type: 'armor', description: 'حماية متوسطة', rarity: 'common' },
  { name: 'خاتم الحظ', price: 700, type: 'luck', description: 'يزيد فرص النجاح', rarity: 'rare' },
  { name: 'درع أونيكس', price: 1200, type: 'shield', description: 'درع قوى', rarity: 'epic' },
  { name: 'تاج أورون', price: 3000, type: 'vip', description: 'عنصر أسطوري', rarity: 'legendary' }
];

async function getUser(message, targetUser = null) {
  const user = targetUser || message.author;
  return ensureUser(user.id, message.guildId, user.username, user.displayAvatarURL({ extension: 'png', size: 256 }));
}

async function balance(message) {
  const user = await getUser(message);
  const rank = (await prisma.user.count({ where: { wallet: { gt: user.wallet } } })) + 1;

  const card = await buildProfileCard({
    username: user.username,
    wallet: formatMoney(user.wallet),
    bank: formatMoney(user.bank),
    level: user.level,
    xp: user.xp,
    reputation: user.reputation,
    avatarUrl: user.avatarUrl,
    rank
  });

  return message.reply({ files: [new AttachmentBuilder(card, { name: 'auron-profile.png' })] });
}

async function bank(message) {
  const user = await getUser(message);

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`${EMOJI.bank} بنك أورون`)
        .setDescription(`💰 المحفظة: **${formatMoney(user.wallet)}**\n🏦 البنك: **${formatMoney(user.bank)}**`)
    ]
  });
}

async function daily(message) {
  const user = await getUser(message);
  const now = Date.now();

  if (user.lastDaily && now - new Date(user.lastDaily).getTime() < 86400000) {
    const rem = Math.ceil((86400000 - (now - new Date(user.lastDaily).getTime())) / (60 * 60 * 1000));
    return message.reply(`${EMOJI.warning} يمكنك استلام المكافأة بعد **${rem} ساعة**.`);
  }

  const reward = randomBetween(300, 900);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: { increment: reward },
      lastDaily: new Date()
    }
  });

  await addTransaction(user.id, 'daily', reward, 'مكافأة يومية');

  return message.reply(`${EMOJI.daily} استلمت **${formatMoney(reward)}**، رصيدك الآن **${formatMoney(updated.wallet)}**.`);
}

async function weekly(message) {
  const user = await getUser(message);
  const now = Date.now();

  if (user.lastWeekly && now - new Date(user.lastWeekly).getTime() < 7 * 86400000) {
    const rem = Math.ceil((7 * 86400000 - (now - new Date(user.lastWeekly).getTime())) / (60 * 60 * 1000));
    return message.reply(`${EMOJI.warning} يمكنك استلام الأسبوعية بعد **${rem} ساعة**.`);
  }

  const reward = randomBetween(1000, 2500);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: { increment: reward },
      lastWeekly: new Date()
    }
  });

  await addTransaction(user.id, 'weekly', reward, 'مكافأة أسبوعية');

  return message.reply(`${EMOJI.star} حصلت على **${formatMoney(reward)}** كأسبوعية.`);
}

async function work(message) {
  const user = await getUser(message);

  if (user.lastWork && Date.now() - new Date(user.lastWork).getTime() < 60000) {
    return message.reply(`${EMOJI.warning} انتظر دقيقة قبل العمل مرة أخرى.`);
  }

  const reward = randomBetween(120, 320);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      wallet: { increment: reward },
      xp: { increment: reward },
      lastWork: new Date()
    }
  });

  await addTransaction(user.id, 'work', reward, 'أجر العمل');

  return message.reply(`${EMOJI.work} عملت بنجاح وحققت **${formatMoney(reward)}**.`);
}

async function deposit(message, amountText) {
  const user = await getUser(message);
  const amount = Number(amountText);

  if (!Number.isInteger(amount) || amount <= 0) {
    return message.reply(`${EMOJI.fail} استخدم: إيداع 250`);
  }

  if (user.wallet < amount) {
    return message.reply(`${EMOJI.fail} لا تملك هذا المبلغ في المحفظة.`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        wallet: { decrement: amount },
        bank: { increment: amount }
      }
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: 'deposit', amount, reason: 'إيداع إلى البنك' }
    })
  ]);

  return message.reply(`${EMOJI.success} تم إيداع **${formatMoney(amount)}** إلى البنك.`);
}

async function withdraw(message, amountText) {
  const user = await getUser(message);
  const amount = Number(amountText);

  if (!Number.isInteger(amount) || amount <= 0) {
    return message.reply(`${EMOJI.fail} استخدم: سحب 250`);
  }

  if (user.bank < amount) {
    return message.reply(`${EMOJI.fail} لا تملك هذا المبلغ في البنك.`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        wallet: { increment: amount },
        bank: { decrement: amount }
      }
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: 'withdraw', amount, reason: 'سحب من البنك' }
    })
  ]);

  return message.reply(`${EMOJI.success} تم سحب **${formatMoney(amount)}** من البنك.`);
}

async function transfer(message, targetUser, amountText) {
  const user = await getUser(message);
  const amount = Number(amountText);

  if (!targetUser) {
    return message.reply(`${EMOJI.warning} استخدم: تحويل @عضو 250`);
  }

  if (targetUser.id === message.author.id) {
    return message.reply(`${EMOJI.fail} لا يمكنك تحويل المال لنفسك.`);
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return message.reply(`${EMOJI.fail} المبلغ غير صحيح.`);
  }

  if (user.wallet < amount) {
    return message.reply(`${EMOJI.fail} لا تملك ما يكفي لتحويل هذا المبلغ.`);
  }

  const target = await getUser(message, targetUser);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { wallet: { decrement: amount } }
    }),
    prisma.user.update({
      where: { id: target.id },
      data: { wallet: { increment: amount } }
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: 'transfer_out', amount, reason: `تحويل إلى ${targetUser.username}` }
    }),
    prisma.transaction.create({
      data: { userId: target.id, type: 'transfer_in', amount, reason: `استلام من ${message.author.username}` }
    })
  ]);

  return message.reply(`${EMOJI.transfer} تم تحويل **${formatMoney(amount)}** إلى **${targetUser.username}**.`);
}

async function transactions(message) {
  const user = await getUser(message);

  const rows = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const text = rows.length
    ? rows.map((row, index) => `**${index + 1}.** ${row.type} | ${formatMoney(row.amount)} | ${row.reason}`).join('\n')
    : 'لا توجد معاملات حتى الآن.';

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`${EMOJI.money} سجل المعاملات`)
        .setDescription(text)
    ]
  });
}

async function shop(message) {
  await Promise.all(SHOP_ITEMS.map((item) =>
    prisma.shopItem.upsert({
      where: { name: item.name },
      update: item,
      create: item
    })
  ));

  const list = SHOP_ITEMS.map((item) =>
    `${RARITY[item.rarity].emoji} **${item.name}** — ${formatMoney(item.price)}\n> ${item.description}`
  ).join('\n\n');

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`${EMOJI.shop} متجر أورون`)
        .setDescription(list)
    ]
  });
}

async function buy(message, itemName) {
  const user = await getUser(message);
  const query = String(itemName || '').trim();

  if (!query) {
    return message.reply(`${EMOJI.fail} استخدم: شراء سيف نيون`);
  }

  const item = await prisma.shopItem.findFirst({
    where: { name: { contains: query, mode: 'insensitive' } }
  });

  if (!item) {
    return message.reply(`${EMOJI.fail} العنصر غير موجود.`);
  }

  if (user.wallet < item.price) {
    return message.reply(`${EMOJI.fail} لا تملك مال كافي لشراء هذا العنصر.`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { wallet: { decrement: item.price } }
    }),
    prisma.inventory.upsert({
      where: {
        userId_itemName: {
          userId: user.id,
          itemName: item.name
        }
      },
      update: { quantity: { increment: 1 } },
      create: {
        userId: user.id,
        itemName: item.name,
        quantity: 1
      }
    }),
    prisma.transaction.create({
      data: { userId: user.id, type: 'purchase', amount: item.price, reason: `شراء ${item.name}` }
    })
  ]);

  return message.reply(`${EMOJI.success} تم شراء **${item.name}** بنجاح.`);
}

async function inventory(message) {
  const user = await getUser(message);
  const items = await prisma.inventory.findMany({
    where: { userId: user.id },
    orderBy: { itemName: 'asc' }
  });

  const text = items.length
    ? items.map((item) => `• **${item.itemName}** × ${item.quantity}`).join('\n')
    : 'حقيبتك فارغة الآن.';

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`${EMOJI.item} مخزونك`)
        .setDescription(text)
    ]
  });
}

async function useItem(message, itemName) {
  const user = await getUser(message);
  const query = String(itemName || '').trim();

  if (!query) {
    return message.reply(`${EMOJI.warning} استخدم: استخدم سيف نيون`);
  }

  const item = await prisma.inventory.findFirst({
    where: { userId: user.id, itemName: { contains: query, mode: 'insensitive' } }
  });

  if (!item) {
    return message.reply(`${EMOJI.fail} لا تملك هذا العنصر.`);
  }

  await prisma.inventory.delete({ where: { id: item.id } });
  await prisma.user.update({
    where: { id: user.id },
    data: { reputation: { increment: 5 } }
  });

  return message.reply(`${EMOJI.success} تم استخدام **${item.itemName}**، وارتفعت سمعتك بـ 5.`);
}

async function rob(message, targetUser) {
  const attacker = await getUser(message);
  const target = targetUser;

  if (!target) {
    return message.reply(`${EMOJI.warning} استخدم: سرقة @عضو`);
  }

  if (target.id === message.author.id) {
    return message.reply(`${EMOJI.fail} لا يمكنك سرقة نفسك.`);
  }

  if (attacker.jailUntil && new Date(attacker.jailUntil) > new Date()) {
    return message.reply(`${EMOJI.jail} أنت مسجون الآن، لا يمكنك السرقة.`);
  }

  const victim = await getUser(message, target);

  if (victim.wallet < 120) {
    return message.reply(`${EMOJI.fail} هذا اللاعب لا يملك ما يكفي.`);
  }

  const now = Date.now();
  if (attacker.lastRob && now - new Date(attacker.lastRob).getTime() < 600000) {
    return message.reply(`${EMOJI.warning} يمكنك سرقة مستخدم آخر بعد 10 دقائق.`);
  }

  const success = randomBetween(1, 100) <= 55;
  const amount = randomBetween(80, 500);

  if (success) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: attacker.id },
        data: { wallet: { increment: amount }, lastRob: new Date() }
      }),
      prisma.user.update({
        where: { id: victim.id },
        data: { wallet: { decrement: amount } }
      }),
      prisma.robberyLog.create({
        data: {
          victimId: victim.id,
          robberId: attacker.id,
          amount,
          success: true
        }
      })
    ]);

    return message.reply(`${EMOJI.robbery} ${EMOJI.success} نجحت السرقة! حصلت على **${formatMoney(amount)}**.`);
  }

  const fine = randomBetween(30, 180);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: attacker.id },
      data: { wallet: { decrement: fine }, lastRob: new Date() }
    }),
    prisma.robberyLog.create({
      data: {
        victimId: victim.id,
        robberId: attacker.id,
        amount: fine,
        success: false
      }
    })
  ]);

  return message.reply(`${EMOJI.robbery} ${EMOJI.fail} فشلت السرقة، وتم خصم **${formatMoney(fine)}**.`);
}

async function crime(message) {
  const user = await getUser(message);
  const success = randomBetween(1, 100) <= 60;
  const gain = randomBetween(100, 350);

  if (success) {
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: { increment: gain } }
    });
    await addTransaction(user.id, 'crime_success', gain, 'جريمة ناجحة');

    return message.reply(`${EMOJI.crime} ${EMOJI.success} جريمة ناجحة! ربحت **${formatMoney(gain)}**.`);
  }

  const fine = randomBetween(30, 150);
  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: { decrement: fine } }
  });
  await addTransaction(user.id, 'crime_fail', fine, 'غرامة جريمة');

  return message.reply(`${EMOJI.crime} ${EMOJI.fail} فشلت الجريمة، وقمت بدفع غرامة **${formatMoney(fine)}**.`);
}

async function gamble(message, amountText) {
  const user = await getUser(message);
  const amount = Number(amountText);

  if (!Number.isInteger(amount) || amount <= 0) {
    return message.reply(`${EMOJI.warning} استخدم: قمار 100`);
  }

  if (user.wallet < amount) {
    return message.reply(`${EMOJI.fail} لا تملك هذا المبلغ في المحفظة.`);
  }

  const win = randomBetween(1, 100) <= 50;
  if (win) {
    const reward = amount * 2;
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: { increment: reward } }
    });
    await addTransaction(user.id, 'gamble_win', reward, 'قمار فائز');

    return message.reply(`${EMOJI.success} 🎲 فزت! ربحت **${formatMoney(reward)}**.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: { decrement: amount } }
  });
  await addTransaction(user.id, 'gamble_loss', amount, 'خسارة قمار');

  return message.reply(`${EMOJI.fail} 🎲 خسرت **${formatMoney(amount)}**.`);
}

async function slotMachine(message, amountText) {
  const user = await getUser(message);
  const amount = Number(amountText);

  if (!Number.isInteger(amount) || amount <= 0) {
    return message.reply(`${EMOJI.warning} استخدم: سلوت 100`);
  }

  if (user.wallet < amount) {
    return message.reply(`${EMOJI.fail} لا تملك هذا المبلغ في المحفظة.`);
  }

  const result = [randomBetween(1, 10), randomBetween(1, 10), randomBetween(1, 10)];
  const win = result.every((v) => v >= 8);

  if (win) {
    const reward = amount * 3;
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: { increment: reward } }
    });
    await addTransaction(user.id, 'slots_win', reward, 'فوز في السلوت');
    return message.reply(`${EMOJI.slot} فزت! الربح **${formatMoney(reward)}**.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { wallet: { decrement: amount } }
  });
  await addTransaction(user.id, 'slots_loss', amount, 'خسارة في السلوت');

  return message.reply(`${EMOJI.fail} خسرت **${formatMoney(amount)}**.`);
}

async function leaderboard(message) {
  const users = await prisma.user.findMany({
    orderBy: [{ wallet: 'desc' }, { bank: 'desc' }],
    take: 10
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(`${EMOJI.leaderboard} قائمة المتصدرين`)
    .setDescription(
      users.length
        ? users.map((u, i) => `**${i + 1}.** ${u.username} — ${formatMoney(u.wallet + u.bank)}`).join('\n')
        : 'لا توجد بيانات بعد.'
    );

  return message.reply({ embeds: [embed] });
}

async function company(message, actionText) {
  const user = await getUser(message);

  if (!actionText || !actionText.trim()) {
    return message.reply(`${EMOJI.company} استخدم: شركة إنشاء اسم_الشركة`);
  }

  if (actionText.toLowerCase().startsWith('إنشاء')) {
    const name = actionText.replace(/^إنشاء\s+/i, '').trim();

    if (!name) {
      return message.reply(`${EMOJI.warning} اكتب اسم الشركة.`);
    }

    const exists = await prisma.company.findFirst({ where: { name } });

    if (exists) {
      return message.reply(`${EMOJI.fail} اسم الشركة موجود بالفعل.`);
    }

    const created = await prisma.company.create({ data: { name, ownerId: user.id } });
    await prisma.companyMember.create({
      data: { companyId: created.id, userId: user.id, role: 'owner' }
    });

    return message.reply(`${EMOJI.company} ${EMOJI.success} تم إنشاء الشركة **${name}**.`);
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
    return message.reply(`${EMOJI.fail} أنت لا تمتلك شركة الآن.`);
  }

  return message.reply(
    `${EMOJI.company} **${company.name}**\n` +
    `👥 الموظفين: ${company.members.length}\n` +
    `💼 الخزينة: ${formatMoney(company.balance)}`
  );
}

async function help(message) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`${EMOJI.help} دليل أوامر أورون`)
    .setDescription(
      '💰 الاقتصاد\n' +
      '• حساب / رصيد / بنك / إيداع / سحب / تحويل / سجل\n' +
      '• يومية / أسبوعية / عمل / وظائف\n' +
      '• سرقة / جريمة / قمار / سلوت\n' +
      '• متجر / شراء / بيع / مخزون / استخدم\n' +
      '• شركة / قائمة / متصدرين\n' +
      '• مساعدة'
    );

  return message.reply({ embeds: [embed] });
}

module.exports = {
  balance,
  bank,
  daily,
  weekly,
  work,
  deposit,
  withdraw,
  transfer,
  transactions,
  shop,
  buy,
  inventory,
  useItem,
  rob,
  crime,
  gamble,
  slotMachine,
  leaderboard,
  company,
  help
};
