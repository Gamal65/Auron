const EMOJI = Object.freeze({
  coin: '🪙', wallet: '👛', bank: '🏦', level: '🏅', xp: '✨', daily: '🎁', work: '🧰',
  transfer: '💸', shop: '🛒', item: '🎒', rare: '💎', epic: '🔮', legendary: '👑',
  robbery: '🕵️', success: '✅', fail: '❌', jail: '🚓', shield: '🛡️', crime: '🧨',
  game: '🎰', company: '🏢', market: '📈', crown: '👑', star: '🌟', warning: '⚠️',
  help: '📚', settings: '⚙️', log: '📜', fire: '🔥', lock: '🔒', unlock: '🔓'
});

const COLORS = Object.freeze({ primary: 0x7c3aed, success: 0x22c55e, danger: 0xef4444, gold: 0xf59e0b, info: 0x0ea5e9, dark: 0x111827 });

const RARITY = Object.freeze({ common: { emoji: '⚪', color: 0x94a3b8 }, uncommon: { emoji: '🟢', color: 0x22c55e }, rare: { emoji: '🔵', color: 0x3b82f6 }, epic: { emoji: '🟣', color: 0xa855f7 }, legendary: { emoji: '🟡', color: 0xf59e0b } });

module.exports = { EMOJI, COLORS, RARITY };
