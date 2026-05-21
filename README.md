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
