# دروسي (drosi2)

تطبيق Next.js لإدارة الدروس والخرائط الذهنية، مع تسجيل دخول وحفظ البيانات في **PostgreSQL** عبر [Prisma](https://www.prisma.io/).

## المستودع

- HTTPS: `https://github.com/zernanapid2/drosi2.git`
- SSH: `git@github.com:zernanapid2/drosi2.git`

## التشغيل محلياً

```bash
git clone https://github.com/zernanapid2/drosi2.git
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

## رفع الكود إلى GitHub (`zernanapid2/drosi2`)

1. أنشئ المستودع **`drosi2`** تحت حساب **zernanapid2** (يفضّل بدون README أولياً).
2. من مجلد المشروع:
   ```bash
   git remote add origin https://github.com/zernanapid2/drosi2.git
   git branch -M main
   git push -u origin main
   ```
   أو بـ SSH:
   ```bash
   git remote set-url origin git@github.com:zernanapid2/drosi2.git
   git push -u origin main
   ```
3. إذا ظهر **403** أو **Permission denied** فأنت تدفع بحساب آخر (مثلاً بيانات **Windows Credential Manager** لـ GitHub). إمّا تسجّل الدخول بحساب **zernanapid2**، أو تستخدم **Personal Access Token** من `zernanapid2` ككلمة مرور مع HTTPS، أو تضيف حسابك الحالي كـ **Collaborator** على المستودع الخاص.
