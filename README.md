# Auron V3 — Neon Economy

نسخة محسنة بواجهة ورسائل Emoji موحّدة، Canvas profile card، أوامر لعب عربية بدون بادئة، وأوامر إدارة Slash فقط.

## التشغيل
```bash
cp .env.example .env
npm install
npx prisma db push
npx prisma generate
npm start
```

## أوامر اللعب
`حساب` `رصيد` `بنك` `يومية` `عمل` `إيداع 100` `سحب 100` `تحويل @عضو 100` `متجر` `شراء سيف نيون` `مخزون` `سرقة @عضو` `جريمة` `قائمة` `شركة إنشاء اسم` `مساعدة`

## الإدارة (Slash فقط)
`/اعطاء` `سحب/` `تجميد/` `اضافة_عنصر/` `تسجيلات/`

## ملاحظات
- يجب تفعيل **Message Content Intent** من Discord Developer Portal لأن أوامر اللعب بلا بادئة تعتمد على محتوى الرسالة.
- يجب وضع `DISCORD_TOKEN` و`DATABASE_URL` في `.env`.
- Canvas يستخدم خط النظام لتجنب انهيار التشغيل عند غياب ملف خط محلي. يمكن إضافة خط عربي إلى `src/assets` لاحقًا.
