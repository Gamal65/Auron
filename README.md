# Auron V2
A premium economy and security Discord bot powered by Neon PostgreSQL with Arabic gameplay and slash admin tools.

## Features
- Arabic gameplay commands without prefix
- Slash-only admin commands
- Neon PostgreSQL with Prisma ORM
- Economy, bank, work, daily rewards, theft, crime, gambling, market, inventory, companies
- Canvas profile cards and modern embeds
- Admin logging, cooldowns and safety checks

## Install
1. Copy `.env.example` to `.env`
2. Fill `DATABASE_URL` and `DISCORD_TOKEN`
3. Run:
   ```bash
   npm install
   npx prisma db push
   npx prisma generate
   npm start
   ```

## Gameplay Commands
- حساب
- رصيد
- بنك
- يومية
- عمل
- إيداع 100
- سحب 100
- تحويل @user 100
- سجل
- متجر
- شراء سيف
- مخزون
- سرقة @user
- جريمة
- قمار 50
- قائمة
- شركة إنشاء اسم_الشركة

## Admin Commands
- /اعطاء
- /سحب
- /تعيين
- /تجميد
- /اضافة_عنصر
- /حذف_عنصر
- /تحديث_السوق
- /تسجيلات
- /اعدادات

## Notes
- Gameplay messages are Arabic and require no prefix.
- Admin actions are slash-only.
- Canvas profile support is included via the `canvas` package.
