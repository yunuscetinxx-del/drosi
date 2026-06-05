# نشر تحديث تطبيق دروسي

## كيف يعمل؟

1. التطبيق يقرأ `https://drosi.up.railway.app/mobile-update.json`
2. يقارن `buildNumber` مع الإصدار المثبّت
3. إن وُجد إصدار أحدث → إشعار داخل التطبيق مع **رقم الإصدار** و**سجل التغييرات**
4. المستخدم يضغط **تثبيت التحديث** → تنزيل APK وتثبيته (أندرويد)

## عند كل تحديث من هنا

```powershell
# من جذر المشروع e:\procat\dars
.\scripts\publish-mobile-update.ps1 `
  -Version "1.2.0" `
  -Build 3 `
  -Changelog "• ميزة جديدة`n• إصلاح خطأ" `
  -ApkUrl "https://github.com/yezensyria/drosi/releases/download/mobile-v1.2.0/durusi.apk"

cd mobile
flutter build apk --release
# ارفع app-release.apk إلى GitHub Releases بنفس الوسم

git add public/mobile-update.json mobile/pubspec.yaml
git commit -m "release: mobile v1.2.0 (build 3)"
git push
```

بعد `git push` يحدّث Railway ملف `mobile-update.json` تلقائياً، ويظهر التحديث للمستخدمين عند فتح التطبيق.

## حقول mobile-update.json

| الحقل | الوصف |
|--------|--------|
| `version` | رقم الإصدار المعروض (مثل 1.2.0) |
| `buildNumber` | رقم البناء — يجب أن يكون أكبر من المثبّت |
| `apkUrl` | رابط مباشر لملف APK |
| `changelog` | ما الجديد (يظهر في الإشعار) |
| `releasedAt` | تاريخ الإصدار |
| `mandatory` | `true` = لا يمكن تأجيل التحديث |

## ملاحظات

- **buildNumber** في `pubspec.yaml` بعد `+` يجب أن يطابق `buildNumber` في JSON
- بدون `apkUrl` لن يظهر التحديث للمستخدمين
- iOS: التحديث التلقائي غير مدعوم (متجر التطبيقات فقط)
