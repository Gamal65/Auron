require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  botLanguage: process.env.BOT_LANGUAGE || 'ar',
  prefix: process.env.BOT_PREFIX || ''
};
