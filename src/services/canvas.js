const { createCanvas, loadImage } = require('canvas');
const { COLORS } = require('../ui/theme');

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function text(ctx, value, x, y, size, color = '#fff', weight = 'normal') { ctx.font = `${weight} ${size}px Sans`; ctx.fillStyle = color; ctx.fillText(String(value), x, y); }

async function buildProfileCard({ username, wallet, bank, level, xp, avatarUrl, rank = 1 }) {
  const canvas = createCanvas(1200, 675); const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 1200, 675); bg.addColorStop(0, '#111827'); bg.addColorStop(0.55, '#312e81'); bg.addColorStop(1, '#7c2d12'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = 'rgba(15,23,42,.78)'; roundRect(ctx, 36, 36, 1128, 603, 28);
  text(ctx, 'AURON', 80, 105, 28, '#a78bfa', 'bold'); text(ctx, 'ملف اللاعب', 80, 155, 48, '#fff', 'bold');
  text(ctx, `@${username}`, 80, 202, 27, '#cbd5e1'); text(ctx, `🏆 الترتيب العالمي #${rank}`, 80, 255, 25, '#fbbf24', 'bold');
  const cards = [['👛 المحفظة', wallet], ['🏦 البنك', bank], ['🏅 المستوى', level], ['✨ الخبرة', xp]];
  cards.forEach(([label, value], i) => { const x = 80 + (i % 2) * 265; const y = 310 + Math.floor(i / 2) * 115; ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, x, y, 235, 84, 18); text(ctx, label, x + 18, y + 31, 19, '#c4b5fd'); text(ctx, Number(value).toLocaleString('en-US'), x + 18, y + 65, 25, '#fff', 'bold'); });
  ctx.fillStyle = 'rgba(14,165,233,.18)'; roundRect(ctx, 790, 135, 300, 360, 24);
  try { if (avatarUrl) { const avatar = await loadImage(avatarUrl); ctx.save(); ctx.beginPath(); ctx.arc(940, 270, 112, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(avatar, 828, 158, 224, 224); ctx.restore(); } } catch (_) { ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(940, 270, 112, 0, Math.PI * 2); ctx.fill(); }
  text(ctx, '🌟 AURON MEMBER', 842, 420, 22, '#f8fafc', 'bold'); text(ctx, 'اقتصاد • مغامرة • إنجاز', 835, 462, 18, '#bae6fd');
  return canvas.toBuffer('image/png');
}

module.exports = { buildProfileCard };
