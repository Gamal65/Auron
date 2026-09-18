# Auron
Integrated Discord Bot System

A premium economy bot for Discord with:
- Neon PostgreSQL database integration
- Gameplay commands without prefix
- Slash-based admin commands
- Economy, bank, work, robbery, shop, inventory, companies, leaderboards
- Arabic-first interfaces with English fallbacks

## Setup
1. Create a Neon PostgreSQL database.
2. Copy `.env.example` to `.env` and fill in the values.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Push the Prisma schema:
   ```bash
   npx prisma db push
   ```
5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
6. Start the bot:
   ```bash
   npm start
   ```

## Example gameplay commands
- حساب
- رصيد
- بنك
- يومية
- عمل
- سرقة @user
- متجر
- شراء سيف
- مخزون
- شركة إنشاء اسم_الشركة
- تحويل @user 100
- إيداع 300
- سحب 200
- سجل
- قائمة
- جريمة
- قمار 50

## Example admin slash commands
- /اعطاء
- /سحب
- /تعيين
- /تجميد
- /اضافة_عنصر
- /حذف_عنصر
- /تحديث_متجر
- /تسجيلات
- /اعدادات

## Notes
- Gameplay commands are prefixless and are triggered directly by message content.
- Admin commands are Slash Commands only.
- Database operations use Neon PostgreSQL through Prisma.
- The robe system includes cooldowns and failure penalties.
