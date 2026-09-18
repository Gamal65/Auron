# Auron V4

Auron V4 هو بوت ديسكورد عربي للاقتصاد واللعب واللوجيك المتقدمة، مع أوامر إدارة إنجليزية فقط.

## المميزات
- أوامر لعب عربية بدون بادئة
- أوامر إدارة Slash باللغة الإنجليزية
- وصف كل أمر Slash بالعربي
- نظام اقتصاد كامل: رصيد، بنك، يومية، أسبوعية، عمل، تحويل
- متجر + مخزون + عناصر نادرة
- سرقة + جريمة + قمار + سلوت
- شركات + قوائم متصدرين
- Canvas profile cards
- قاعدة بيانات Neon PostgreSQL مع Prisma
- سجل إداري
- ألوان وإيموجيات احترافية

## التشغيل
```bash
npm install
npx prisma db push
npx prisma generate
npm start
```

## أوامر المستخدم
- حساب
- رصيد
- بنك
- يومية
- أسبوعية
- عمل
- إيداع 250
- سحب 250
- تحويل @عضو 250
- سجل
- متجر
- شراء سيف نيون
- مخزون
- استخدم سيف نيون
- سرقة @عضو
- جريمة
- قمار 100
- سلوت 100
- قائمة
- شركة إنشاء اسم_الشركة
- مساعدة

## أوامر الإدارة
- /give
- /remove
- /setbalance
- /jail
- /unjail
- /additem
- /removeitem
- /updateitem
- /logs
- /settings

## ملاحظات
- تأكد من تفعيل Message Content Intent في Discord Developer Portal.
- تأكد من وضع DATABASE_URL و DISCORD_TOKEN في ملف .env.
- إذا كنت تريد نسخة أكثر احترافية، أستطيع أن أضيف لها:
  - blackjack
  - roulette
  - missions
  - achievements
  - prestige
  - vip system
  - company upgrades
  - auction house
  - daily streak
  - seasonal shop
