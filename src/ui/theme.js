const EMOJI = Object.freeze({
  coin: '🪙',
  wallet: '👛',
  bank: '🏦',
  xp: '✨',
  level: '🏅',
  daily: '🎁',
  work: '🧰',
  shop: '🛒',
  item: '🎒',
  transfer: '💸',
  success: '✅',
  fail: '❌',
  shield: '🛡️',
  jail: '🚓',
  robbery: '🕵️',
  crime: '🧨',
  company: '🏢',
  leaderboard: '🏆',
  help: '📚',
  settings: '⚙️',
  warning: '⚠️',
  fire: '🔥',
  star: '🌟',
  crown: '👑',
  game: '🎰',
  gamble: '🎲',
  slot: '🎰',
  money: '💰'
});

const COLORS = Object.freeze({
  primary: 0x7c3aed,
  success: 0x22c55e,
  danger: 0xef4444,
  gold: 0xf59e0b,
  info: 0x0ea5e9,
  dark: 0x111827,
  rose: 0xec4899
});

const RARITY = Object.freeze({
  common: { emoji: '⚪', color: 0x94a3b8 },
  uncommon: { emoji: '🟢', color: 0x22c55e },
  rare: { emoji: '🔵', color: 0x3b82f6 },
  epic: { emoji: '🟣', color: 0xa855f7 },
  legendary: { emoji: '🟡', color: 0xf59e0b }
});

module.exports = { EMOJI, COLORS, RARITY };
