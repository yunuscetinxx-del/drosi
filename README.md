# دروسي (drosi)

تطبيق Next.js لإدارة الدروس والخرائط الذهنية، مع تسجيل دخول وحفظ البيانات في **PostgreSQL** عبر [Prisma](https://www.prisma.io/).

## المستودع

- HTTPS: `https://github.com/zernanapid2/drosi.git`
- SSH: `git@github.com:zernanapid2/drosi.git`

## التشغيل محلياً

```bash
git clone https://github.com/zernanapid2/drosi.git
cd drosi
cp .env.example .env.local
```

عدّل `.env.local`:

- `DATABASE_URL` — من [Supabase](https://supabase.com) أو أي Postgres (انظر `docs/DATABASE.md`).
- `AUTH_SECRET` — سلسلة عشوائية طويلة (16+ حرفاً).
- `OPENROUTER_API_KEY` — اختياري لتحليل الذكاء الاصطناعي.

```bash
npm install
npx prisma migrate deploy
npm run dev
```

## النشر

اربط المستودع بـ Vercel (أو غيره) وأضف نفس متغيرات البيئة. استخدم **Transaction pooler** من Supabase لـ `DATABASE_URL` عند النشر على Vercel.

تفاصيل إضافية: [`docs/DATABASE.md`](docs/DATABASE.md).

## رفع الكود إلى GitHub (`zernanapid2/drosi`)

1. من حساب **zernanapid2** أنشئ مستودعاً جديداً باسم **`drosi`** (يفضّل فارغاً بدون README لتجنّب تعارض الدمج الأول).
2. من مجلد المشروع:
   ```bash
   git remote add origin https://github.com/zernanapid2/drosi.git
   git branch -M main
   git push -u origin main
   ```
   أو بـ SSH إن كان المفتاح مضبوطاً لنفس الحساب:
   ```bash
   git remote set-url origin git@github.com:zernanapid2/drosi.git
   git push -u origin main
   ```
3. إذا ظهر **Repository not found** فإما المستودع غير مُنشأ بعد، أو أنت غير مسجّل الدخول بحساب صاحب المستودع — أنشئ المستودع على GitHub أو استخدم **Personal Access Token** لحساب `zernanapid2` مع HTTPS.
