# دروسي (drosi2)

تطبيق Next.js لإدارة الدروس والخرائط الذهنية، مع تسجيل دخول وحفظ البيانات في **PostgreSQL** عبر [Prisma](https://www.prisma.io/).

## المستودع

- HTTPS: `https://github.com/yezensyria/drosi2.git`
- SSH: `git@github.com:yezensyria/drosi2.git`

## التشغيل محلياً

```bash
git clone https://github.com/yezensyria/drosi2.git
cd drosi2
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

## رفع الكود إلى GitHub (`yezensyria/drosi2`)

الموقع الرسمي للمستودع: **`https://github.com/yezensyria/drosi2`**.

1. من مجلد المشروع:
   ```bash
   git remote add origin https://github.com/yezensyria/drosi2.git
   git branch -M main
   git push -u origin main
   ```
2. أو بـ SSH:
   ```bash
   git remote set-url origin git@github.com:yezensyria/drosi2.git
   git push -u origin main
   ```
3. إذا ظهر **403** فتحقق من تسجيل الدخول (`gh auth login`) أو من بيانات اعتماد Git لـ GitHub.
