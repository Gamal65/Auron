const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

registerFont(path.join(__dirname, '../assets', 'Cairo-Regular.ttf'), { family: 'Cairo' });

function buildProfileCard({ username, wallet, bank, level, xp, avatarUrl, rank }) {
  const canvas = createCanvas(1000, 600);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0ea5e9');
  gradient.addColorStop(0.5, '#7c3aed');
  gradient.addColorStop(1, '#f97316');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(15,23,42,0.58)';
  ctx.fillRect(40, 40, 920, 520);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px Cairo';
  ctx.fillText('Auron Profile', 70, 100);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '32px Cairo';
  ctx.fillText(`@${username}`, 70, 150);

  ctx.fillStyle = '#facc15';
  ctx.font = '26px Cairo';
  ctx.fillText(`الرتبة: #${rank || 1}`, 70, 210);

  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Cairo';
  ctx.fillText(`المحفظة: ${wallet} 💰`, 70, 280);
  ctx.fillText(`البنك: ${bank} 🏦`, 70, 330);
  ctx.fillText(`المستوى: ${level} ⚙️`, 70, 380);
  ctx.fillText(`الخبرة: ${xp} ✨`, 70, 430);

  const panelX = 650;
  const panelY = 120;
  const panelW = 230;
  const panelH = 260;

  ctx.fillStyle = 'rgba(15, 118, 110, 0.6)';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  const avatarRadius = 80;
  const avatarX = panelX + panelW / 2;
  const avatarY = panelY + 90;

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatarUrl) {
    const image = new global.Image();
    image.src = avatarUrl;
    ctx.drawImage(image, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  } else {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f8fafc';
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px Cairo';
  ctx.fillText('VIP', panelX + 86, panelY + 220);

  return canvas.toBuffer('image/png');
}

function buildShopCard({ name, price, type, description }) {
  const canvas = createCanvas(700, 260);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(1, '#ef4444');
  ctx.fillStyle = grad;
  ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px Cairo';
  ctx.fillText(name, 45, 90);
  ctx.font = '28px Cairo';
  ctx.fillText(`السعر: ${price} 💰`, 45, 150);
  ctx.fillText(`النوع: ${type}`, 45, 195);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '22px Cairo';
  ctx.fillText(description, 45, 230);

  return canvas.toBuffer('image/png');
}

module.exports = {
  buildProfileCard,
  buildShopCard
};
