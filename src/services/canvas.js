const { createCanvas, loadImage } = require('canvas');

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function text(ctx, value, x, y, size, color = '#fff', bold = false) {
  ctx.font = `${bold ? '700' : '400'} ${size}px Arial`;
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y);
}

async function buildProfileCard({ username, wallet, bank, level, xp, reputation, avatarUrl, rank = 1 }) {
  const canvas = createCanvas(1200, 700);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1200, 700);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.45, '#312e81');
  bg.addColorStop(1, '#7c2d12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 700);

  ctx.fillStyle = 'rgba(17,24,39,0.8)';
  roundedRect(ctx, 40, 40, 1120, 620, 28);

  text(ctx, 'AURON', 90, 90, 26, '#c4b5fd', true);
  text(ctx, 'ملف اللاعب', 90, 145, 46, '#fff', true);
  text(ctx, `@${username}`, 90, 200, 24, '#cbd5e1');
  text(ctx, `🏆 الترتيب: #${rank}`, 90, 260, 24, '#facc15', true);
  text(ctx, `⭐ السمعة: ${reputation}`, 90, 300, 24, '#f8fafc');

  const stats = [
    ['👛 المحفظة', wallet],
    ['🏦 البنك', bank],
    ['🏅 المستوى', level],
    ['✨ الخبرة', xp]
  ];

  stats.forEach(([label, value], index) => {
    const x = 90 + (index % 2) * 285;
    const y = 310 + Math.floor(index / 2) * 110;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundedRect(ctx, x, y, 240, 80, 18);

    text(ctx, label, x + 18, y + 26, 18, '#d8b4fe');
    text(ctx, String(value), x + 18, y + 58, 24, '#fff', true);
  });

  ctx.fillStyle = 'rgba(14,165,233,0.15)';
  roundedRect(ctx, 780, 120, 300, 360, 24);

  if (avatarUrl) {
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(940, 250, 110, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, 830, 140, 220, 220);
      ctx.restore();
    } catch (error) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(940, 250, 110, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(940, 250, 110, 0, Math.PI * 2);
    ctx.fill();
  }

  text(ctx, '🌟 AURON MEMBER', 835, 420, 22, '#f8fafc', true);
  text(ctx, 'اقتصاد • مغامرة • إنجازات', 820, 462, 18, '#bae6fd');

  return canvas.toBuffer('image/png');
}

module.exports = { buildProfileCard };
