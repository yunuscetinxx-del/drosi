import '../models/lesson.dart';
import 'lesson_store.dart';
import 'lessons_service.dart';

class SyncResult {
  SyncResult({required this.lessons, required this.pushed});
  final List<Lesson> lessons;

  /// هل تم رفع تغييرات محلية إلى الخادم؟
  final bool pushed;
}

/// تنفيذ المزامنة بين النسخة المحلية والخادم.
///
/// السياسة: على مستوى كل درس، الدروس المعدّلة محلياً (dirty) تفوز،
/// وغيرها يُحسم بـ "آخر تعديل يفوز" (updatedAt). المحذوف محلياً يُحذف.
class SyncService {
  SyncService({required this.store});

  final LessonStore store;
  final _lessons = LessonsService();

  Future<SyncResult> sync() async {
    final localLessons = await store.readLessons();
    final dirtyIds = await store.readDirty();
    final deletedIds = await store.readDeleted();

    // 1) اجلب النسخة الحالية من الخادم.
    final serverLessons = await _lessons.fetchLessons();

    // 2) ادمج.
    final merged = _merge(
      server: serverLessons,
      local: localLessons,
      dirtyIds: dirtyIds,
      deletedIds: deletedIds,
    );

    // 3) هل نحتاج للرفع؟ (وجود تعديلات أو حذف معلّق)
    final hasPending = dirtyIds.isNotEmpty || deletedIds.isNotEmpty;
    if (hasPending) {
      await _lessons.saveLessons(merged);
    }

    // 4) خزّن النتيجة محلياً وامسح العلامات المعلّقة.
    await store.writeLessons(merged);
    await store.clearPending();

    return SyncResult(lessons: merged, pushed: hasPending);
  }

  List<Lesson> _merge({
    required List<Lesson> server,
    required List<Lesson> local,
    required Set<String> dirtyIds,
    required Set<String> deletedIds,
  }) {
    final byId = <String, Lesson>{};

    // ابدأ بدروس الخادم.
    for (final l in server) {
      byId[l.id] = l;
    }

    // طبّق النسخة المحلية.
    for (final l in local) {
      final existing = byId[l.id];
      if (existing == null) {
        // درس جديد محلياً (أُنشئ بدون اتصال) — أبقه.
        byId[l.id] = l;
      } else if (dirtyIds.contains(l.id)) {
        // تعديل محلي معلّق يفوز.
        byId[l.id] = l;
      } else {
        // لا تعديل معلّق: آخر تحديث يفوز (يلتقط تعديلات الموقع).
        byId[l.id] =
            l.updatedAt.isAfter(existing.updatedAt) ? l : existing;
      }
    }

    // احذف ما حُذف محلياً.
    for (final id in deletedIds) {
      byId.remove(id);
    }

    final result = byId.values.toList();
    result.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return result;
  }
}
