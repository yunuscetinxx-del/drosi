# قاعدة البيانات على الإنترنت

التطبيق يستخدم **PostgreSQL** عبر [Prisma](https://www.prisma.io/). يمكنك استضافة قاعدة مجانية أو مدفوعة من أي مزوّد يدعم Postgres.

## ماذا أنصح؟

| الخيار | لماذا |
|--------|--------|
| **[Neon](https://neon.tech)** | مجاني بسخة سيرفرلس، يعمل بسلاسة مع Vercel وNext.js، رابط `DATABASE_URL` جاهز من لوحة التحكم. |
| **[Supabase](https://supabase.com)** | Postgres + لوحة وملفات وAuth جاهزين؛ إن أردت لاحقاً استبدال تسجيل الدخول الحالي بـ Supabase Auth. |
| Railway / Render / Aiven | بدائل جيدة إن كان لديك حساب هناك. |

أي **PostgreSQL 14+** يعمل طالما أن سلسلة الاتصال متوفرة في `DATABASE_URL`.

## ربط Supabase (مشروع GitHub `drosi2`)

1. في [Supabase Dashboard](https://supabase.com/dashboard) أنشئ مشروعاً جديداً (أو استخدم مشروعاً قائماً).
2. من القائمة: **Project Settings → Database**.
3. انسخ **Connection string**:
   - لبيئة **Next.js على Vercel** أو دوال سيرفرلس: يُفضّل **Transaction pooler** (المنفذ **6543**) مع وضع **URI**، وأضِف إن لزم: `?pgbouncer=true` كما يظهر في لوحة Supabase.
   - للتطوير المحلي (`npm run dev`): يمكنك استخدام **Direct connection** (المنفذ **5432**) إن كان جدار الحماية يسمح بذلك.
4. الصق الرابط في `DATABASE_URL` داخل `.env.local` (محلياً) أو في متغيرات بيئة الاستضافة (مثلاً Vercel → Project → Settings → Environment Variables).
5. طبّق الجداول على قاعدة Supabase (مرة واحدة):
   ```bash
   npx prisma migrate deploy
   ```
   أو: `npx prisma db push` للتجارب السريعة.
6. عيّن أيضاً `AUTH_SECRET` (16 حرفاً على الأقل) في نفس ملف البيئة.

بعدها ادفع الكود إلى GitHub ثم اربط الاستضافة بالمستودع واضبط المتغيرات هناك كما في `.env.example`.

## الإعداد السريع

1. انسخ البيئة:
   ```bash
   cp .env.example .env.local
   ```
2. ضع في `.env.local` (أو `.env`):
   - `DATABASE_URL` من لوحة Neon أو Supabase (قسم *Connection string* / *URI*).
   - `AUTH_SECRET` (سلسلة عشوائية 16 حرفاً على الأقل).
3. أنشئ الجداول على السحابة (مرة واحدة لكل بيئة):
   ```bash
   npx prisma db push
   ```
   أو للمشاريع التي تعتمد migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
4. شغّل التطبيق:
   ```bash
   npm run dev
   ```

`npm install` يشغّل `prisma generate` تلقائياً لإنشاء عميل Prisma داخل `node_modules`.

### Migrations جاهزة في المستودع

إن أردت تطبيق الجداول دون `db push` (مفيد في الإنتاج):

```bash
npx prisma migrate deploy
```

## نموذج البيانات

جدول واحد `User`: البريد، كلمة المرور المشفّرة، وحقل `lessons` من نوع **JSON** (نفس شكل المصفوفة في الواجهة). يمكن لاحقاً تقسيم الدروس إلى جداول منفصلة إذا احتجت استعلامات أعقد.
